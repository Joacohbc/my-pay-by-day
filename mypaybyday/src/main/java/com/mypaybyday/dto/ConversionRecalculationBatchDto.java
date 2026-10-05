package com.mypaybyday.dto;

/**
 * The outcome of re-pricing one batch of transactions for a conversion recalculation.
 *
 * @param recalculatedCount transactions that received the new rate
 * @param lastTransactionId where the next batch resumes
 * @param hasMore           whether another batch may still find work
 */
public record ConversionRecalculationBatchDto(int recalculatedCount, long lastTransactionId, boolean hasMore) {

	public static ConversionRecalculationBatchDto finished(long lastTransactionId) {
		return new ConversionRecalculationBatchDto(0, lastTransactionId, false);
	}
}
