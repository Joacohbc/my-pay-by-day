package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import com.mypaybyday.exception.BusinessException;

/**
 * An external source of quotes, consulted when the user asks for a refresh, previews one, or has
 * scheduled a daily refresh.
 */
public interface ExchangeRateProvider {

	/** @return the name the user knows the source by, e.g. the bank whose board it reads */
	String name();

	/**
	 * @param baseCurrency the currency every returned quote must be expressed against
	 * @param currencies   the currencies to quote
	 * @return units of each currency that buy one unit of {@code baseCurrency}; currencies the
	 *         source cannot quote are left out
	 * @throws BusinessException if the source is not configured or cannot be reached
	 */
	Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies) throws BusinessException;
}
