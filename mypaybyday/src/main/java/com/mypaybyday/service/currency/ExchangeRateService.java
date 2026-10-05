package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.ExchangeRateDto;
import com.mypaybyday.dto.ProviderQuoteDto;
import com.mypaybyday.dto.RecordExchangeRateDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.entity.ExchangeRateEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.enums.ExchangeRateSource;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.repository.ExchangeRateRepository;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.CurrencyValidator;
import io.quarkus.logging.Log;

/**
 * Records quotes, by hand or from the configured {@link ExchangeRateProvider}.
 *
 * <p>A quote is only ever appended: the history stays intact and the newest quote per currency is
 * the current one. Recording a quote never re-prices a transaction that already holds a rate.
 */
@ApplicationScoped
public class ExchangeRateService implements DataSectionTransfer<ExchangeRateDto> {

	private final ExchangeRateRepository exchangeRateRepository;
	private final CurrencyRepository currencyRepository;
	private final CurrencyService currencyService;
	private final ExchangeRateLookup exchangeRateLookup;
	private final ExchangeRateProvider exchangeRateProvider;
	private final ConversionBackfillQueue conversionBackfillQueue;
	private final CurrencyValidator currencyValidator;
	private final ArchivedItemImporter archivedItemImporter;
	private final Messages messages;

	public ExchangeRateService(
			ExchangeRateRepository exchangeRateRepository,
			CurrencyRepository currencyRepository,
			CurrencyService currencyService,
			ExchangeRateLookup exchangeRateLookup,
			ExchangeRateProvider exchangeRateProvider,
			ConversionBackfillQueue conversionBackfillQueue,
			CurrencyValidator currencyValidator,
			ArchivedItemImporter archivedItemImporter,
			Messages messages) {
		this.exchangeRateRepository = exchangeRateRepository;
		this.currencyRepository = currencyRepository;
		this.currencyService = currencyService;
		this.exchangeRateLookup = exchangeRateLookup;
		this.exchangeRateProvider = exchangeRateProvider;
		this.conversionBackfillQueue = conversionBackfillQueue;
		this.currencyValidator = currencyValidator;
		this.archivedItemImporter = archivedItemImporter;
		this.messages = messages;
	}

	/**
	 * @param currency limits the history to one currency; {@code null} returns every quote
	 * @return quotes newest first
	 */
	@Transactional
	public List<ExchangeRateDto> listHistory(String currency) throws BusinessException {
		String normalizedCurrency = currencyValidator.validateOptional(currency);
		return exchangeRateRepository.listHistory(normalizedCurrency).stream().map(ExchangeRateDto::from).toList();
	}

	/**
	 * @throws BusinessException if the code is unknown or is the base currency, or the rate is not
	 *                           a positive number
	 */
	@Transactional
	public ExchangeRateDto recordManualRate(RecordExchangeRateDto quote) throws BusinessException {
		ExchangeRateEntity recorded = record(quote.currency(), quote.unitsPerBase(), ExchangeRateSource.MANUAL);
		conversionBackfillQueue.enqueueAllPrincipal();
		return ExchangeRateDto.from(recorded);
	}

	/**
	 * Asks the configured provider for a quote of every configured currency and records whatever it
	 * returns. Runs when the user asks for it, or from the daily refresh the user scheduled.
	 *
	 * @throws BusinessException if no provider is configured or it fails
	 */
	@Transactional
	public List<ExchangeRateDto> refreshFromProvider() throws BusinessException {
		Map<String, BigDecimal> fetchedQuotes = fetchProviderQuotes(exchangeRateLookup.baseCurrency());
		List<ExchangeRateDto> recorded = fetchedQuotes.entrySet().stream()
				.map(quote -> record(quote.getKey(), quote.getValue(), ExchangeRateSource.API))
				.map(ExchangeRateDto::from)
				.toList();

		conversionBackfillQueue.enqueueAllPrincipal();
		Log.infof("Recorded %d quotes from the exchange rate provider", recorded.size());
		return recorded;
	}

	/**
	 * Asks the configured provider for its current quote of every configured currency without
	 * recording anything, so the user can see it before deciding to adopt it.
	 *
	 * @throws BusinessException if no provider is configured or it fails
	 */
	@Transactional
	public List<ProviderQuoteDto> previewProviderQuotes() throws BusinessException {
		String baseCurrency = exchangeRateLookup.baseCurrency();
		return fetchProviderQuotes(baseCurrency).entrySet().stream()
				.map(quote -> new ProviderQuoteDto(exchangeRateProvider.name(), quote.getKey(), baseCurrency, quote.getValue()))
				.toList();
	}

	private Map<String, BigDecimal> fetchProviderQuotes(String baseCurrency) throws BusinessException {
		Set<String> quotedCurrencies = new LinkedHashSet<>();
		currencyRepository.listOrderedByCode().stream()
				.map(currency -> currency.code)
				.filter(code -> !code.equals(baseCurrency))
				.forEach(quotedCurrencies::add);
		return exchangeRateProvider.fetchUnitsPerBase(baseCurrency, quotedCurrencies);
	}

	private ExchangeRateEntity record(String currency, BigDecimal unitsPerBase, ExchangeRateSource source)
			throws BusinessException {
		String normalizedCurrency = currencyValidator.validateRequired(currency);
		String baseCurrency = exchangeRateLookup.baseCurrency();
		if (normalizedCurrency.equals(baseCurrency)) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_BASE_NOT_QUOTABLE, baseCurrency);
		}
		boolean isPositive = unitsPerBase != null && unitsPerBase.signum() > 0;
		if (!isPositive) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_INVALID);
		}

		currencyService.findOrCreate(normalizedCurrency);
		ExchangeRateEntity rate = new ExchangeRateEntity();
		rate.currency = normalizedCurrency;
		rate.baseCurrency = baseCurrency;
		rate.unitsPerBase = unitsPerBase;
		rate.source = source;
		exchangeRateRepository.persist(rate);
		Log.infof("Recorded %s quote: 1 %s = %s %s", source, baseCurrency, unitsPerBase.toPlainString(), normalizedCurrency);
		return rate;
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.EXCHANGE_RATES;
	}

	@Override
	@Transactional
	public long countForExport() {
		return exchangeRateRepository.count();
	}

	/**
	 * Oldest first, so that importing appends them in the order they were recorded and the newest
	 * archived quote ends up as the current one.
	 */
	@Override
	@Transactional
	public List<ExchangeRateDto> exportData() {
		return exchangeRateRepository.listAll().stream()
				.sorted((left, right) -> Long.compare(left.id, right.id))
				.map(ExchangeRateDto::from)
				.toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<ExchangeRateDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, ExchangeRateDto::currency, item -> {
			ExchangeRateEntity rate = new ExchangeRateEntity();
			rate.currency = currencyValidator.validateRequired(item.currency());
			rate.baseCurrency = currencyValidator.validateRequired(item.baseCurrency());
			rate.unitsPerBase = item.unitsPerBase();
			rate.source = item.source() != null ? item.source() : ExchangeRateSource.MANUAL;
			boolean isPositive = rate.unitsPerBase != null && rate.unitsPerBase.signum() > 0;
			if (!isPositive) {
				throw messages.reject(MsgKey.EXCHANGE_RATE_INVALID);
			}
			currencyService.findOrCreate(rate.currency);
			exchangeRateRepository.persist(rate);
		});
	}
}
