package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import com.mypaybyday.enums.QuotedPrice;
import com.mypaybyday.exception.BusinessException;

/**
 * An external source of quotes. Every implementation is picked up on its own; which one quotes each
 * currency is decided by {@link ExchangeRateProviderRouter}.
 */
public interface ExchangeRateProvider {

	/**
	 * @return the name the user knows the source by, e.g. the bank whose board it reads; also the
	 *         key it is referred to by in the routing configuration and on every rate it supplied
	 */
	String name();

	/** @return {@code false} when the source lacks the configuration it needs, so it is skipped */
	boolean isConfigured();

	/** @return every currency the source can quote, the one it prices in included */
	Set<String> quotableCurrencies();

	/** @return which of the source's prices its quotes are */
	QuotedPrice quotedPrice();

	/**
	 * @param baseCurrency the currency every returned quote must be expressed against
	 * @param currencies   the currencies to quote
	 * @return units of each currency that buy one unit of {@code baseCurrency}; currencies the
	 *         source cannot quote are left out
	 * @throws BusinessException if the source cannot be reached or its answer cannot be read
	 */
	Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies) throws BusinessException;
}
