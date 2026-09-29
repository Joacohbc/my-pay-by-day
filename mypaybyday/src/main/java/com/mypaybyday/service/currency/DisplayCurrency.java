package com.mypaybyday.service.currency;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.TransactionConversionDto;

/**
 * The currency a view reports in, and how each event is expressed in it.
 *
 * <ul>
 * <li>{@link Mode#PER_CURRENCY} — no currency chosen: every amount stays in its own currency and
 * the view reports one bucket per currency.</li>
 * <li>{@link Mode#CONVERTED} — a principal currency: every event counts, converted with the rate
 * frozen on it. Events that hold no such rate yet (the backfill has not reached them, or their
 * currency has no quote) cannot be expressed and are reported as unconverted.</li>
 * <li>{@link Mode#FILTERED} — any other currency: only events recorded in it count.</li>
 * </ul>
 */
public final class DisplayCurrency {

	public enum Mode { PER_CURRENCY, CONVERTED, FILTERED }

	/**
	 * @param events           the events that could be expressed in the display currency
	 * @param unconvertedCount events of a {@link Mode#CONVERTED} view left out for lack of a rate
	 */
	public record ExpressedEvents(List<FinanceEventDto> events, int unconvertedCount) {
	}

	private static final DisplayCurrency PER_CURRENCY = new DisplayCurrency(null, Mode.PER_CURRENCY, null);

	private final String code;
	private final Mode mode;
	private final ExchangeRateQuotes currentQuotes;

	private DisplayCurrency(String code, Mode mode, ExchangeRateQuotes currentQuotes) {
		this.code = code;
		this.mode = mode;
		this.currentQuotes = currentQuotes;
	}

	public static DisplayCurrency perCurrency() {
		return PER_CURRENCY;
	}

	/**
	 * @param currentQuotes used only for amounts that are not events, such as budgets, which are
	 *                      targets rather than recorded movements and so have no frozen rate
	 */
	public static DisplayCurrency converted(String code, ExchangeRateQuotes currentQuotes) {
		return new DisplayCurrency(code, Mode.CONVERTED, currentQuotes);
	}

	public static DisplayCurrency filtered(String code) {
		return new DisplayCurrency(code, Mode.FILTERED, null);
	}

	public String code() {
		return code;
	}

	public Mode mode() {
		return mode;
	}

	public boolean isPerCurrency() {
		return mode == Mode.PER_CURRENCY;
	}

	/**
	 * @param frozenRatesByCurrency the rates frozen on the movement, keyed by target currency
	 * @return the rate that expresses one unit of {@code ownCurrency} in this view; empty when the
	 *         movement does not count in this view
	 */
	public Optional<BigDecimal> rateFor(String ownCurrency, Map<String, BigDecimal> frozenRatesByCurrency) {
		if (ownCurrency == null) return Optional.empty();
		if (mode == Mode.PER_CURRENCY || ownCurrency.equals(code)) return Optional.of(BigDecimal.ONE);
		if (mode == Mode.FILTERED) return Optional.empty();
		return Optional.ofNullable(frozenRatesByCurrency.get(code));
	}

	/**
	 * @return the bucket a movement in {@code ownCurrency} lands in once expressed in this view
	 */
	public String bucketFor(String ownCurrency) {
		return isPerCurrency() ? ownCurrency : code;
	}

	public ExpressedEvents express(List<FinanceEventDto> events) {
		if (isPerCurrency()) return new ExpressedEvents(events, 0);

		int unconvertedCount = 0;
		List<FinanceEventDto> expressed = new ArrayList<>();
		for (FinanceEventDto event : events) {
			if (event.transactionId() == null || event.currency() == null) continue;
			Optional<BigDecimal> rate = rateFor(event.currency(), frozenRatesOf(event.conversions()));
			if (rate.isPresent()) {
				expressed.add(event.currency().equals(code) ? event : event.convertedTo(code, rate.get()));
			} else if (mode == Mode.CONVERTED) {
				unconvertedCount++;
			}
		}
		return new ExpressedEvents(expressed, unconvertedCount);
	}

	/**
	 * Expresses a target amount (a budget) in this view, at the current quotes.
	 *
	 * @return empty when it does not count in this view, or no quote exists to convert it
	 */
	public Optional<BigDecimal> expressTarget(BigDecimal amount, String ownCurrency) {
		if (amount == null || ownCurrency == null) return Optional.empty();
		if (mode == Mode.PER_CURRENCY || ownCurrency.equals(code)) return Optional.of(amount);
		if (mode == Mode.FILTERED) return Optional.empty();
		return currentQuotes.rate(ownCurrency, code)
				.map(rate -> TransactionConversionDto.convert(amount, rate, code));
	}

	private static Map<String, BigDecimal> frozenRatesOf(List<TransactionConversionDto> conversions) {
		if (conversions == null) return Map.of();
		return conversions.stream().collect(Collectors.toMap(
				TransactionConversionDto::currency, TransactionConversionDto::rate, (first, second) -> first));
	}
}
