package com.mypaybyday.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
import com.mypaybyday.service.currency.DisplayCurrency;
import com.mypaybyday.service.currency.DisplayCurrency.ExpressedEvents;

/**
 * Turns a set of events into balances, either one per currency or a single one in the currency a
 * view asked for.
 *
 * <p>The aggregation groups first and sums second, so every figure inside a
 * {@link CurrencyBalanceDto} is a sum of amounts denominated the same way. A view in one currency
 * reaches that state by first expressing every event in it, with the rate frozen on the event.
 *
 * <p>The sums run in Java rather than as SQL {@code SUM} because line-item amounts are encrypted
 * at rest: the database only ever sees ciphertext.
 */
@ApplicationScoped
public class CurrencyBalanceAggregator {

	private record BudgetTarget(CategoryDto category, BigDecimal amount, String currency) {
	}

	/**
	 * @param events  events to aggregate; those without a transaction or currency are skipped
	 * @param budgets per-category budgets to report alongside the spending, possibly empty
	 * @param display the currency the view reports in
	 * @return one entry per currency present in either input, busiest currency first; exactly one
	 *         entry, in the display currency, when the view asked for one
	 */
	public List<CurrencyBalanceDto> balances(List<FinanceEventDto> events, Set<TimePeriodBudgetEntity> budgets,
			DisplayCurrency display) {
		List<BudgetTarget> budgetTargets = budgetTargets(budgets);
		if (display.isPerCurrency()) {
			return balancesPerCurrency(events, budgetTargets);
		}

		ExpressedEvents expressed = display.express(events);
		List<BudgetTarget> expressedBudgets = budgetTargets.stream()
				.flatMap(budget -> display.expressTarget(budget.amount(), budget.currency())
						.map(amount -> new BudgetTarget(budget.category(), amount, display.code()))
						.stream())
				.toList();

		CurrencyBalanceDto balance = balancesPerCurrency(expressed.events(), expressedBudgets).stream()
				.findFirst()
				.orElseGet(() -> emptyBalance(display.code()));
		return List.of(balance.withUnconvertedEvents(expressed.unconvertedCount()));
	}

	private List<CurrencyBalanceDto> balancesPerCurrency(List<FinanceEventDto> events, List<BudgetTarget> budgets) {
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

		budgets.forEach(budget -> currencies.add(budget.currency()));

		List<CurrencyBalanceDto> balances = new ArrayList<>();
		for (String currency : currencies) {
			BigDecimal income = incomeByCurrency.getOrDefault(currency, BigDecimal.ZERO);
			BigDecimal outbound = outboundByCurrency.getOrDefault(currency, BigDecimal.ZERO);
			Map<Long, BigDecimal> spentPerCategory = spentByCurrencyAndCategory.getOrDefault(currency, Map.of());
			balances.add(new CurrencyBalanceDto(
					currency,
					income,
					outbound,
					summariseBudgets(budgets, currency, spentPerCategory),
					0));
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
	 * Budgets for one category that a converted view brought into the same currency add up.
	 */
	private List<CategoryBudgetSummaryDto> summariseBudgets(List<BudgetTarget> budgets, String currency,
			Map<Long, BigDecimal> spentPerCategory) {
		Map<Long, CategoryDto> categoriesById = new LinkedHashMap<>();
		Map<Long, BigDecimal> budgetedByCategory = new HashMap<>();
		budgets.stream()
				.filter(budget -> currency.equals(budget.currency()))
				.forEach(budget -> {
					categoriesById.putIfAbsent(budget.category().id(), budget.category());
					budgetedByCategory.merge(budget.category().id(), budget.amount(), BigDecimal::add);
				});

		return categoriesById.values().stream()
				.map(category -> new CategoryBudgetSummaryDto(
						category,
						budgetedByCategory.get(category.id()),
						spentPerCategory.getOrDefault(category.id(), BigDecimal.ZERO)))
				.toList();
	}

	private List<BudgetTarget> budgetTargets(Set<TimePeriodBudgetEntity> budgets) {
		if (budgets == null) return List.of();
		return budgets.stream()
				.filter(budget -> budget.currency != null)
				.map(budget -> new BudgetTarget(CategoryDto.from(budget.category), budget.budgetedAmount, budget.currency))
				.toList();
	}

	private CurrencyBalanceDto emptyBalance(String currency) {
		return new CurrencyBalanceDto(currency, BigDecimal.ZERO, BigDecimal.ZERO, List.of(), 0);
	}
}
