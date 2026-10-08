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
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.enums.QuotedPrice;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import io.quarkus.logging.Log;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Quotes currencies at the midpoint of Banco República's (BROU) board buying ("compra") and selling
 * ("venta") prices. The midpoint is a neutral value for what a balance held in the currency is worth,
 * rather than the cost of buying it or what selling it would yield.
 *
 * <p>The BROU publishes no API, so the board is read from its public quotes page. The board prices
 * every currency in pesos; a quote against any other base is the ratio of both midpoints. Only the
 * board ("pizarra") dollar is read: the "Dólar eBROU" applies to online operations alone.
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
	private static final int BUYING_PRICE_COLUMN = 0;
	private static final int SELLING_PRICE_COLUMN = 1;
	private static final BigDecimal PRICES_AVERAGED = BigDecimal.valueOf(2);

	private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
	private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
	private static final int HTTP_OK = 200;

	private final Messages messages;
	private final Optional<String> boardUrl;
	private final HttpClient httpClient;

	public BrouExchangeRateProvider(
			Messages messages,
			@ConfigProperty(name = "mypaybyday.exchange-rate.providers.brou.url") Optional<String> boardUrl) {
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
	public boolean isConfigured() {
		return boardUrl.isPresent();
	}

	@Override
	public Set<String> quotableCurrencies() {
		return Stream.concat(Stream.of(PESO), CURRENCY_BY_BOARD_NAME.values().stream()).collect(Collectors.toSet());
	}

	@Override
	public QuotedPrice quotedPrice() {
		return QuotedPrice.MID;
	}

	@Override
	public Map<String, BigDecimal> fetchUnitsPerBase(String baseCurrency, Set<String> currencies)
			throws BusinessException {
		if (boardUrl.isEmpty()) {
			throw messages.reject(MsgKey.EXCHANGE_RATE_PROVIDER_NOT_CONFIGURED);
		}
		Map<String, BigDecimal> pesosPerUnit = parseMidPrices(fetchBoard());
		boolean boardListsEveryCurrencyNeeded = pesosPerUnit.containsKey(DOLLAR) && pesosPerUnit.containsKey(baseCurrency);
		if (!boardListsEveryCurrencyNeeded) {
			Log.warnf("The %s board no longer lists the dollar or %s where expected", SOURCE_NAME, baseCurrency);
			throw unavailable();
		}
		return toUnitsPerBase(pesosPerUnit, baseCurrency, currencies);
	}

	/**
	 * Reads the midpoint between the buying and selling price of every board row the application
	 * tracks.
	 *
	 * @return pesos per unit of each currency, the peso itself included at 1
	 */
	static Map<String, BigDecimal> parseMidPrices(String boardHtml) {
		Map<String, BigDecimal> pesosPerUnit = new HashMap<>();
		pesosPerUnit.put(PESO, BigDecimal.ONE);
		Matcher row = BOARD_ROW.matcher(boardHtml);
		while (row.find()) {
			readMidPrice(row.group(1)).ifPresent(quote -> pesosPerUnit.put(quote.getKey(), quote.getValue()));
		}
		return pesosPerUnit;
	}

	/**
	 * @param pesosPerUnit the price in pesos of every currency the board lists
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

	private static Optional<Map.Entry<String, BigDecimal>> readMidPrice(String rowHtml) {
		Matcher name = CURRENCY_NAME.matcher(rowHtml);
		if (!name.find()) {
			return Optional.empty();
		}
		String currency = CURRENCY_BY_BOARD_NAME.get(name.group(1));
		List<String> prices = PRICE_CELL.matcher(rowHtml).results().map(cell -> cell.group(1)).toList();
		boolean hasBothPrices = isBoardNumberAt(prices, BUYING_PRICE_COLUMN) && isBoardNumberAt(prices, SELLING_PRICE_COLUMN);
		if (currency == null || !hasBothPrices) {
			return Optional.empty();
		}
		BigDecimal buyingPrice = parseBoardNumber(prices.get(BUYING_PRICE_COLUMN));
		BigDecimal sellingPrice = parseBoardNumber(prices.get(SELLING_PRICE_COLUMN));
		return Optional.of(Map.entry(currency, midPrice(buyingPrice, sellingPrice)));
	}

	private static boolean isBoardNumberAt(List<String> prices, int column) {
		return prices.size() > column && BOARD_NUMBER.matcher(prices.get(column)).matches();
	}

	private static BigDecimal midPrice(BigDecimal buyingPrice, BigDecimal sellingPrice) {
		return buyingPrice.add(sellingPrice)
				.divide(PRICES_AVERAGED, ExchangeRateQuotes.RATE_SCALE, RoundingMode.HALF_EVEN)
				.stripTrailingZeros();
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
