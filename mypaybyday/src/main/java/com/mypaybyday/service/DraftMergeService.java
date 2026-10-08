package com.mypaybyday.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.FinanceEventDto;
import com.mypaybyday.dto.MergeEventsRequestDto;
import com.mypaybyday.dto.MergePreviewDto;
import com.mypaybyday.dto.ValidationErrorDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.service.event.EventCreateService;
import com.mypaybyday.service.event.EventMergeComposer;
import com.mypaybyday.service.event.TransientFinanceEvent;
import io.quarkus.logging.Log;

/**
 * Merges several finance event drafts into one new event, under the same rules and preview as
 * merging events. Only freestanding drafts can take part: one that edits an existing event or
 * belongs to a payment plan already has a place in the ledger that a merge would silently drop.
 */
@ApplicationScoped
public class DraftMergeService {

	private record DraftMerge(FinanceEventDto baseDraft, List<FinanceEventDto> sourceDrafts) {

		Stream<FinanceEventDto> allDrafts() {
			return Stream.concat(Stream.of(baseDraft), sourceDrafts.stream());
		}
	}

	private final DraftService draftService;
	private final EventMergeComposer composer;
	private final EventCreateService eventCreateService;
	private final Messages messages;

	public DraftMergeService(
			DraftService draftService,
			EventMergeComposer composer,
			EventCreateService eventCreateService,
			Messages messages) {
		this.draftService = draftService;
		this.composer = composer;
		this.eventCreateService = eventCreateService;
		this.messages = messages;
	}

	/**
	 * Works out the event merging the drafts would create, persisting nothing.
	 *
	 * @throws BusinessException if a draft does not exist, or the request names no sources or the
	 *                           base among them
	 */
	@Transactional
	public MergePreviewDto previewMerge(Long baseDraftId, MergeEventsRequestDto request) throws BusinessException {
		return preview(findDrafts(baseDraftId, request), request);
	}

	/**
	 * Creates one event out of the base draft and the source drafts, then deletes every one of
	 * them. Nothing changes unless every draft and the merged event pass validation.
	 *
	 * @return the created event
	 * @throws BusinessException if a draft does not exist or the merge breaks a rule
	 */
	@Transactional
	public FinanceEventDto mergeDrafts(Long baseDraftId, MergeEventsRequestDto request) throws BusinessException {
		DraftMerge merge = findDrafts(baseDraftId, request);
		MergePreviewDto preview = preview(merge, request);
		if (!preview.valid()) {
			throw messages.reject(MsgKey.EVENT_MERGE_INVALID, preview.describeErrors());
		}

		FinanceEventDto createdEvent = eventCreateService.create(TransientFinanceEvent.from(preview.mergedEvent()));
		merge.allDrafts().forEach(draft -> draftService.delete(draft.draftId()));
		Log.infof("Merged %d drafts into new event id=%d: base=%d sources=%s",
				request.sourceIds.size() + 1, createdEvent.id(), baseDraftId, request.sourceIds);
		return createdEvent;
	}

	private MergePreviewDto preview(DraftMerge merge, MergeEventsRequestDto request) throws BusinessException {
		List<ValidationErrorDto> draftErrors = new ArrayList<>();
		for (FinanceEventDto draft : merge.allDrafts().toList()) {
			draftErrors.addAll(findDraftErrors(draft));
		}
		MergePreviewDto composed = composer.compose(merge.baseDraft(), merge.sourceDrafts(), request);
		List<ValidationErrorDto> errors = Stream.concat(draftErrors.stream(), composed.errors().stream()).toList();
		return new MergePreviewDto(errors.isEmpty(), errors, composed.mergedEvent());
	}

	private List<ValidationErrorDto> findDraftErrors(FinanceEventDto draft) throws BusinessException {
		String draftName = draft.name() != null ? draft.name() : String.valueOf(draft.draftId());
		if (draft.id() != null) {
			return List.of(sourceError(messages.get(MsgKey.DRAFT_MERGE_LINKED_TO_EVENT, draftName)));
		}
		if (draft.paymentPlanId() != null) {
			return List.of(sourceError(messages.get(MsgKey.DRAFT_MERGE_IN_PAYMENT_PLAN, draftName)));
		}
		return draftService.validateDraft(draft.draftId()).errors().stream()
				.map(error -> sourceError(messages.get(MsgKey.DRAFT_MERGE_SOURCE_INVALID, draftName, error.message())))
				.toList();
	}

	private static ValidationErrorDto sourceError(String message) {
		return new ValidationErrorDto(ValidationErrorDto.SOURCES_FIELD, message);
	}

	private DraftMerge findDrafts(Long baseDraftId, MergeEventsRequestDto request) throws BusinessException {
		if (request.sourceIds == null || request.sourceIds.isEmpty()) {
			throw messages.reject(MsgKey.EVENT_MERGE_NO_SOURCES);
		}
		if (request.sourceIds.contains(baseDraftId)) {
			throw messages.reject(MsgKey.EVENT_MERGE_SELF);
		}
		Map<Long, FinanceEventDto> draftsById = draftService.listFinanceEventDrafts().stream()
				.collect(Collectors.toMap(FinanceEventDto::draftId, Function.identity()));
		List<FinanceEventDto> sourceDrafts = new ArrayList<>();
		for (Long sourceDraftId : request.sourceIds) {
			sourceDrafts.add(requireDraft(draftsById, sourceDraftId));
		}
		return new DraftMerge(requireDraft(draftsById, baseDraftId), sourceDrafts);
	}

	private FinanceEventDto requireDraft(Map<Long, FinanceEventDto> draftsById, Long draftId) throws BusinessException {
		FinanceEventDto draft = draftsById.get(draftId);
		if (draft == null) {
			throw messages.reject(MsgKey.DRAFT_NOT_FOUND, draftId);
		}
		return draft;
	}
}
