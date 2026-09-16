package com.mypaybyday.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.dto.CategoryBudgetSummaryDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.CurrencyBalanceDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.entity.TimePeriodBudgetEntity;
import com.mypaybyday.enums.EventType;

/**
 * Splits a set of events into one balance per currency.
 *
 * <p>Without exchange rates there is no single number that describes a multi-currency period, so
 * the aggregation groups first and sums second. Every figure inside a
 * {@link CurrencyBalanceDto} is therefore a sum of amounts that were all denominated the same way,
 * which is the only kind of sum this system can honestly produce.
 *
 * <p>The sums run in Java rather than as SQL {@code SUM} because line-item amounts are encrypted
 * at rest: the database only ever sees ciphertext. The currency beside them is not encrypted, so
 * grouping by it is cheap.
 */
@ApplicationScoped
public class CurrencyBalanceAggregator {

	/**
	 * @param events  events to aggregate; those without a transaction or currency are skipped
	 * @param budgets per-category budgets to report alongside the spending, possibly empty
	 * @return one entry per currency present in either input, busiest currency first
	 */
	public List<CurrencyBalanceDto> balances(List<FinanceEventDto> events, Set<TimePeriodBudgetEntity> budgets) {
		Map<String, BigDecimal> incomeByCurrency = new HashMap<>();
		Map<String, BigDecimal> outboundByCurrency = new HashMap<>();
		Map<String, Map<Long, BigDecimal>> spentByCurrencyAndCategory = new HashMap<>();
		Set<String> currencies = new LinkedHashSet<>();

		for (FinanceEventDto event : events) {
			String currency = event.currency();
			if (event.transactionId() == null || currency == null) continue;

			currencies.add(currency);
			BigDecimal eventAmount = event.amount() != null ? event.amount() : BigDecimal.ZERO;

			if (event.type() == EventType.INBOUND) {
				incomeByCurrency.merge(currency, eventAmount, BigDecimal::add);
			} else if (event.type() == EventType.OUTBOUND) {
				outboundByCurrency.merge(currency, eventAmount, BigDecimal::add);
				accumulateCategorySpending(spentByCurrencyAndCategory, event, currency, eventAmount);
			}
		}

		Set<TimePeriodBudgetEntity> safeBudgets = budgets != null ? budgets : Set.of();
		safeBudgets.stream()
				.filter(budget -> budget.currency != null)
				.forEach(budget -> currencies.add(budget.currency));

		List<CurrencyBalanceDto> balances = new ArrayList<>();
		for (String currency : currencies) {
			BigDecimal income = incomeByCurrency.getOrDefault(currency, BigDecimal.ZERO);
			BigDecimal outbound = outboundByCurrency.getOrDefault(currency, BigDecimal.ZERO);
			Map<Long, BigDecimal> spentPerCategory = spentByCurrencyAndCategory.getOrDefault(currency, Map.of());
			balances.add(new CurrencyBalanceDto(
					currency,
					income,
					outbound,
					summariseBudgets(safeBudgets, currency, spentPerCategory)));
		}

		balances.sort(Comparator
				.comparing((CurrencyBalanceDto balance) -> balance.income().add(balance.outbound()))
				.reversed()
				.thenComparing(CurrencyBalanceDto::currency));
		return balances;
	}

	private void accumulateCategorySpending(Map<String, Map<Long, BigDecimal>> spentByCurrencyAndCategory,
			FinanceEventDto event, String currency, BigDecimal eventAmount) {
		if (event.category() == null || event.category().id() == null) return;
		spentByCurrencyAndCategory
				.computeIfAbsent(currency, key -> new HashMap<>())
				.merge(event.category().id(), eventAmount, BigDecimal::add);
	}

	/**
	 * Reports each budget in its own currency's bucket only. A 30.000 UYU cap says nothing about
	 * USD spending, so pairing it with a total that mixed both would misreport whether it was met.
	 */
	private List<CategoryBudgetSummaryDto> summariseBudgets(Set<TimePeriodBudgetEntity> budgets, String currency,
			Map<Long, BigDecimal> spentPerCategory) {
		return budgets.stream()
				.filter(budget -> currency.equals(budget.currency))
				.map(budget -> new CategoryBudgetSummaryDto(
						CategoryDto.from(budget.category),
						budget.budgetedAmount,
						spentPerCategory.getOrDefault(budget.category.id, BigDecimal.ZERO)))
				.toList();
	}
}
