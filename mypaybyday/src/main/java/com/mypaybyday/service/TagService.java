package com.mypaybyday.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagGroupRepository;
import com.mypaybyday.repository.TagRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.service.duplicate.DuplicateDetectionEvent;
import com.mypaybyday.validation.TagValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class TagService {

	private final TagRepository tagRepository;
	private final Event<DuplicateDetectionEvent> duplicateDetectionEventBus;
	private final Messages messages;
	private final TagValidator tagValidator;
	private final EventRepository eventRepository;
	private final TemplateRepository templateRepository;
	private final SubscriptionRepository subscriptionRepository;
	private final TagGroupRepository tagGroupRepository;

	public TagService(
			TagRepository tagRepository,
			Messages messages,
			TagValidator tagValidator,
			EventRepository eventRepository,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository,
			Event<DuplicateDetectionEvent> duplicateDetectionEventBus,
			TagGroupRepository tagGroupRepository) {
		this.tagRepository = tagRepository;
		this.duplicateDetectionEventBus = duplicateDetectionEventBus;
		this.messages = messages;
		this.tagValidator = tagValidator;
		this.eventRepository = eventRepository;
		this.templateRepository = templateRepository;
		this.subscriptionRepository = subscriptionRepository;
		this.tagGroupRepository = tagGroupRepository;
	}

	// -------------------------------------------------------------------------
	// Queries
	// -------------------------------------------------------------------------

	@Transactional
	public List<TagDto> listAll(Boolean archived) {
		boolean showArchived = Boolean.TRUE.equals(archived);
		return tagRepository.find("archived = ?1", showArchived)
				.stream()
				.map(TagDto::from)
				.toList();
	}

	@Transactional
	public TagDto findById(Long id) throws BusinessException {
		return TagDto.from(findTagEntity(id, false));
	}

	/**
	 * Internal method used by other services that need a managed {@link TagEntity} entity.
	 * Throws if the tag is archived — archived tags cannot be used in new events.
	 */
	public TagEntity findTagEntity(Long id) throws BusinessException {
		return findTagEntity(id, true);
	}

	TagEntity findTagEntity(Long id, boolean failIfArchived) throws BusinessException {
		TagEntity tag = tagRepository.findById(id);
		if (tag == null) {
			throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND, id));
		}
		if (failIfArchived && tag.archived) {
			throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND_ARCHIVED, id));
		}
		return tag;
	}

	Set<TagEntity> findTagEntitiesBulk(Set<Long> tagIds, boolean failIfArchived) throws BusinessException {
		if (tagIds == null || tagIds.isEmpty()) {
			return Set.of();
		}

		List<TagEntity> foundTags = tagRepository.list("id IN ?1", tagIds);
		if (foundTags.size() != tagIds.size()) {
			Set<Long> foundIds = foundTags.stream().map(tag -> tag.id).collect(Collectors.toSet());
			Long missingId = tagIds.stream().filter(tagId -> !foundIds.contains(tagId)).findFirst().orElse(null);
			throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND, missingId));
		}

		if (failIfArchived) {
			foundTags.stream().filter(TagEntity::isArchived)
			.findFirst()
			.ifPresent(archivedTag -> {
				throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND_ARCHIVED, archivedTag.id));
			});
		}

		return foundTags.stream().collect(Collectors.toSet());
	}

	/**
	 * Resolves a list of Tag DTOs into managed {@link TagEntity} entities based on the provided configuration.
	 */
	@Transactional
	public Set<TagEntity> resolveTags(List<TagDto> tagDtos, TagResolveConfig config) throws BusinessException {
		if (tagDtos == null || tagDtos.isEmpty()) {
			return new HashSet<>();
		}

		Set<Long> requestedTagIds = new HashSet<>();
		for (TagDto tagDto : tagDtos) {
			if (tagDto.id() == null) {
				throw new BusinessException(messages.get(MsgKey.EVENT_TAGS_ID_REQUIRED));
			}
			requestedTagIds.add(tagDto.id());
		}

		return resolveTags(requestedTagIds, config);
	}

	@Transactional
	public Set<TagEntity> resolveTags(Set<Long> requestedTagIds, TagResolveConfig config) throws BusinessException {
		if (requestedTagIds == null || requestedTagIds.isEmpty()) {
			return new HashSet<>();
		}

		if (config == null) {
			config = TagResolveConfig.forNewEntity();
		}

		if(config.strategy() == TagResolveConfig.Strategy.ALLOW_ALL_ARCHIVED) {
			return findTagEntitiesBulk(requestedTagIds, false);
		}

		if(config.strategy() == TagResolveConfig.Strategy.NOT_ALLOW_ARCHIVED) {
			return findTagEntitiesBulk(requestedTagIds, true);
		}

		// Fetch all requested tags without failing if archived yet
		Set<TagEntity> newTagEntities = findTagEntitiesBulk(requestedTagIds, false);

		if (config.strategy() == TagResolveConfig.Strategy.ALLOW_ONLY_EXISTING_ARCHIVED) {
			Set<Long> existingIds = config.existingTagIds();
			newTagEntities.stream()
					.filter(t -> t.archived && !existingIds.contains(t.id))
					.findFirst()
					.ifPresent(archivedTag -> {
						throw new BusinessException(messages.get(MsgKey.TAG_NOT_FOUND_ARCHIVED, archivedTag.id));
					});
		}

		return newTagEntities;
	}

	// -------------------------------------------------------------------------
	// Commands
	// -------------------------------------------------------------------------

	@Transactional
	public TagDto create(TagDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TAG_NAME_REQUIRED));
		}
		TagEntity tag = new TagEntity();
		tag.name = dto.name();
		tag.description = dto.description();
		tag.color = dto.color();

		tagValidator.validate(tag);

		tagRepository.persist(tag);
		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forTag(tag.id));
		Log.infof("Created tag id=%d", tag.id);
		return TagDto.from(tag);
	}

	@Transactional
	public TagDto update(Long id, TagDto dto) throws BusinessException {
		TagEntity tag = findTagEntity(id);
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TAG_NAME_REQUIRED));
		}
		tag.name = dto.name();
		tag.description = dto.description();
		tag.color = dto.color();

		tagValidator.validate(tag);

		duplicateDetectionEventBus.fireAsync(DuplicateDetectionEvent.forTag(id));
		Log.infof("Updated tag id=%d", id);
		return TagDto.from(tag);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		TagEntity tag = findTagEntity(id, false);

		boolean inUseForRecurring = templateRepository.countByTag(tag) > 0
				|| subscriptionRepository.countByTag(tag) > 0
				|| tagGroupRepository.countByTag(tag) > 0;

		if (inUseForRecurring) {
			Log.warnf("Archive rejected: tag id=%d is in use by templates/subscriptions/tag-groups", id);
			throw new BusinessException(messages.get(MsgKey.TAG_ARCHIVE_IN_USE));
		}

		tag.archived = true;
		Log.infof("Archived tag id=%d", id);
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		TagEntity tag = findTagEntity(id, false);
		tag.archived = false;
		Log.infof("Unarchived tag id=%d", id);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TagEntity tag = findTagEntity(id, false);

		boolean inUse = eventRepository.countByTag(tag) > 0
				|| templateRepository.countByTag(tag) > 0
				|| subscriptionRepository.countByTag(tag) > 0
				|| tagGroupRepository.countByTag(tag) > 0;

		if (inUse) {
			Log.warnf("Delete rejected: tag id=%d is in use", id);
			throw new BusinessException(messages.get(MsgKey.TAG_IN_USE));
		}

		tagRepository.delete(tag);
		Log.infof("Deleted tag id=%d", id);
	}

}
