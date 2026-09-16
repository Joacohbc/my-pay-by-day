package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBudgetSummaryDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.DynamicTimePeriodBalanceDto;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchTimePeriodDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.TimePeriodBalanceDto;
import com.mypaybyday.dto.TimePeriodBudgetDto;
import com.mypaybyday.dto.TimePeriodDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TimePeriodBudgetEntity;
import com.mypaybyday.entity.TimePeriodEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.TimePeriodRepository;
import com.mypaybyday.service.event.EventService;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.DateValidator;
import com.mypaybyday.validation.TimePeriodValidator;
import io.quarkus.logging.Log;
import io.quarkus.panache.common.Page;
import com.mypaybyday.validation.CurrencyValidator;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class TimePeriodService implements DataSectionTransfer<TimePeriodDto> {

	private final TimePeriodRepository timePeriodRepository;
	private final EventService eventService;
	private final CategoryService categoryService;
	private final Messages messages;
	private final TimePeriodValidator timePeriodValidator;
	private final DateValidator dateValidator;
	private final ArchivedItemImporter archivedItemImporter;
	private final CurrencyBalanceAggregator currencyBalanceAggregator;
	private final CurrencyValidator currencyValidator;

	@ConfigProperty(name = "mypaybyday.default-currency")
	String defaultCurrency;

	public TimePeriodService(
			TimePeriodRepository timePeriodRepository,
			EventService eventService,
			CategoryService categoryService,
			Messages messages,
			TimePeriodValidator timePeriodValidator,
			DateValidator dateValidator,
			ArchivedItemImporter archivedItemImporter,
			CurrencyBalanceAggregator currencyBalanceAggregator,
			CurrencyValidator currencyValidator) {
		this.timePeriodRepository = timePeriodRepository;
		this.eventService = eventService;
		this.categoryService = categoryService;
		this.messages = messages;
		this.timePeriodValidator = timePeriodValidator;
		this.dateValidator = dateValidator;
		this.archivedItemImporter = archivedItemImporter;
		this.currencyBalanceAggregator = currencyBalanceAggregator;
		this.currencyValidator = currencyValidator;
	}

	/**
	 * The currency a category budget is denominated in: its own when the client states one,
	 * otherwise the period's, and only then the configured default. Each step is a narrower
	 * statement of intent than the next, so the first one present wins.
	 */
	private String budgetCurrency(TimePeriodBudgetDto budgetDto, TimePeriodEntity timePeriod) throws BusinessException {
		String stated = currencyValidator.validateOptional(budgetDto.currency());
		if (stated != null) return stated;
		if (timePeriod.currency != null) return timePeriod.currency;
		return defaultCurrency;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<TimePeriodDto> listAll(int page, int size) {
		long totalElements = timePeriodRepository.count();
		List<TimePeriodDto> content = timePeriodRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(TimePeriodDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public TimePeriodDto findById(Long id) throws BusinessException {
		return TimePeriodDto.from(findTimePeriodEntity(id));
	}

	/**
	* Returns a balance summary for the given time period.
	*
	* <p>Events are associated dynamically: any {@link FinanceEventEntity} whose transaction date
	* falls within [{@code startDate}, {@code endDate}] (both endpoints inclusive) is included.
	*
	* <p>Income is the sum of positive line-item amounts across all {@code INBOUND} events;
	* outbound is the equivalent sum for {@code OUTBOUND} events. {@code OTHER} events are
	* listed in the result but do not contribute to either figure.
	*
	* <p>This method must run inside a transaction so that lazy-loaded line items remain
	* accessible throughout the calculation.
	*/
	@Transactional
	public TimePeriodBalanceDto getBalance(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);

		LocalDateTime from = timePeriod.startDate;
		LocalDateTime to   = timePeriod.endDate;

		List<FinanceEventDto> events = eventService.findByDateRange(from, to);

		return new TimePeriodBalanceDto(
				timePeriod,
				currencyBalanceAggregator.balances(events, timePeriod.budgets),
				events);
	}

	@Transactional
	public DynamicTimePeriodBalanceDto getDynamicBalance(LocalDateTime startDate, LocalDateTime endDate) throws BusinessException {
		if (startDate == null || endDate == null) {
			throw messages.reject(MsgKey.TIME_PERIOD_START_DATE_REQUIRED); // or appropriate generic date message
		}
		dateValidator.validateDateRange(startDate, endDate);

		LocalDateTime from = startDate;
		LocalDateTime to = endDate;

		List<FinanceEventDto> events = eventService.findByDateRange(from, to);

		return new DynamicTimePeriodBalanceDto(
				startDate,
				endDate,
				currencyBalanceAggregator.balances(events, Set.of()),
				events);
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TimePeriodDto create(TimePeriodDto dto) throws BusinessException {
		TimePeriodEntity timePeriod = dto.to();
		if (dto.budgets() != null) {
			for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
				if (budgetDto.category() != null && budgetDto.category().id() != null) {
					CategoryEntity category = categoryService.findEntityById(budgetDto.category().id());
					TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
					budget.timePeriod = timePeriod;
					budget.category = category;
					budget.budgetedAmount = budgetDto.budgetedAmount() != null ? budgetDto.budgetedAmount() : BigDecimal.ZERO;
					budget.currency = budgetCurrency(budgetDto, timePeriod);
					timePeriod.budgets.add(budget);
				}
			}
		}
		validatePeriod(timePeriod);
		timePeriodRepository.persist(timePeriod);
		Log.infof("Created time-period id=%d", timePeriod.id);
		return TimePeriodDto.from(timePeriod);
	}

	@Transactional
	public TimePeriodDto patch(Long id, PatchTimePeriodDto dto) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);

		if (dto.getName().isPresent()) {
			String name = dto.getName().get();
			if (name == null || name.isBlank()) {
				throw messages.reject(MsgKey.TIME_PERIOD_NAME_REQUIRED);
			}
			timePeriod.name = name;
		}
		if (dto.getStartDate().isPresent()) {
			timePeriod.startDate = dto.getStartDate().get();
		}
		if (dto.getEndDate().isPresent()) {
			timePeriod.endDate = dto.getEndDate().get();
		}
		if (dto.getBudgets().isPresent()) {
			timePeriod.budgets.clear();
			List<TimePeriodBudgetDto> budgets = dto.getBudgets().get();
			if (budgets != null) {
				for (TimePeriodBudgetDto budgetDto : budgets) {
					if (budgetDto.category() != null && budgetDto.category().id() != null) {
						CategoryEntity category = categoryService.findEntityById(budgetDto.category().id());
						TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
						budget.timePeriod = timePeriod;
						budget.category = category;
						budget.budgetedAmount = budgetDto.budgetedAmount() != null ? budgetDto.budgetedAmount() : BigDecimal.ZERO;
						budget.currency = budgetCurrency(budgetDto, timePeriod);
						timePeriod.budgets.add(budget);
					}
				}
			}
		}
		if (dto.getSavingsPercentageGoal().isPresent()) {
			timePeriod.savingsPercentageGoal = dto.getSavingsPercentageGoal().get();
		}
		if (dto.getBudgetLimit().isPresent()) {
			timePeriod.budgetLimit = dto.getBudgetLimit().get();
		}
		if (dto.getCurrency().isPresent()) {
			timePeriod.currency = currencyValidator.validateOptional(dto.getCurrency().get());
		}

		validatePeriod(timePeriod);

		Log.infof("Updated time-period id=%d", id);
		return TimePeriodDto.from(timePeriod);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = findTimePeriodEntity(id);
		timePeriodRepository.delete(timePeriod);
		Log.infof("Deleted time-period id=%d", id);
	}

	// -------------------------------------------------------------------------
	// Internal helpers
	// -------------------------------------------------------------------------

	private TimePeriodEntity findTimePeriodEntity(Long id) throws BusinessException {
		TimePeriodEntity timePeriod = timePeriodRepository.findById(id);
		if (timePeriod == null) {
			throw messages.reject(MsgKey.TIME_PERIOD_NOT_FOUND, id);
		}
		return timePeriod;
	}

	private void validatePeriod(TimePeriodEntity tp) throws BusinessException {
		if (tp.name == null || tp.name.isBlank()) {
			throw messages.reject(MsgKey.TIME_PERIOD_NAME_REQUIRED);
		}

		timePeriodValidator.validate(tp);

		if (tp.startDate == null) {
			throw messages.reject(MsgKey.TIME_PERIOD_START_DATE_REQUIRED);
		}
		if (tp.endDate == null) {
			throw messages.reject(MsgKey.TIME_PERIOD_END_DATE_REQUIRED);
		}

		BigDecimal sumOfCategoryBudgets = tp.budgets.stream()
				.map(b -> b.budgetedAmount)
				.reduce(BigDecimal.ZERO, BigDecimal::add);

		// If the user set 'null' means that user doesn't want to set a budget limit.
		// If the user set a value, it must be greater than or equal to the sum of category budgets.
		if (tp.budgetLimit != null && tp.budgetLimit.compareTo(sumOfCategoryBudgets) < 0) {
			throw messages.reject(MsgKey.TIME_PERIOD_BUDGET_LIMIT_MINIMUM, sumOfCategoryBudgets);
		}
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.TIME_PERIODS;
	}

	@Override
	@Transactional
	public long countForExport() {
		return timePeriodRepository.count();
	}

	@Override
	@Transactional
	public List<TimePeriodDto> exportData() {
		return timePeriodRepository.listAll().stream().map(TimePeriodDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<TimePeriodDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, TimePeriodDto::name, dto -> {
			TimePeriodEntity entity = new TimePeriodEntity();
			entity.name = dto.name();
			entity.startDate = dto.startDate();
			entity.endDate = dto.endDate();
			entity.savingsPercentageGoal = dto.savingsPercentageGoal();
			entity.budgetLimit = dto.budgetLimit();
			entity.currency = dto.currency();

			if (dto.budgets() != null) {
				for (TimePeriodBudgetDto budgetDto : dto.budgets()) {
					Long newCategoryId = budgetDto.category() != null
							? context.remap(DataSection.CATEGORIES, budgetDto.category().id())
							: null;
					if (newCategoryId != null) {
						CategoryEntity cat = categoryService.findEntityById(newCategoryId);
						if (cat != null) {
							TimePeriodBudgetEntity budget = new TimePeriodBudgetEntity();
							budget.timePeriod = entity;
							budget.category = cat;
							budget.budgetedAmount = budgetDto.budgetedAmount();
							budget.currency = budgetCurrency(budgetDto, entity);
							entity.budgets.add(budget);
						}
					}
				}
			}
			timePeriodRepository.persist(entity);
			context.rememberId(section(), dto.id(), entity.id);
		});
	}
}
