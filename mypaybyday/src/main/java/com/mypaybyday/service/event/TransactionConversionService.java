package com.mypaybyday.service.event;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.ConversionBackfillBatchDto;
import com.mypaybyday.dto.ConversionRecalculationBatchDto;
import com.mypaybyday.dto.ConversionRecalculationDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.TransactionConversionDto;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TransactionConversionEntity;
import com.mypaybyday.enums.ConversionOrigin;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.repository.TransactionRepository;
import com.mypaybyday.service.currency.ExchangeRateLookup;
import com.mypaybyday.service.currency.ExchangeRateQuotes;
import io.quarkus.logging.Log;

/**
 * Freezes exchange rates on transactions.
 *
 * <p>A transaction carries one rate per principal currency other than its own. The rate is taken
 * from the current quotes at the moment it is frozen and recording a new quote never changes it, so
 * a new quote only affects transactions recorded from then on. The only way to re-price a past
 * transaction is an explicit conversion recalculation requested by the user.
 */
@ApplicationScoped
public class TransactionConversionService {

	static final int BACKFILL_BATCH_SIZE = 200;

	private final CurrencyRepository currencyRepository;
	private final TransactionRepository transactionRepository;
	private final ExchangeRateLookup exchangeRateLookup;
	private final Messages messages;

	public TransactionConversionService(
			CurrencyRepository currencyRepository,
			TransactionRepository transactionRepository,
			ExchangeRateLookup exchangeRateLookup,
			Messages messages) {
		this.currencyRepository = currencyRepository;
		this.transactionRepository = transactionRepository;
		this.exchangeRateLookup = exchangeRateLookup;
		this.messages = messages;
	}

	/**
	 * Makes sure the transaction holds a rate to every principal currency.
	 *
	 * <p>Rates it already holds are kept, so editing an amount or a date never re-prices it. When
	 * its currency changed, every held rate is discarded first, since they convert from a currency
	 * the transaction is no longer in.
	 *
	 * @param currencyChanged whether the transaction's own currency differs from the one its held
	 *                        rates were frozen for
	 * @throws BusinessException if a principal currency, or the transaction's own, has no quote
	 */
	void freezeMissingRates(FinanceTransactionEntity transaction, boolean currencyChanged) throws BusinessException {
		String ownCurrency = currencyOf(transaction);
		if (ownCurrency == null) return;

		if (currencyChanged) {
			transaction.conversions.clear();
		}

		List<String> missingTargets = missingTargets(transaction, ownCurrency, currencyRepository.listPrincipalCodes());
		if (missingTargets.isEmpty()) return;

		ExchangeRateQuotes quotes = exchangeRateLookup.currentQuotes();
		for (String targetCurrency : missingTargets) {
			BigDecimal rate = quotes.rate(ownCurrency, targetCurrency)
					.orElseThrow(() -> messages.reject(MsgKey.EXCHANGE_RATE_MISSING,
							quotes.firstUnquoted(ownCurrency, targetCurrency).orElse(targetCurrency)));
			addConversion(transaction, targetCurrency, rate, ConversionOrigin.AT_ENTRY);
		}
	}

	/**
	 * Copies conversions carried by an imported event onto its newly created transaction as they
	 * were, instead of re-pricing it with today's quotes.
	 */
	void restoreConversions(FinanceTransactionEntity transaction, FinanceEventDto importedEvent) {
		if (importedEvent.conversions() == null) return;
		for (TransactionConversionDto conversion : importedEvent.conversions()) {
			boolean isUsable = conversion.currency() != null && conversion.rate() != null
					&& conversion.rate().signum() > 0 && !conversion.currency().equals(importedEvent.currency());
			if (!isUsable) continue;
			ConversionOrigin origin = conversion.origin() != null ? conversion.origin() : ConversionOrigin.RETROACTIVE;
			addConversion(transaction, conversion.currency(), conversion.rate(), origin);
		}
	}

	/**
	 * Converts, at the current quotes, one batch of transactions that predate {@code targetCurrency}
	 * becoming principal. Called outside any transaction, each batch commits on its own, so a long
	 * backfill makes progress without holding SQLite's single connection for its whole duration.
	 *
	 * @param afterTransactionId resume point: only transactions with a greater id are considered
	 * @return what the batch did, including where the next batch should resume
	 */
	@Transactional
	public ConversionBackfillBatchDto backfillBatch(String targetCurrency, long afterTransactionId) {
		List<FinanceTransactionEntity> batch = transactionRepository.findMissingConversion(
				targetCurrency, afterTransactionId, BACKFILL_BATCH_SIZE);
		if (batch.isEmpty()) {
			return ConversionBackfillBatchDto.finished(afterTransactionId);
		}

		ExchangeRateQuotes quotes = exchangeRateLookup.currentQuotes();
		int convertedCount = 0;
		Set<String> unquotedCurrencies = new LinkedHashSet<>();

		for (FinanceTransactionEntity transaction : batch) {
			String ownCurrency = currencyOf(transaction);
			Optional<BigDecimal> rate = ownCurrency == null ? Optional.empty() : quotes.rate(ownCurrency, targetCurrency);
			if (rate.isEmpty()) {
				quotes.firstUnquoted(ownCurrency, targetCurrency).ifPresent(unquotedCurrencies::add);
				continue;
			}
			addConversion(transaction, targetCurrency, rate.get(), ConversionOrigin.RETROACTIVE);
			convertedCount++;
		}

		long lastTransactionId = batch.get(batch.size() - 1).id;
		boolean hasMore = batch.size() == BACKFILL_BATCH_SIZE;
		Log.debugf("Backfilled %d of %d transactions into %s (last id=%d)",
				convertedCount, batch.size(), targetCurrency, lastTransactionId);
		return new ConversionBackfillBatchDto(convertedCount, batch.size() - convertedCount,
				List.copyOf(unquotedCurrencies), lastTransactionId, hasMore);
	}

	/**
	 * Gives one batch of the transactions a recalculation covers its rate, replacing the conversion
	 * frozen on them or adding it where they had none yet. Like {@link #backfillBatch}, each batch
	 * commits on its own.
	 *
	 * @param afterTransactionId resume point: only transactions with a greater id are considered
	 * @return what the batch did, including where the next batch should resume
	 */
	@Transactional
	public ConversionRecalculationBatchDto recalculateBatch(ConversionRecalculationDto recalculation,
			long afterTransactionId) {
		List<FinanceTransactionEntity> batch = transactionRepository.findRecordedIn(
				recalculation.sourceCurrency(), recalculation.startDate(), recalculation.endDate(),
				afterTransactionId, BACKFILL_BATCH_SIZE);
		if (batch.isEmpty()) {
			return ConversionRecalculationBatchDto.finished(afterTransactionId);
		}

		for (FinanceTransactionEntity transaction : batch) {
			replaceConversion(transaction, recalculation.targetCurrency(), recalculation.rate());
		}

		long lastTransactionId = batch.get(batch.size() - 1).id;
		boolean hasMore = batch.size() == BACKFILL_BATCH_SIZE;
		Log.debugf("Recalculated %d transactions from %s into %s (last id=%d)",
				batch.size(), recalculation.sourceCurrency(), recalculation.targetCurrency(), lastTransactionId);
		return new ConversionRecalculationBatchDto(batch.size(), lastTransactionId, hasMore);
	}

	/**
	 * Updates the held conversion in place rather than swapping it for a new row: the new row would
	 * be inserted before the old one is deleted and collide with it on (transaction, currency).
	 */
	private void replaceConversion(FinanceTransactionEntity transaction, String targetCurrency, BigDecimal rate) {
		Optional<TransactionConversionEntity> held = transaction.conversions.stream()
				.filter(conversion -> conversion.currency.equals(targetCurrency))
				.findFirst();
		if (held.isEmpty()) {
			addConversion(transaction, targetCurrency, rate, ConversionOrigin.RECALCULATED);
			return;
		}
		held.get().rate = rate;
		held.get().origin = ConversionOrigin.RECALCULATED;
	}

	private List<String> missingTargets(FinanceTransactionEntity transaction, String ownCurrency,
			List<String> principalCurrencies) {
		Set<String> heldCurrencies = new LinkedHashSet<>();
		transaction.conversions.forEach(conversion -> heldCurrencies.add(conversion.currency));
		return principalCurrencies.stream()
				.filter(principal -> !principal.equals(ownCurrency))
				.filter(principal -> !heldCurrencies.contains(principal))
				.toList();
	}

	private void addConversion(FinanceTransactionEntity transaction, String targetCurrency, BigDecimal rate,
			ConversionOrigin origin) {
		TransactionConversionEntity conversion = new TransactionConversionEntity();
		conversion.transaction = transaction;
		conversion.currency = targetCurrency;
		conversion.rate = rate;
		conversion.origin = origin;
		transaction.conversions.add(conversion);
	}

	static String currencyOf(FinanceTransactionEntity transaction) {
		if (transaction.lineItems == null) return null;
		return transaction.lineItems.stream()
				.map((FinanceLineItemEntity lineItem) -> lineItem.currency)
				.filter(Objects::nonNull)
				.findFirst()
				.orElse(null);
	}
}
