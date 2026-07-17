package com.mypaybyday.service;

import java.util.HashSet;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagGroupRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.validation.TagGroupValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class TagGroupService {

	private final TagGroupRepository tagGroupRepository;
	private final TagService tagService;
	private final Messages messages;
	private final TagGroupValidator tagGroupValidator;

	public TagGroupService(
			TagGroupRepository tagGroupRepository,
			TagService tagService,
			Messages messages,
			TagGroupValidator tagGroupValidator,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository) {
		this.tagGroupRepository = tagGroupRepository;
		this.tagService = tagService;
		this.messages = messages;
		this.tagGroupValidator = tagGroupValidator;;
	}

	@Transactional
	public List<TagGroupDto> listAll(Boolean archived) {
		boolean showArchived = Boolean.TRUE.equals(archived);
		return tagGroupRepository.find("archived = ?1", showArchived)
				.stream()
				.map(TagGroupDto::from)
				.toList();
	}

	@Transactional
	public TagGroupDto findById(Long id) throws BusinessException {
		return TagGroupDto.from(findEntityById(id, false));
	}

	TagGroupEntity findEntity(Long id) throws BusinessException {
		return findEntityById(id, true);
	}

	private TagGroupEntity findEntityById(Long id, boolean failIfArchived) throws BusinessException {
		TagGroupEntity entity = tagGroupRepository.findById(id);
		if (entity == null) {
			throw new BusinessException(messages.get(MsgKey.TAG_GROUP_NOT_FOUND, id));
		}
		if (failIfArchived && entity.archived) {
			throw new BusinessException(messages.get(MsgKey.TAG_GROUP_NOT_FOUND_ARCHIVED, id));
		}
		return entity;
	}

	@Transactional
	public TagGroupDto create(TagGroupDto dto) throws BusinessException {
		TagGroupEntity entity = new TagGroupEntity();
		entity.tags = tagService.resolveTags(dto.tags(), TagResolveConfig.forNewEntity());
		tagGroupValidator.validate(dto, entity);

		tagGroupRepository.persist(entity);
		Log.infof("Created tag-group id=%d tags=%d", entity.id, entity.tags.size());
		return TagGroupDto.from(entity);
	}

	@Transactional
	public TagGroupDto update(Long id, TagGroupDto dto) throws BusinessException {
		TagGroupEntity entity = findEntity(id);
		entity.tags = tagService.resolveTags(new HashSet<>(dto.tagIds()), TagResolveConfig.forNewEntity());
		tagGroupValidator.validate(dto, entity);

		Log.infof("Updated tag-group id=%d tags=%d", id, entity.tags.size());
		return TagGroupDto.from(entity);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		entity.archived = true;
		Log.infof("Archived tag-group id=%d", id);
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		entity.archived = false;
		Log.infof("Unarchived tag-group id=%d", id);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		tagGroupRepository.delete(entity);
		Log.infof("Deleted tag-group id=%d", id);
	}
}
