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
 * The currencies the user works with and which of them are principal.
 */
@ApplicationScoped
public class CurrencyService implements DataSectionTransfer<CurrencyExportDto> {

	private final CurrencyRepository currencyRepository;
	private final ExchangeRateRepository exchangeRateRepository;
	private final ExchangeRateLookup exchangeRateLookup;
	private final ConversionBackfillQueue conversionBackfillQueue;
	private final ConversionRecalculationService conversionRecalculationService;
	private final CurrencyValidator currencyValidator;
	private final ArchivedItemImporter archivedItemImporter;
	private final Messages messages;

	public CurrencyService(
			CurrencyRepository currencyRepository,
			ExchangeRateRepository exchangeRateRepository,
			ExchangeRateLookup exchangeRateLookup,
			ConversionBackfillQueue conversionBackfillQueue,
			ConversionRecalculationService conversionRecalculationService,
			CurrencyValidator currencyValidator,
			ArchivedItemImporter archivedItemImporter,
			Messages messages) {
		this.currencyRepository = currencyRepository;
		this.exchangeRateRepository = exchangeRateRepository;
		this.exchangeRateLookup = exchangeRateLookup;
		this.conversionBackfillQueue = conversionBackfillQueue;
		this.conversionRecalculationService = conversionRecalculationService;
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
		currenciesByCode.put(baseCurrency, toDto(baseCurrency, false, baseCurrency));
		for (CurrencyEntity currency : currencyRepository.listOrderedByCode()) {
			currenciesByCode.put(currency.code, toDto(currency.code, currency.principal, baseCurrency));
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
		return toDto(normalizedCode, currency.principal, exchangeRateLookup.baseCurrency());
	}

	/**
	 * Makes the currency the one every quote is expressed against. The current quotes are re-expressed
	 * against it, so no rate has to be entered again and every cross rate stays the same. Rates frozen
	 * on past transactions are not touched.
	 *
	 * @throws BusinessException if the code is unknown, or other currencies are quoted but this one is
	 *                           not, so their quotes could not be re-expressed against it
	 */
	@Transactional
	public CurrencyDto makeBase(String code) throws BusinessException {
		String newBase = currencyValidator.validateRequired(code);
		ExchangeRateQuotes quotes = exchangeRateLookup.currentQuotes();
		String previousBase = quotes.baseCurrency();
		boolean cannotRebaseQuotes = !quotes.unitsPerBase().isEmpty() && !quotes.isQuoted(newBase);
		if (cannotRebaseQuotes) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_BASE_UNQUOTED, newBase, previousBase);
		}

		CurrencyEntity currency = findOrCreate(newBase);
		if (newBase.equals(previousBase)) {
			currency.base = true;
			return toDto(newBase, currency.principal, newBase);
		}

		rebaseQuotes(quotes, newBase);
		findOrCreate(previousBase).base = false;
		currency.base = true;
		Log.infof("Base currency changed from %s to %s", previousBase, newBase);
		return toDto(newBase, currency.principal, newBase);
	}

	private void rebaseQuotes(ExchangeRateQuotes quotes, String newBase) {
		String previousBase = quotes.baseCurrency();
		List<ExchangeRateEntity> latestQuotes = exchangeRateRepository.listLatestPerCurrency(previousBase);
		for (ExchangeRateEntity quote : latestQuotes) {
			boolean isNewBaseQuote = quote.currency.equals(newBase);
			String rebasedCurrency = isNewBaseQuote ? previousBase : quote.currency;
			persistRebasedQuote(quotes, newBase, rebasedCurrency, quote.source);
		}
	}

	private void persistRebasedQuote(ExchangeRateQuotes quotes, String newBase, String currency, ExchangeRateSource source) {
		ExchangeRateEntity rebased = new ExchangeRateEntity();
		rebased.currency = currency;
		rebased.baseCurrency = newBase;
		rebased.unitsPerBase = quotes.rate(newBase, currency).orElseThrow();
		rebased.source = source;
		exchangeRateRepository.persist(rebased);
	}

	CurrencyEntity findOrCreate(String code) {
		Optional<CurrencyEntity> existing = currencyRepository.findByCode(code);
		if (existing.isPresent()) return existing.get();

		CurrencyEntity created = new CurrencyEntity();
		created.code = code;
		currencyRepository.persist(created);
		return created;
	}

	private CurrencyDto toDto(String code, boolean principal, String baseCurrency) {
		boolean isBase = code.equals(baseCurrency);
		ExchangeRateDto currentRate = isBase ? null : exchangeRateRepository
				.findLatest(baseCurrency, code)
				.map(ExchangeRateDto::from)
				.orElse(null);
		boolean isConversionPending = conversionBackfillQueue.isPending(code)
				|| conversionRecalculationService.isPendingInto(code);
		return new CurrencyDto(code, principal, isBase, currentRate, isConversionPending);
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
				.map(currency -> new CurrencyExportDto(currency.code, currency.principal, currency.base))
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
			if (item.base() && canAdoptArchivedBase(currency.code)) {
				currency.base = true;
			}
		});
	}

	/**
	 * An archived base is adopted only when it orphans no local quote: either nothing is quoted here
	 * yet (a restore into a fresh install) or it is already the base in effect.
	 */
	private boolean canAdoptArchivedBase(String archivedBase) {
		boolean hasChosenBase = currencyRepository.findBase().isPresent();
		if (hasChosenBase) return false;
		boolean isAlreadyInEffect = archivedBase.equals(exchangeRateLookup.baseCurrency());
		return isAlreadyInEffect || exchangeRateRepository.count() == 0;
	}

	@Override
	@Transactional
	public void linkDeferredReferences(ImportContext context) {
		conversionBackfillQueue.enqueueAllPrincipal();
	}
}
