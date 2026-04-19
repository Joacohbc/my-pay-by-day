package com.mypaybyday.service;

import java.util.List;
import java.util.Set;
import java.util.HashSet;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.TagGroupRepository;
import com.mypaybyday.validation.TagGroupValidator;
import io.quarkus.panache.common.Page;

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
			TagGroupValidator tagGroupValidator) {
		this.tagGroupRepository = tagGroupRepository;
		this.tagService = tagService;
		this.messages = messages;
		this.tagGroupValidator = tagGroupValidator;
	}

	@Transactional
	public PagedResponse<TagGroupDto> listAll(int page, int size, Boolean archived) {
		boolean showArchived = Boolean.TRUE.equals(archived);
		long totalElements = tagGroupRepository.count("archived = ?1", showArchived);
		List<TagGroupDto> content = tagGroupRepository.find("archived = ?1", showArchived)
				.page(Page.of(page, size))
				.stream()
				.map(TagGroupDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
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
		tagGroupValidator.validate(dto, entity);
		entity.tags = resolveTags(dto.tagIds());

		tagGroupRepository.persist(entity);
		return TagGroupDto.from(entity);
	}

	@Transactional
	public TagGroupDto update(Long id, TagGroupDto dto) throws BusinessException {
		TagGroupEntity entity = findEntity(id);
		tagGroupValidator.validate(dto, entity);
		entity.tags = resolveTags(dto.tagIds());

		return TagGroupDto.from(entity);
	}

	@Transactional
	public void archive(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		entity.archived = true;
	}

	@Transactional
	public void unarchive(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		entity.archived = false;
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TagGroupEntity entity = findEntityById(id, false);
		tagGroupRepository.delete(entity);
	}

	private Set<TagEntity> resolveTags(List<Long> tagIds) throws BusinessException {
		Set<TagEntity> resolved = new HashSet<>();
		if (tagIds != null) {
			for (Long tagId : tagIds) {
				resolved.add(tagService.findTagEntity(tagId));
			}
		}
		return resolved;
	}
}
