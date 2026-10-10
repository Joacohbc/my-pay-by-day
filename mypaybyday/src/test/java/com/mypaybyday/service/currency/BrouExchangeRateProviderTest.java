package com.mypaybyday.service.currency;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Reads a copy of the real BROU board, captured on 2026-10-05. */
class BrouExchangeRateProviderTest {

	private static final String BOARD_FIXTURE = "/exchange-rate/brou-cotizaciones.html";

	@Test
	void readsTheBoardDollarAtTheMidpointOfBuyingAndSellingNotTheEbrouOne() throws IOException {
		Map<String, BigDecimal> pesosPerUnit = BrouExchangeRateProvider.parseMidPrices(board());

		assertAmount("40.40", pesosPerUnit.get("USD"));
	}

	@Test
	void readsEveryTrackedCurrencyAndSkipsTheRest() throws IOException {
		Map<String, BigDecimal> pesosPerUnit = BrouExchangeRateProvider.parseMidPrices(board());

		assertEquals(Set.of("UYU", "USD", "EUR", "ARS", "BRL", "GBP", "CHF", "PYG"), pesosPerUnit.keySet());
		assertAmount("45.59", pesosPerUnit.get("EUR"));
		assertAmount("0.006885", pesosPerUnit.get("PYG"));
	}

	@Test
	void aRowMissingEitherPriceIsLeftOut() {
		String boardWithoutBuyingPrice = "<tr><p class=\"moneda\">Euro</p>"
				+ "<p class=\"valor\">-</p><p class=\"valor\">48,02000</p></tr>";

		Map<String, BigDecimal> pesosPerUnit = BrouExchangeRateProvider.parseMidPrices(boardWithoutBuyingPrice);

		assertFalse(pesosPerUnit.containsKey("EUR"));
	}

	@Test
	void againstADollarBaseThePesoIsTheDollarPrice() {
		Map<String, BigDecimal> quotes = BrouExchangeRateProvider.toUnitsPerBase(
				Map.of("UYU", BigDecimal.ONE, "USD", new BigDecimal("40")), "USD", Set.of("UYU"));

		assertAmount("40", quotes.get("UYU"));
	}

	@Test
	void againstAPesoBaseEveryCurrencyIsTheInverseOfItsPrice() {
		Map<String, BigDecimal> quotes = BrouExchangeRateProvider.toUnitsPerBase(
				Map.of("UYU", BigDecimal.ONE, "USD", new BigDecimal("40")), "UYU", Set.of("USD"));

		assertAmount("0.025", quotes.get("USD"));
	}

	@Test
	void aCrossRateIsTheRatioOfBothPrices() {
		Map<String, BigDecimal> pesosPerUnit = Map.of(
				"UYU", BigDecimal.ONE, "USD", new BigDecimal("40"), "EUR", new BigDecimal("50"));

		Map<String, BigDecimal> quotes = BrouExchangeRateProvider.toUnitsPerBase(pesosPerUnit, "USD", Set.of("EUR", "UYU"));

		assertAmount("0.8", quotes.get("EUR"));
		assertAmount("40", quotes.get("UYU"));
	}

	@Test
	void currenciesTheBoardDoesNotListAreLeftOut() {
		Map<String, BigDecimal> quotes = BrouExchangeRateProvider.toUnitsPerBase(
				Map.of("UYU", BigDecimal.ONE, "USD", new BigDecimal("40")), "USD", Set.of("JPY"));

		assertFalse(quotes.containsKey("JPY"));
		assertTrue(quotes.isEmpty());
	}

	private String board() throws IOException {
		try (InputStream boardHtml = getClass().getResourceAsStream(BOARD_FIXTURE)) {
			return new String(boardHtml.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private static void assertAmount(String expected, BigDecimal actual) {
		assertEquals(0, new BigDecimal(expected).compareTo(actual), () -> "was " + actual);
	}
}
