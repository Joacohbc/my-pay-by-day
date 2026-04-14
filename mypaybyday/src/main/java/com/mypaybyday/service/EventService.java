package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CategoryBalanceDto;
import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.EventQuery;
import com.mypaybyday.dto.EventQuery.DateField;
import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.PatchEventDto;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.FinanceLineItemEntity;
import com.mypaybyday.entity.FinanceNodeEntity;
import com.mypaybyday.entity.FinanceTransactionEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.enums.EventType;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.validation.EventValidator;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Page;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Service responsible for managing {@link FinanceEventEntity} lifecycle.
 *
 * <p>This service is the single entry point for all Event-related operations.
 * Per the Wrapper Isolation Rule, all {@link FinanceTransactionEntity} and {@link FinanceLineItemEntity}
 * creation/mutation must go through this service — never directly through the
 * operational-layer repositories.
 */
@ApplicationScoped
public class EventService {

	private final EventRepository eventRepository;
	private final TransactionService transactionService;
	private final CategoryService categoryService;
	private final TagService tagService;
	private final Messages messages;
	private final EventValidator eventValidator;
	private final FileService fileService;
	private final DraftService entityDraftService;

	public EventService(
			EventRepository eventRepository,
			TransactionService transactionService,
			CategoryService categoryService,
			TagService tagService,
			Messages messages,
			EventValidator eventValidator,
			FileService fileService,
			DraftService entityDraftService) {
		this.eventRepository = eventRepository;
		this.transactionService = transactionService;
		this.categoryService = categoryService;
		this.tagService = tagService;
		this.messages = messages;
		this.eventValidator = eventValidator;
		this.fileService = fileService;
		this.entityDraftService = entityDraftService;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public PagedResponse<FinanceEventDto> listAll(EventQuery q) {
		StringBuilder query = new StringBuilder("1=1");
		Map<String, Object> params = new HashMap<>();

		DateField dateField = q.dateField() != null ? q.dateField() : DateField.TRANSACTION;
		boolean isInstantField = dateField == DateField.CREATED || dateField == DateField.UPDATED;
		String dateFieldExpr = switch (dateField) {
			case CREATED -> "createdAt";
			case UPDATED -> "updatedAt";
			case TRANSACTION -> "transaction.transactionDate";
		};

		if (q.startDate() != null && !q.startDate().isBlank()) {
			query.append(" and ").append(dateFieldExpr).append(" >= :startDate");
			if (isInstantField) {
				params.put("startDate", LocalDate.parse(q.startDate()).atStartOfDay(ZoneOffset.UTC).toInstant());
			} else {
				params.put("startDate", LocalDate.parse(q.startDate()).atStartOfDay());
			}
		}

		if (q.endDate() != null && !q.endDate().isBlank()) {
			query.append(" and ").append(dateFieldExpr).append(" <= :endDate");
			if (isInstantField) {
				params.put("endDate", LocalDate.parse(q.endDate()).atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC).toInstant());
			} else {
				params.put("endDate", LocalDate.parse(q.endDate()).atTime(LocalTime.MAX));
			}
		}

		if (q.type() != null) {
			query.append(" and type = :type");
			params.put("type", q.type());
		}

		if (q.categoryId() != null) {
			query.append(" and category.id = :categoryId");
			params.put("categoryId", q.categoryId());
		}

		if (q.tagId() != null) {
			query.append(" and exists (select t from Tag t where t.id = :tagId and t member of tags)");
			params.put("tagId", q.tagId());
		}

		query.append(" ORDER BY ").append(dateFieldExpr).append(" DESC");

		PanacheQuery<FinanceEventEntity> panacheQuery = eventRepository.find(query.toString(), params);

		List<FinanceEventEntity> events;

		// If we have an in-memory search, we have to fetch all matches from DB and filter manually
		if (q.search() != null && !q.search().isBlank()) {
			String searchLower = q.search().toLowerCase();
			events = panacheQuery.stream()
					.filter(e -> {
						boolean matchName = e.name != null && e.name.toLowerCase().contains(searchLower);
						boolean matchDesc = e.description != null && e.description.toLowerCase().contains(searchLower);
						boolean matchCat = e.category != null && e.category.name != null && e.category.name.toLowerCase().contains(searchLower);
						return matchName || matchDesc || matchCat;
					})
					.collect(Collectors.toList());

			int totalElements = events.size();

			int start = Math.min(q.page() * q.size(), totalElements);
			int end = Math.min(start + q.size(), totalElements);

			List<FinanceEventDto> content = events.subList(start, end)
					.stream()
					.map(FinanceEventDto::from)
					.toList();

			return PagedResponse.of(content, q.page(), q.size(), totalElements);

		} else {
			// Efficient DB pagination
			long totalElements = panacheQuery.count();
			List<FinanceEventDto> content = panacheQuery
					.page(Page.of(q.page(), q.size()))
					.stream()
					.map(FinanceEventDto::from)
					.toList();
			return PagedResponse.of(content, q.page(), q.size(), totalElements);
		}
	}

	@Transactional
	public FinanceEventDto findById(Long id) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}

		return FinanceEventDto.from(event);
	}

	/**
	* Returns all events whose associated transaction date falls within the given range.
	* This is the mechanism used for Temporal Independence: budget period membership is
	* determined dynamically at query time, never via a hard foreign-key.
	*/
	@Transactional
	public List<FinanceEventDto> findByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		return findEventEntitiesByDateRange(from, to).stream().map(FinanceEventDto::from).toList();
	}

	/**
	* Calculates the balance for a given category within a specified date range.
	* This ensures the AI does not perform the calculation itself.
	*/
	@Transactional
	public CategoryBalanceDto getCategoryBalance(Long categoryId, LocalDateTime from, LocalDateTime to) throws BusinessException {
		CategoryEntity category = categoryService.findEntityById(categoryId);
		List<FinanceEventEntity> events = findEventEntitiesByDateRangeAndCategory(categoryId, from, to);

		BigDecimal income = BigDecimal.ZERO;
		BigDecimal outbound = BigDecimal.ZERO;

		for (FinanceEventEntity event : events) {
			if (event.transaction == null || event.transaction.lineItems == null) {
				continue;
			}

			BigDecimal eventAmount = event.transaction.lineItems.stream()
					.map(li -> li.amount)
					.filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
					.reduce(BigDecimal.ZERO, BigDecimal::add);

			if (event.type == EventType.INBOUND) {
				income = income.add(eventAmount);
			} else if (event.type == EventType.OUTBOUND) {
				outbound = outbound.add(eventAmount);
			}
		}

		return new CategoryBalanceDto(category.id, category.name, income, outbound);
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	/**
	* Creates a new {@link FinanceEventEntity} together with its inner {@link FinanceTransactionEntity}.
	*
	* <p>The caller must supply a fully populated Event that includes a non-null
	* {@link FinanceTransactionEntity} with at least one {@link FinanceLineItemEntity}. The service validates the
	* Zero-Sum Rule before persisting anything.
	*
	* <p>If a {@code category} or {@code tags} are supplied by ID, they are resolved and
	* attached before persistence.
	*
	* @param event the event to create, containing a nested Transaction
	* @return the persisted Event with generated IDs
	*/
	@Transactional
	public FinanceEventDto create(FinanceEventEntity event) throws BusinessException {

		if (event.transaction == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_TRANSACTION_REQUIRED));
		}

		// Delegate to TransactionService
		FinanceTransactionEntity tx = transactionService.create(event.transaction);

		// Resolve CategoryEntity reference (only the ID is trusted from clients)
		if (event.category != null && event.category.id != null) {
			event.category = categoryService.findEntityById(event.category.id);
		}

		// Resolve TagEntity references
		event.tags = resolveTags(event.tags);

		// Resolve File references
		event.files = resolveFiles(event.fileIds);

		event.transaction = tx;

		// TODO: Events should validate: Don't duplicate tags/files. Categories
		eventValidator.validate(event);

		eventRepository.persist(event);
		return FinanceEventDto.from(event);
	}

	/**
	* Updates the metadata, category, tags, and/or transaction of an existing Event.
	*
	* <p>Implements true PATCH semantics via {@link JsonNullable}, which allows
	* distinguishing three states for each field sent from the frontend:
	* <ol>
	*   <li><b>Field absent</b> ({@code isPresent() == false}): the frontend did not include
	*       the field in the body → the current value is left untouched.</li>
	*   <li><b>Field present with a value</b> ({@code isPresent() == true, get() != null}):
	*       the frontend wants to update the field to the new value.</li>
	*   <li><b>Field present as {@code null}</b> ({@code isPresent() == true, get() == null}):
	*       the frontend wants to explicitly clear/remove the field's value.</li>
	* </ol>
	*
	* <p>This distinction is necessary because, with standard Jackson deserialization,
	* an omitted field and a field sent as {@code null} both produce the same result
	* ({@code null} in the DTO), making it impossible to tell whether the frontend intended
	* to clear the value or simply did not send it. {@link JsonNullable} resolves this ambiguity.
	*
	* <p>Updating the transaction replaces its date and all line items atomically.
	* The Zero-Sum Rule is re-validated whenever line items change.
	*
	* @param id    the ID of the Event to update
	* @param patch DTO with only the fields to change (see {@link PatchEventDto})
	* @return the updated, managed Event
	*/
	@Transactional
	public FinanceEventDto update(Long id, PatchEventDto patch) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}

		// --- Metadata ---
		if (patch.getName().isPresent()) {
			String name = patch.getName().get();
			if (name != null && !name.isBlank()) {
				event.name = name;
			}
		}
		if (patch.getDescription().isPresent()) {
			event.description = patch.getDescription().get();
		}

		if (patch.getType().isPresent()) {
			EventType type = patch.getType().get();
			if (type != null) {
				event.type = type;
			}
		}

		// --- CategoryEntity ---
		if (patch.getCategory().isPresent()) {
			CategoryDto catDto = patch.getCategory().get();
			if (catDto == null) {
				event.category = null;
			} else {
				if (catDto.id() == null) {
					throw new BusinessException(messages.get(MsgKey.EVENT_CATEGORY_ID_REQUIRED));
				}
				event.category = categoryService.findEntityById(catDto.id());
			}
		}

		// --- Tags ---
		if (patch.getTags().isPresent()) {
			List<TagDto> tagDtos = patch.getTags().get();
			if (tagDtos == null || tagDtos.isEmpty()) {
				event.tags = new ArrayList<>();
			} else {
				List<TagEntity> resolved = new ArrayList<>();
				for (TagDto tagDto : tagDtos) {
					if (tagDto.id() == null) {
						throw new BusinessException(messages.get(MsgKey.EVENT_TAGS_ID_REQUIRED));
					}
					resolved.add(tagService.findTagEntity(tagDto.id()));
				}
				event.tags = resolved;
			}
		}

		// --- Files ---
		if (patch.getFileIds().isPresent()) {
			List<Long> fileIds = patch.getFileIds().get();
			if (fileIds == null || fileIds.isEmpty()) {
				event.files = new ArrayList<>();
			} else {
				event.files = resolveFiles(fileIds);
			}
		}

		// --- Transaction ---
		if (patch.getTransaction().isPresent() && patch.getTransaction().get() != null) {
			transactionService.update(event.transaction.id, patch.getTransaction().get().toEntity());
		}

		eventValidator.validate(event);

		return FinanceEventDto.from(event);
	}

	/**
	* Permanently deletes an Event and its associated Transaction (cascade).
	*
	* @param id the ID of the Event to delete
	*/
	@Transactional
	public void delete(Long id) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(id);
		if (event == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}
		entityDraftService.deleteByOriginalEntityId(id, EntityType.FINANCE_EVENT);
		eventRepository.delete(event);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	* Internal method used by other services that need managed {@link FinanceEventEntity} entities
	* with their full graph loaded (e.g. {@link TimePeriodService} for balance calculations).
	*/
	private List<FinanceEventEntity> findEventEntitiesByDateRange(LocalDateTime from, LocalDateTime to) throws BusinessException {
		if (from == null || to == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_DATE_RANGE_NULL));
		}
		if (from.isAfter(to)) {
			throw new BusinessException(messages.get(MsgKey.EVENT_DATE_RANGE_INVALID));
		}
		return eventRepository.list(
				"transaction.transactionDate >= ?1 and transaction.transactionDate <= ?2",
				from, to);
	}

	private List<FinanceEventEntity> findEventEntitiesByDateRangeAndCategory(Long categoryId, LocalDateTime from, LocalDateTime to) throws BusinessException {
		if (from == null || to == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_DATE_RANGE_NULL));
		}
		if (from.isAfter(to)) {
			throw new BusinessException(messages.get(MsgKey.EVENT_DATE_RANGE_INVALID));
		}
		return eventRepository.list(
				"category.id = ?1 and transaction.transactionDate >= ?2 and transaction.transactionDate <= ?3",
				categoryId, from, to);
	}

	/**
	* Resolves a list of TagEntity stubs (containing only IDs) into managed TagEntity entities.
	* Returns an empty list if the input is null.
	*/
	private List<TagEntity> resolveTags(List<TagEntity> stubs) throws BusinessException {
		if (stubs == null || stubs.isEmpty()) {
			return new ArrayList<>();
		}
		List<TagEntity> resolved = new ArrayList<>();
		for (TagEntity stub : stubs) {
			if (stub.id == null) {
				throw new BusinessException(messages.get(MsgKey.EVENT_TAGS_ID_REQUIRED));
			}
			resolved.add(tagService.findTagEntity(stub.id));
		}
		return resolved;
	}

	/**
	* Resolves a list of File IDs into managed File entities.
	* Returns an empty list if the input is null.
	*/
	private List<FileEntity> resolveFiles(List<Long> fileIds) throws BusinessException {
		if (fileIds == null || fileIds.isEmpty()) {
			return new ArrayList<>();
		}
		List<FileEntity> resolved = new ArrayList<>();
		for (Long fileId : fileIds) {
			FileEntity file = FileEntity.findById(fileId);
			if (file == null) {
				// TODO: Use messages.get(MsgKey.FILE_NOT_FOUND)
				throw new BusinessException("file.not.found");
			}
			resolved.add(file);
		}
		return resolved;
	}

	/**
	* Merges multiple source events into a single base event.
	*
	* <p>The base event retains its name, description, category, tags, and date.
	* All {@link FinanceLineItemEntity}s from the source events are combined into the
	* base event's {@link FinanceTransactionEntity}. Line items for nodes whose ID is
	* present in {@code groupByNodeIds} are aggregated (summed); all other line items
	* are appended individually, preserving duplicates. Source events are permanently
	* deleted after the merge.
	*
	* <p>All events (base + sources) must share the same {@link EventType}.
	*
	* @param baseEventId    the ID of the event that will absorb the others
	* @param sourceIds      IDs of the events to be merged into the base (must not contain baseEventId)
	* @param groupByNodeIds IDs of FinanceNodes whose amounts should be aggregated; may be null or empty
	* @return the updated base event DTO after the merge
	*/
	@Transactional
	public FinanceEventDto mergeEvents(Long baseEventId, List<Long> sourceIds, List<Long> groupByNodeIds)
			throws BusinessException {
		if (sourceIds == null || sourceIds.isEmpty()) {
			throw new BusinessException(messages.get(MsgKey.EVENT_MERGE_NO_SOURCES));
		}

		FinanceEventEntity baseEvent = eventRepository.findById(baseEventId);
		if (baseEvent == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}

		if (sourceIds.contains(baseEventId)) {
			throw new BusinessException(messages.get(MsgKey.EVENT_MERGE_SELF));
		}

		List<FinanceEventEntity> sourceEvents = validateAndFetchRelatedEvents(sourceIds);
		sourceEvents.sort(Comparator.comparing(e -> e.transaction.transactionDate));

		boolean allSameType = sourceEvents.stream().allMatch(e -> e.type == baseEvent.type);
		if (!allSameType) {
			throw new BusinessException(messages.get(MsgKey.EVENT_MERGE_MIXED_TYPES));
		}

		Set<Long> groupSet = (groupByNodeIds != null) ? new HashSet<>(groupByNodeIds) : new HashSet<>();

		// Collect all line items from base + sources (base first, then sources in date order)
		List<FinanceLineItemEntity> allLineItems = new ArrayList<>();
		if (baseEvent.transaction != null && baseEvent.transaction.lineItems != null) {
			allLineItems.addAll(baseEvent.transaction.lineItems);
		}
		for (FinanceEventEntity source : sourceEvents) {
			if (source.transaction != null && source.transaction.lineItems != null) {
				allLineItems.addAll(source.transaction.lineItems);
			}
		}

		// Aggregate grouped nodes, keep the rest flat
		Map<FinanceNodeEntity, BigDecimal> aggregated = new LinkedHashMap<>();
		List<FinanceLineItemEntity> flat = new ArrayList<>();

		for (FinanceLineItemEntity li : allLineItems) {
			if (li.financeNode == null) continue;
			if (groupSet.contains(li.financeNode.id)) {
				aggregated.merge(li.financeNode, li.amount, BigDecimal::add);
			} else {
				flat.add(li);
			}
		}

		FinanceTransactionEntity baseTransaction = baseEvent.transaction;
		baseTransaction.lineItems.clear();

		for (Map.Entry<FinanceNodeEntity, BigDecimal> entry : aggregated.entrySet()) {
			FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
			lineItem.transaction = baseTransaction;
			lineItem.financeNode = entry.getKey();
			lineItem.amount = entry.getValue();
			baseTransaction.lineItems.add(lineItem);
		}

		for (FinanceLineItemEntity li : flat) {
			FinanceLineItemEntity lineItem = new FinanceLineItemEntity();
			lineItem.transaction = baseTransaction;
			lineItem.financeNode = li.financeNode;
			lineItem.amount = li.amount;
			baseTransaction.lineItems.add(lineItem);
		}

		// Put negative amounts first
		baseTransaction.lineItems.sort(Comparator.comparing(li -> li.amount.signum() >= 0 ? 1 : 0));

		// Break bidirectional relations with external events to prevent Hibernate errors before deletion.
		Set<FinanceEventEntity> sourceSet = new HashSet<>(sourceEvents);
		sourceEvents.stream()
				.flatMap(s -> s.relatedEvents.stream())
				.filter(r -> !sourceSet.contains(r))
				.collect(Collectors.toSet())
				.forEach(r -> r.relatedEvents.removeAll(sourceSet));
		sourceEvents.forEach(s -> s.relatedEvents.clear());

		// Delete related events
		for (FinanceEventEntity source : sourceEvents) {
			entityDraftService.deleteByOriginalEntityId(source.id, EntityType.FINANCE_EVENT);
			eventRepository.delete(source);
		}

		return FinanceEventDto.from(baseEvent);
	}

	/**
	* Adds bidirectional relations between the base event and the given related events.
	*/
	@Transactional
	public FinanceEventDto addRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));

		List<FinanceEventEntity> existingRelated = validateAndFetchRelatedEvents(relatedIds);

		for (FinanceEventEntity related : existingRelated) {
			if (related.id.equals(eventId)) continue;
			event.relatedEvents.add(related);
			related.relatedEvents.add(event);
		}

		return FinanceEventDto.from(event);
	}

	/**
	* Removes bidirectional relations between the base event and the given related events.
	*/
	@Transactional
	public FinanceEventDto removeRelations(Long eventId, List<Long> relatedIds) throws BusinessException {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) {
			throw new BusinessException(messages.get(MsgKey.EVENT_NOT_FOUND));
		}

		List<FinanceEventEntity> existingRelated = validateAndFetchRelatedEvents(relatedIds);

		for (FinanceEventEntity related : existingRelated) {
			if (related.id.equals(eventId)) continue;
			event.relatedEvents.remove(related);
			related.relatedEvents.remove(event);
		}

		return FinanceEventDto.from(event);
	}

	@Transactional
	public FinanceEventDto removeRelation(Long eventId, Long relatedId) throws BusinessException {
		return removeRelations(eventId, List.of(relatedId));
	}

	private List<FinanceEventEntity> validateAndFetchRelatedEvents(List<Long> relatedIds) throws BusinessException {
		List<FinanceEventEntity> found = eventRepository.list("id IN ?1", relatedIds);
		if (found.size() != relatedIds.size()) {
			throw new BusinessException(messages.get(MsgKey.EVENT_RELATED_NOT_FOUND));
		}
		return found;
	}
}
