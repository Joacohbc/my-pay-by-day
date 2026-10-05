package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.logging.Log;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Quotes currencies at Banco República's (BROU) board selling price ("venta"): the pesos the bank
 * charges for one unit of each currency, which is what buying dollars or paying a card balance in
 * dollars actually costs.
 *
 * <p>The BROU publishes no API, so the board is read from its public quotes page. The board prices
 * every currency in pesos; a quote against any other base is the ratio of both selling prices. Only
 * the board ("pizarra") dollar is read: the cheaper "Dólar eBROU" applies to online operations alone.
 */
@ApplicationScoped
public class BrouExchangeRateProvider implements ExchangeRateProvider {

	static final String SOURCE_NAME = "BROU";
	static final String PESO = "UYU";
	static final String DOLLAR = "USD";

	/** Board rows the application can use, by the name the board shows; the rest are not currencies it tracks. */
	private static final Map<String, String> CURRENCY_BY_BOARD_NAME = Map.of(
			"Dólar", DOLLAR,
			"Euro", "EUR",
			"Peso Argentino", "ARS",
			"Real", "BRL",
			"Libra Esterlina", "GBP",
			"Franco Suizo", "CHF",
			"Guaraní", "PYG");

	private static final Pattern BOARD_ROW = Pattern.compile("<tr>(.*?)</tr>", Pattern.DOTALL);
	private static final Pattern CURRENCY_NAME = Pattern.compile("<p class=\"moneda\">\\s*([^<]+?)\\s*</p>");
	private static final Pattern PRICE_CELL = Pattern.compile("<p class=\"valor\">\\s*([^<]*?)\\s*</p>");
	private static final Pattern BOARD_NUMBER = Pattern.compile("[0-9.]+,[0-9]+");
	private static final int SELLING_PRICE_COLUMN = 1;

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
	private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
	private static final int HTTP_OK = 200;

	private final Messages messages;
	private final Optional<String> boardUrl;
	private final HttpClient httpClient;

	public BrouExchangeRateProvider(
			Messages messages,
			@ConfigProperty(name = "mypaybyday.exchange-rate.brou.url") Optional<String> boardUrl) {
		this.messages = messages;
		this.boardUrl = boardUrl.filter(url -> !url.isBlank());
		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(CONNECT_TIMEOUT)
				.followRedirects(HttpClient.Redirect.NORMAL)
				.build();
	}

	@Override
	public String name() {
		return SOURCE_NAME;
	}

	@Override
	public Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies)
			throws BusinessException {
		if (boardUrl.isEmpty()) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_NOT_CONFIGURED);
		}
		Map<String, BigDecimal> pesosPerUnit = parseSellingPrices(fetchBoard());
		if (!pesosPerUnit.containsKey(DOLLAR)) {
			Log.warnf("The %s board no longer lists the dollar where expected", SOURCE_NAME);
			throw unavailable();
		}
		if (!pesosPerUnit.containsKey(baseCurrency)) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_BASE_UNSUPPORTED, SOURCE_NAME, baseCurrency);
		}
		return toUnitsPerBase(pesosPerUnit, baseCurrency, currencies);
	}

	/**
	 * Reads the selling price of every board row the application tracks.
	 *
	 * @return pesos per unit of each currency, the peso itself included at 1
	 */
	static Map<String, BigDecimal> parseSellingPrices(String boardHtml) {
		Map<String, BigDecimal> pesosPerUnit = new HashMap<>();
		pesosPerUnit.put(PESO, BigDecimal.ONE);
		Matcher row = BOARD_ROW.matcher(boardHtml);
		while (row.find()) {
			readSellingPrice(row.group(1)).ifPresent(quote -> pesosPerUnit.put(quote.getKey(), quote.getValue()));
		}
		return pesosPerUnit;
	}

	/**
	 * @param pesosPerUnit the selling price in pesos of every currency the board lists
	 * @return how many units of each asked-for currency buy one unit of the base
	 */
	static Map<String, BigDecimal> toUnitsPerBase(Map<String, BigDecimal> pesosPerUnit, String baseCurrency,
			Set<String> currencies) {
		BigDecimal pesosPerBase = pesosPerUnit.get(baseCurrency);
		Map<String, BigDecimal> unitsPerBase = new HashMap<>();
		currencies.stream()
				.filter(currency -> !currency.equals(baseCurrency))
				.filter(pesosPerUnit::containsKey)
				.forEach(currency -> unitsPerBase.put(currency,
						pesosPerBase.divide(pesosPerUnit.get(currency), ExchangeRateQuotes.RATE_SCALE, RoundingMode.HALF_EVEN)));
		return unitsPerBase;
	}

	private static Optional<Map.Entry<String, BigDecimal>> readSellingPrice(String rowHtml) {
		Matcher name = CURRENCY_NAME.matcher(rowHtml);
		if (!name.find()) {
			return Optional.empty();
		}
		String currency = CURRENCY_BY_BOARD_NAME.get(name.group(1));
		List<String> prices = PRICE_CELL.matcher(rowHtml).results().map(cell -> cell.group(1)).toList();
		boolean hasSellingPrice = prices.size() > SELLING_PRICE_COLUMN
				&& BOARD_NUMBER.matcher(prices.get(SELLING_PRICE_COLUMN)).matches();
		if (currency == null || !hasSellingPrice) {
			return Optional.empty();
		}
		return Optional.of(Map.entry(currency, parseBoardNumber(prices.get(SELLING_PRICE_COLUMN))));
	}

	/** The board writes numbers the Uruguayan way: "1.234,56". */
	private static BigDecimal parseBoardNumber(String boardNumber) {
		return new BigDecimal(boardNumber.replace(".", "").replace(',', '.'));
	}

	private String fetchBoard() throws BusinessException {
		HttpRequest request = HttpRequest.newBuilder()
				.uri(URI.create(boardUrl.orElseThrow()))
				.timeout(REQUEST_TIMEOUT)
				.header("Accept", "text/html")
				.GET()
				.build();
		try {
			HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() != HTTP_OK) {
				Log.warnf("%s board request failed: HTTP %d", SOURCE_NAME, response.statusCode());
				throw unavailable();
			}
			return response.body();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw unavailable();
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			Log.warnf("%s board request failed: %s", SOURCE_NAME, e.getMessage());
			throw unavailable();
		}
	}

	private BusinessException unavailable() {
		return messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_UNAVAILABLE, SOURCE_NAME);
	}
}
