package com.mypaybyday.service.currency;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.CurrencyRepository;
import com.mypaybyday.validation.CurrencyValidator;

/**
 * Decides how a view shows amounts for the currency the user picked.
 */
@ApplicationScoped
public class DisplayCurrencyService {

	private final CurrencyRepository currencyRepository;
	private final ExchangeRateLookup exchangeRateLookup;
	private final CurrencyValidator currencyValidator;

	public DisplayCurrencyService(
			CurrencyRepository currencyRepository,
			ExchangeRateLookup exchangeRateLookup,
			CurrencyValidator currencyValidator) {
		this.currencyRepository = currencyRepository;
		this.exchangeRateLookup = exchangeRateLookup;
		this.currencyValidator = currencyValidator;
	}

	/**
	 * @param code the currency the view was asked for, or {@code null} to keep every amount in its
	 *             own currency
	 * @throws BusinessException if the code is not a known ISO 4217 currency
	 */
	@Transactional
	public DisplayCurrency resolve(String code) throws BusinessException {
		String normalizedCode = currencyValidator.validateOptional(code);
		if (normalizedCode == null) return DisplayCurrency.perCurrency();

		boolean isPrincipal = currencyRepository.listPrincipalCodes().contains(normalizedCode);
		if (!isPrincipal) return DisplayCurrency.filtered(normalizedCode);
		return DisplayCurrency.converted(normalizedCode, exchangeRateLookup.currentQuotes());
	}
}
