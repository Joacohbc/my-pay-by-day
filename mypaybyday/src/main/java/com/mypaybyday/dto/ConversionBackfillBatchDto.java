package com.mypaybyday.dto;

import java.util.List;

/**
 * The outcome of converting one batch of past transactions into a principal currency.
 *
 * @param convertedCount     transactions that received a rate
 * @param skippedCount       transactions left unconverted because a currency had no quote
 * @param unquotedCurrencies the currencies that lacked a quote
 * @param lastTransactionId  where the next batch resumes
 * @param hasMore            whether another batch may still find work
 */
public record ConversionBackfillBatchDto(
		int convertedCount,
		int skippedCount,
		List<String> unquotedCurrencies,
		long lastTransactionId,
		boolean hasMore) {

	public static ConversionBackfillBatchDto finished(long lastTransactionId) {
		return new ConversionBackfillBatchDto(0, 0, List.of(), lastTransactionId, false);
	}
}
