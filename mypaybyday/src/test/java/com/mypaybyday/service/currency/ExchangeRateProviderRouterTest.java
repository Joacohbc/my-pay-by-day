package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.mypaybyday.enums.QuotedPrice;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExchangeRateProviderRouterTest {

	private static final String BASE = "UYU";
	private static final Messages MESSAGES = new Messages(new LanguageContext());

	@Test
	void aCurrencyIsQuotedByTheFirstProviderItsRouteNames() {
		FakeProvider first = new FakeProvider("first", Set.of(BASE, "USD"));
		FakeProvider second = new FakeProvider("second", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of("USD", List.of("second", "first")), first, second);

		List<ProviderQuote> quotes = router.fetchQuotes(BASE, Set.of("USD"));

		assertEquals(List.of("second"), providerNames(quotes));
		assertTrue(first.askedCurrencies.isEmpty());
	}

	@Test
	void aCurrencyWithoutARouteOfItsOwnFollowsTheDefaultRoute() {
		FakeProvider first = new FakeProvider("first", Set.of(BASE, "USD"));
		FakeProvider second = new FakeProvider("second", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of("default", List.of("second")), first, second);

		assertEquals(List.of("second"), providerNames(router.fetchQuotes(BASE, Set.of("USD"))));
	}

	@Test
	void withoutAnyRouteProvidersAreTriedByName() {
		FakeProvider zeta = new FakeProvider("zeta", Set.of(BASE, "USD"));
		FakeProvider alpha = new FakeProvider("alpha", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of(), zeta, alpha);

		assertEquals(List.of("alpha"), providerNames(router.fetchQuotes(BASE, Set.of("USD"))));
	}

	@Test
	void aCurrencyMovesOnToTheNextProviderWhenOneFails() {
		FakeProvider failing = new FakeProvider("failing", Set.of(BASE, "USD")).failing();
		FakeProvider backup = new FakeProvider("backup", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of("USD", List.of("failing", "backup")), failing, backup);

		assertEquals(List.of("backup"), providerNames(router.fetchQuotes(BASE, Set.of("USD"))));
	}

	@Test
	void aCurrencyMovesOnToTheNextProviderWhenOneLeavesItOut() {
		FakeProvider silent = new FakeProvider("silent", Set.of(BASE, "USD")).withoutAnswerFor("USD");
		FakeProvider backup = new FakeProvider("backup", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of("USD", List.of("silent", "backup")), silent, backup);

		assertEquals(List.of("backup"), providerNames(router.fetchQuotes(BASE, Set.of("USD"))));
	}

	@Test
	void unconfiguredProvidersAndThoseThatCannotQuoteTheBaseAreSkipped() {
		FakeProvider unconfigured = new FakeProvider("unconfigured", Set.of(BASE, "USD")).unconfigured();
		FakeProvider withoutBase = new FakeProvider("without-base", Set.of("EUR", "USD"));
		FakeProvider able = new FakeProvider("able", Set.of(BASE, "USD"));
		ExchangeRateProviderRouter router = router(Map.of(), unconfigured, withoutBase, able);

		assertEquals(List.of("able"), providerNames(router.fetchQuotes(BASE, Set.of("USD"))));
		assertTrue(withoutBase.askedCurrencies.isEmpty());
	}

	@Test
	void eachProviderIsAskedOnceForEveryCurrencyRoutedToIt() {
		FakeProvider bank = new FakeProvider("bank", Set.of(BASE, "USD", "EUR"));
		ExchangeRateProviderRouter router = router(Map.of(), bank);

		List<ProviderQuote> quotes = router.fetchQuotes(BASE, Set.of("USD", "EUR"));

		assertEquals(List.of("EUR", "USD"), quotes.stream().map(ProviderQuote::currency).toList());
		assertEquals(List.of(Set.of("USD", "EUR")), bank.askedCurrencies);
	}

	@Test
	void aCurrencyNoProviderQuotesIsLeftOut() {
		FakeProvider bank = new FakeProvider("bank", Set.of(BASE, "USD"));

		assertTrue(router(Map.of(), bank).fetchQuotes(BASE, Set.of("JPY")).isEmpty());
	}

	@Test
	void whenEveryProviderAskedFailsTheFailureIsReported() {
		FakeProvider failing = new FakeProvider("failing", Set.of(BASE, "USD")).failing();

		BusinessException failure = assertThrows(BusinessException.class,
				() -> router(Map.of(), failing).fetchQuotes(BASE, Set.of("USD")));

		assertEquals(MESSAGES.get(MsgKey.EXCHANGE_RATE_PROVIDER_UNAVAILABLE, "failing"), failure.getMessage());
	}

	@Test
	void withoutAnyConfiguredProviderNothingCanBeQuoted() {
		FakeProvider unconfigured = new FakeProvider("unconfigured", Set.of(BASE, "USD")).unconfigured();

		BusinessException failure = assertThrows(BusinessException.class,
				() -> router(Map.of(), unconfigured).fetchQuotes(BASE, Set.of("USD")));

		assertEquals(MESSAGES.get(MsgKey.EXCHANGE_RATE_PROVIDER_NOT_CONFIGURED), failure.getMessage());
	}

	private static ExchangeRateProviderRouter router(Map<String, List<String>> routes, ExchangeRateProvider... providers) {
		return new ExchangeRateProviderRouter(List.of(providers), () -> routes, MESSAGES);
	}

	private static List<String> providerNames(List<ProviderQuote> quotes) {
		return quotes.stream().map(ProviderQuote::providerName).toList();
	}

	private static final class FakeProvider implements ExchangeRateProvider {

		private static final BigDecimal ANY_RATE = new BigDecimal("40");

		private final String name;
		private final Set<String> quotableCurrencies;
		private final List<Set<String>> askedCurrencies = new ArrayList<>();
		private boolean isConfigured = true;
		private boolean isFailing;
		private String unansweredCurrency;

		FakeProvider(String name, Set<String> quotableCurrencies) {
			this.name = name;
			this.quotableCurrencies = quotableCurrencies;
		}

		FakeProvider unconfigured() {
			isConfigured = false;
			return this;
		}

		FakeProvider failing() {
			isFailing = true;
			return this;
		}

		FakeProvider withoutAnswerFor(String currency) {
			unansweredCurrency = currency;
			return this;
		}

		@Override
		public String name() {
			return name;
		}

		@Override
		public boolean isConfigured() {
			return isConfigured;
		}

		@Override
		public Set<String> quotableCurrencies() {
			return quotableCurrencies;
		}

		@Override
		public QuotedPrice quotedPrice() {
			return QuotedPrice.MID;
		}

		@Override
		public Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies) {
			askedCurrencies.add(Set.copyOf(currencies));
			if (isFailing) {
				throw MESSAGES.reject(MsgKey.EXCHANGE_RATE_PROVIDER_UNAVAILABLE, name);
			}
			Map<String, BigDecimal> unitsPerBase = new HashMap<>();
			currencies.stream()
					.filter(currency -> !currency.equals(unansweredCurrency))
					.forEach(currency -> unitsPerBase.put(currency, ANY_RATE));
			return unitsPerBase;
		}
	}
}
