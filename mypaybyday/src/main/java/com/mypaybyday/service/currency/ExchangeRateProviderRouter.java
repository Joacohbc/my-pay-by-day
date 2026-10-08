package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.arc.All;
import io.quarkus.logging.Log;
import io.quarkus.runtime.Startup;

/**
 * Decides, currency by currency, which {@link ExchangeRateProvider} quotes it.
 *
 * <p>Each currency has an ordered list of candidates: the providers its routing entry names, else
 * those of the {@code default} entry, else every configured provider by name. A candidate that
 * cannot quote the currency or the base is dropped. Currencies are asked from their first candidate,
 * grouped so each provider is called once per round; whatever a provider fails to return moves on to
 * that currency's next candidate.
 */
@ApplicationScoped
@Startup
public class ExchangeRateProviderRouter {

	private final List<ExchangeRateProvider> providersByName;
	private final Map<String, ExchangeRateProvider> providerByKey;
	private final Map<String, List<String>> routeByCurrency;
	private final Messages messages;

	public ExchangeRateProviderRouter(
			@All List<ExchangeRateProvider> providers,
			ExchangeRateRoutingConfig routing,
			Messages messages) {
		this.providersByName = providers.stream().sorted(Comparator.comparing(ExchangeRateProvider::name)).toList();
		this.providerByKey = providers.stream()
				.collect(Collectors.toMap(provider -> providerKey(provider.name()), Function.identity()));
		this.routeByCurrency = routing.providersByCurrency().entrySet().stream()
				.collect(Collectors.toMap(route -> routeKey(route.getKey()), Map.Entry::getValue));
		this.messages = messages;
		warnAboutUnknownRoutedProviders();
	}

	/**
	 * @param baseCurrency the currency every quote must be expressed against
	 * @param currencies   the currencies to quote; the base itself is skipped
	 * @return one quote per currency some provider could quote, ordered by currency
	 * @throws BusinessException if no provider is configured, or every provider asked failed
	 */
	public List<ProviderQuote> fetchQuotes(String baseCurrency, Set<String> currencies) throws BusinessException {
		List<ExchangeRateProvider> configuredProviders = providersByName.stream()
				.filter(ExchangeRateProvider::isConfigured)
				.toList();
		if (configuredProviders.isEmpty()) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_NOT_CONFIGURED);
		}

		Map<String, List<ExchangeRateProvider>> candidatesByCurrency = new LinkedHashMap<>();
		currencies.stream()
				.filter(currency -> !currency.equals(baseCurrency))
				.forEach(currency -> candidatesByCurrency.put(currency,
						candidatesFor(currency, baseCurrency, configuredProviders)));

		Set<String> pendingCurrencies = new LinkedHashSet<>(candidatesByCurrency.keySet());
		List<ProviderQuote> quotes = new ArrayList<>();
		List<BusinessException> failures = new ArrayList<>();
		for (int rank = 0; !pendingCurrencies.isEmpty(); rank++) {
			Map<ExchangeRateProvider, Set<String>> requests = requestsAtRank(rank, pendingCurrencies, candidatesByCurrency);
			if (requests.isEmpty()) break;
			requests.forEach((provider, askedCurrencies) ->
					quotes.addAll(askProvider(provider, baseCurrency, askedCurrencies, failures)));
			quotes.forEach(quote -> pendingCurrencies.remove(quote.currency()));
		}

		boolean everyProviderAskedFailed = quotes.isEmpty() && !failures.isEmpty();
		if (everyProviderAskedFailed) {
			throw failures.get(failures.size() - 1);
		}
		return quotes.stream().sorted(Comparator.comparing(ProviderQuote::currency)).toList();
	}

	private List<ExchangeRateProvider> candidatesFor(String currency, String baseCurrency,
			List<ExchangeRateProvider> configuredProviders) {
		List<String> route = routeByCurrency.getOrDefault(currency, routeByCurrency.get(ExchangeRateRoutingConfig.DEFAULT_ROUTE));
		Stream<ExchangeRateProvider> orderedProviders = route == null
				? configuredProviders.stream()
				: route.stream().map(name -> providerByKey.get(providerKey(name))).filter(Objects::nonNull)
						.filter(ExchangeRateProvider::isConfigured);
		return orderedProviders
				.filter(provider -> provider.quotableCurrencies().containsAll(Set.of(currency, baseCurrency)))
				.toList();
	}

	private static Map<ExchangeRateProvider, Set<String>> requestsAtRank(int rank, Set<String> pendingCurrencies,
			Map<String, List<ExchangeRateProvider>> candidatesByCurrency) {
		Map<ExchangeRateProvider, Set<String>> currenciesByProvider = new LinkedHashMap<>();
		for (String currency : pendingCurrencies) {
			List<ExchangeRateProvider> candidates = candidatesByCurrency.get(currency);
			if (candidates.size() <= rank) continue;
			currenciesByProvider.computeIfAbsent(candidates.get(rank), provider -> new LinkedHashSet<>()).add(currency);
		}
		return currenciesByProvider;
	}

	private static List<ProviderQuote> askProvider(ExchangeRateProvider provider, String baseCurrency,
			Set<String> askedCurrencies, List<BusinessException> failures) {
		try {
			Map<String, BigDecimal> unitsPerBase = provider.fetchUnitsPerBase(baseCurrency, askedCurrencies);
			return unitsPerBase.entrySet().stream()
					.filter(quote -> askedCurrencies.contains(quote.getKey()))
					.map(quote -> new ProviderQuote(provider.name(), provider.quotedPrice(), quote.getKey(), quote.getValue()))
					.toList();
		} catch (BusinessException failure) {
			Log.warnf("Exchange rate provider %s could not quote %s: %s", provider.name(), askedCurrencies,
					failure.getMessage());
			failures.add(failure);
			return List.of();
		}
	}

	private void warnAboutUnknownRoutedProviders() {
		routeByCurrency.forEach((currency, providerNames) -> providerNames.stream()
				.filter(name -> !providerByKey.containsKey(providerKey(name)))
				.forEach(name -> Log.warnf("Exchange rate routing for %s names unknown provider %s", currency, name)));
	}

	private static String providerKey(String providerName) {
		return providerName.trim().toLowerCase(Locale.ROOT);
	}

	private static String routeKey(String currencyOrDefault) {
		String trimmed = currencyOrDefault.trim();
		boolean isDefaultRoute = trimmed.equalsIgnoreCase(ExchangeRateRoutingConfig.DEFAULT_ROUTE);
		return isDefaultRoute ? ExchangeRateRoutingConfig.DEFAULT_ROUTE : trimmed.toUpperCase(Locale.ROOT);
	}
}
