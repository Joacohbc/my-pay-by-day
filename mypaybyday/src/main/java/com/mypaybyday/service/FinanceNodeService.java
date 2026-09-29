package com.mypaybyday.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceNodeDto;
import com.mypaybyday.dto.MoneyDto;
import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.TransactionConversionDto;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.enums.FinanceNodeType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.FinanceNodeRepository;
import com.mypaybyday.repository.LineItemRepository;
import com.mypaybyday.service.currency.DisplayCurrency;
import com.mypaybyday.service.currency.DisplayCurrencyService;
import com.mypaybyday.service.event.TransactionService;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.FinanceNodeValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class FinanceNodeService implements DataSectionTransfer<FinanceNodeDto> {

	private final FinanceNodeRepository financeNodeRepository;
	private final LineItemRepository lineItemRepository;
	private final Messages messages;
	private final FinanceNodeValidator financeNodeValidator;
	private final ArchivedItemImporter archivedItemImporter;
	private final DisplayCurrencyService displayCurrencyService;

	public FinanceNodeService(
			FinanceNodeRepository financeNodeRepository,
			LineItemRepository lineItemRepository,
			Messages messages,
			FinanceNodeValidator financeNodeValidator,
			ArchivedItemImporter archivedItemImporter,
			DisplayCurrencyService displayCurrencyService) {
		this.financeNodeRepository = financeNodeRepository;
		this.lineItemRepository = lineItemRepository;
		this.messages = messages;
		this.financeNodeValidator = financeNodeValidator;
		this.archivedItemImporter = archivedItemImporter;
		this.displayCurrencyService = displayCurrencyService;
	}

	@Transactional
	public List<FinanceNodeDto> listAll(Boolean archived, FinanceNodeType type) {
		StringBuilder queryBuilder = new StringBuilder();
		List<Object> params = new ArrayList<>();

		if (archived == null || !archived) {
			queryBuilder.append("archived = ?").append(params.size() + 1);
			params.add(false);
		}

		if (type != null) {
			if (queryBuilder.length() > 0) {
				queryBuilder.append(" and ");
			}
			queryBuilder.append("type = ?").append(params.size() + 1);
			params.add(type);
		}

		String query = queryBuilder.toString();
		if (query.isEmpty()) {
			query = "1=1";
		}

		Object[] paramsArray = params.toArray();
		return financeNodeRepository.find(query, paramsArray)
				.stream()
				.map(FinanceNodeDto::from)
				.toList();
	}

	@Transactional
	public FinanceNodeDto findById(Long id) throws BusinessException {
		return FinanceNodeDto.from(findNodeEntity(id));
	}

	/**
	* Internal method used by other services that need a managed
	* {@link FinanceNodeEntity} entity
	* (e.g. {@link TransactionService} when resolving node references on line
	* items).
	*/
	FinanceNodeEntity findNodeEntity(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND_ARCHIVED, id);
		}
		return node;
	}

	@Transactional
	public FinanceNodeDto create(FinanceNodeDto dto) throws BusinessException {
		FinanceNodeEntity node = new FinanceNodeEntity();
		node.name = dto.name();
		node.type = dto.type();
		node.description = dto.description();
		node.icon = dto.icon();
		node.color = dto.color();
		node.currency = dto.currency();

		financeNodeValidator.validate(node);

		financeNodeRepository.persist(node);
		Log.infof("Created finance-node id=%d type=%s", node.id, node.type);
		return FinanceNodeDto.from(node);
	}

	@Transactional
	public FinanceNodeDto update(Long id, FinanceNodeDto dto) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null || node.archived) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND_ARCHIVED_GENERIC);
		}
		node.name = dto.name();
		node.type = dto.type();
		node.description = dto.description();
		node.icon = dto.icon();
		node.color = dto.color();
		node.currency = dto.currency();

		financeNodeValidator.validate(node);

		Log.infof("Updated finance-node id=%d", id);
		return FinanceNodeDto.from(node);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			Log.warnf("Archive rejected: finance-node id=%d is in use by templates/subscriptions", id);
			throw messages.reject(MsgKey.NODE_ARCHIVE_IN_USE);
		}

		// It's always allowed to archive, we just don't physically delete
		node.archived = true;
		Log.infof("Archived finance-node id=%d", id);
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}
		node.archived = false;
		Log.infof("Unarchived finance-node id=%d", id);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		boolean inUseForRecurring = financeNodeRepository.countInTemplates(node) > 0
				|| financeNodeRepository.countInSubscriptions(node) > 0;

		if (inUseForRecurring) {
			Log.warnf("Delete rejected: finance-node id=%d is in use by templates/subscriptions", id);
			throw messages.reject(MsgKey.NODE_ARCHIVE_IN_USE);
		}

		long txCount = lineItemRepository.count("financeNode", node);
		if (txCount > 0) {
			Log.warnf("Delete rejected: finance-node id=%d has %d line items", id, txCount);
			throw messages.reject(MsgKey.NODE_HAS_TRANSACTIONS);
		}
		financeNodeRepository.delete(node);
		Log.infof("Deleted finance-node id=%d", id);
	}

	/**
	 * Sums every line item touching this node.
	 *
	 * <p>Positive amounts add to the balance and negative ones subtract, following how the
	 * movement was registered. With no display currency the result has one entry per currency the
	 * node has held. With a principal display currency every movement is converted with the rate
	 * frozen on its transaction; movements that hold no such rate yet stay in their own currency as
	 * separate entries, rather than being dropped from the balance. With any other display currency
	 * only movements recorded in it count.
	 *
	 * @param displayCurrency the currency to report in, or {@code null} for one entry per currency
	 * @return balances with the display currency first, then by descending absolute value
	 */
	@Transactional
	public List<MoneyDto> calculateBalance(Long id, String displayCurrency) throws BusinessException {
		FinanceNodeEntity node = financeNodeRepository.findById(id);
		if (node == null) {
			throw messages.reject(MsgKey.NODE_NOT_FOUND);
		}

		DisplayCurrency display = displayCurrencyService.resolve(displayCurrency);
		Map<String, BigDecimal> totalByCurrency = new LinkedHashMap<>();
		for (FinanceLineItemEntity lineItem : lineItemRepository.find("financeNode", node).stream().toList()) {
			if (lineItem.currency == null) continue;
			accumulateLineItem(totalByCurrency, lineItem, display);
		}

		Log.debugf("Calculated balance for finance-node id=%d across %d currencies", id.longValue(), totalByCurrency.size());
		Comparator<MoneyDto> displayCurrencyFirst = Comparator.comparing(
				(MoneyDto money) -> !money.currency().equals(display.code()));
		return totalByCurrency.entrySet().stream()
				.map(entry -> new MoneyDto(entry.getValue(), entry.getKey()))
				.sorted(displayCurrencyFirst.thenComparing(
						Comparator.comparing((MoneyDto money) -> money.amount().abs()).reversed()))
				.toList();
	}

	private void accumulateLineItem(Map<String, BigDecimal> totalByCurrency, FinanceLineItemEntity lineItem,
			DisplayCurrency display) {
		Map<String, BigDecimal> frozenRates = new HashMap<>();
		lineItem.transaction.conversions.forEach(conversion -> frozenRates.put(conversion.currency, conversion.rate));

		Optional<BigDecimal> rate = display.rateFor(lineItem.currency, frozenRates);
		if (rate.isEmpty()) {
			boolean keepsUnconvertedRemainder = display.mode() == DisplayCurrency.Mode.CONVERTED;
			if (keepsUnconvertedRemainder) {
				totalByCurrency.merge(lineItem.currency, lineItem.amount, BigDecimal::add);
			}
			return;
		}

		String bucket = display.bucketFor(lineItem.currency);
		BigDecimal amount = bucket.equals(lineItem.currency)
				? lineItem.amount
				: TransactionConversionDto.convert(lineItem.amount, rate.get(), bucket);
		totalByCurrency.merge(bucket, amount, BigDecimal::add);
	}

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.FINANCE_NODES;
	}

	@Override
	@Transactional
	public long countForExport() {
		return financeNodeRepository.count();
	}

	@Override
	@Transactional
	public List<FinanceNodeDto> exportData() {
		return financeNodeRepository.listAll().stream().map(FinanceNodeDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<FinanceNodeDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, FinanceNodeDto::name, dto -> {
			FinanceNodeEntity node = new FinanceNodeEntity();
			node.name = dto.name();
			node.type = dto.type();
			node.description = dto.description();
			node.icon = dto.icon();
			node.color = dto.color();
			node.archived = dto.archived();
			node.currency = dto.currency();
			financeNodeValidator.validate(node);
			financeNodeRepository.persist(node);
			context.rememberId(section(), dto.id(), node.id);
		});
	}
}
