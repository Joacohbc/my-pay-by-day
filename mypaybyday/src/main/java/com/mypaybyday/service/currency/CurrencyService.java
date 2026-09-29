package com.mypaybyday.service.currency;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CurrencyDto;
import com.mypaybyday.dto.CurrencyExportDto;
import com.mypaybyday.dto.ExchangeRateDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.UpdateCurrencyDto;
import com.mypaybyday.entity.CurrencyEntity;
import com.mypaybyday.enums.DataSection;
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
 * The currencies the user works with and which of them are principal.
 */
@ApplicationScoped
public class CurrencyService implements DataSectionTransfer<CurrencyExportDto> {

	private final CurrencyRepository currencyRepository;
	private final ExchangeRateRepository exchangeRateRepository;
	private final ExchangeRateLookup exchangeRateLookup;
	private final ConversionBackfillQueue conversionBackfillQueue;
	private final CurrencyValidator currencyValidator;
	private final ArchivedItemImporter archivedItemImporter;
	private final Messages messages;

	public CurrencyService(
			CurrencyRepository currencyRepository,
			ExchangeRateRepository exchangeRateRepository,
			ExchangeRateLookup exchangeRateLookup,
			ConversionBackfillQueue conversionBackfillQueue,
			CurrencyValidator currencyValidator,
			ArchivedItemImporter archivedItemImporter,
			Messages messages) {
		this.currencyRepository = currencyRepository;
		this.exchangeRateRepository = exchangeRateRepository;
		this.exchangeRateLookup = exchangeRateLookup;
		this.conversionBackfillQueue = conversionBackfillQueue;
		this.currencyValidator = currencyValidator;
		this.archivedItemImporter = archivedItemImporter;
		this.messages = messages;
	}

	/**
	 * Every currency the user configured, plus the base currency, which is listed even before it is
	 * configured because every quote is expressed against it.
	 */
	@Transactional
	public List<CurrencyDto> listCurrencies() {
		String baseCurrency = exchangeRateLookup.baseCurrency();
		Map<String, CurrencyDto> currenciesByCode = new TreeMap<>();
		currenciesByCode.put(baseCurrency, toDto(baseCurrency, false));
		for (CurrencyEntity currency : currencyRepository.listOrderedByCode()) {
			currenciesByCode.put(currency.code, toDto(currency.code, currency.principal));
		}
		return List.copyOf(currenciesByCode.values());
	}

	/**
	 * Creates the currency if needed and sets whether it is principal. Making it principal queues the
	 * conversion of every past transaction into it, at the current rate.
	 *
	 * @throws BusinessException if the code is unknown, or it is made principal without a quote
	 */
	@Transactional
	public CurrencyDto updateCurrency(String code, UpdateCurrencyDto update) throws BusinessException {
		String normalizedCode = currencyValidator.validateRequired(code);
		boolean isQuoted = exchangeRateLookup.currentQuotes().isQuoted(normalizedCode);
		if (update.principal() && !isQuoted) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_MISSING, normalizedCode);
		}

		CurrencyEntity currency = findOrCreate(normalizedCode);
		boolean becamePrincipal = update.principal() && !currency.principal;
		currency.principal = update.principal();

		if (becamePrincipal) {
			conversionBackfillQueue.enqueue(normalizedCode);
		}
		Log.infof("Currency %s principal=%b", normalizedCode, currency.principal);
		return toDto(normalizedCode, currency.principal);
	}

	CurrencyEntity findOrCreate(String code) {
		Optional<CurrencyEntity> existing = currencyRepository.findByCode(code);
		if (existing.isPresent()) return existing.get();

		CurrencyEntity created = new CurrencyEntity();
		created.code = code;
		currencyRepository.persist(created);
		return created;
	}

	private CurrencyDto toDto(String code, boolean principal) {
		boolean isBase = code.equals(exchangeRateLookup.baseCurrency());
		ExchangeRateDto currentRate = isBase ? null : exchangeRateRepository
				.findLatest(exchangeRateLookup.baseCurrency(), code)
				.map(ExchangeRateDto::from)
				.orElse(null);
		return new CurrencyDto(code, principal, isBase, currentRate, conversionBackfillQueue.isPending(code));
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.CURRENCIES;
	}

	@Override
	@Transactional
	public long countForExport() {
		return currencyRepository.count();
	}

	@Override
	@Transactional
	public List<CurrencyExportDto> exportData() {
		return currencyRepository.listOrderedByCode().stream()
				.map(currency -> new CurrencyExportDto(currency.code, currency.principal))
				.toList();
	}

	/**
	 * Merges archived currencies into the existing ones by code. A currency principal on either side
	 * stays principal, and its missing conversions are queued once the events are in.
	 */
	@Override
	@Transactional
	public SectionImportResult importData(List<CurrencyExportDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, CurrencyExportDto::code, item -> {
			CurrencyEntity currency = findOrCreate(currencyValidator.validateRequired(item.code()));
			currency.principal = currency.principal || item.principal();
		});
	}

	@Override
	@Transactional
	public void linkDeferredReferences(ImportContext context) {
		conversionBackfillQueue.enqueueAllPrincipal();
	}
}
