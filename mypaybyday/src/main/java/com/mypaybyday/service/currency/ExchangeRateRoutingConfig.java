package com.mypaybyday.service.currency;

import java.util.List;
import java.util.Map;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithParentName;

/**
 * Which providers quote each currency, in order of preference, e.g.
 * {@code mypaybyday.exchange-rate.routing.JPY=other-bank,main-bank}. The {@code default} key applies to
 * currencies without an entry of their own.
 */
@ConfigMapping(prefix = "mypaybyday.exchange-rate.routing")
public interface ExchangeRateRoutingConfig {

	String DEFAULT_ROUTE = "default";

	@WithParentName
	Map<String, List<String>> providersByCurrency();
}
