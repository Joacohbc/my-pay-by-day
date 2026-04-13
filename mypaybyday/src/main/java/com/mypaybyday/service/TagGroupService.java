package com.mypaybyday.service;

import java.util.ArrayList;
import java.util.List;

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
import io.quarkus.panache.common.Page;

@ApplicationScoped
public class TagGroupService {

	private final TagGroupRepository tagGroupRepository;
	private final TagService tagService;
	private final Messages messages;

	public TagGroupService(
			TagGroupRepository tagGroupRepository,
			TagService tagService,
			Messages messages) {
		this.tagGroupRepository = tagGroupRepository;
		this.tagService = tagService;
		this.messages = messages;
	}

	@Transactional
	public PagedResponse<TagGroupDto> listAll(int page, int size) {
		long totalElements = tagGroupRepository.count();
		List<TagGroupDto> content = tagGroupRepository.findAll()
				.page(Page.of(page, size))
				.stream()
				.map(TagGroupDto::from)
				.toList();
		return PagedResponse.of(content, page, size, totalElements);
	}

	@Transactional
	public TagGroupDto findById(Long id) throws BusinessException {
		return TagGroupDto.from(findEntity(id));
	}

	private TagGroupEntity findEntity(Long id) throws BusinessException {
		TagGroupEntity entity = tagGroupRepository.findById(id);
		if (entity == null) {
			throw new BusinessException(messages.get(MsgKey.TAG_GROUP_NOT_FOUND, id));
		}
		return entity;
	}

	@Transactional
	public TagGroupDto create(TagGroupDto dto) throws BusinessException {
		validate(dto);

		TagGroupEntity entity = new TagGroupEntity();
		entity.name = dto.name();
		entity.description = dto.description();
		entity.icon = dto.icon();
		entity.tags = resolveTags(dto.tagIds());

		tagGroupRepository.persist(entity);
		return TagGroupDto.from(entity);
	}

	@Transactional
	public TagGroupDto update(Long id, TagGroupDto dto) throws BusinessException {
		validate(dto);

		TagGroupEntity entity = findEntity(id);
		entity.name = dto.name();
		entity.description = dto.description();
		entity.icon = dto.icon();
		entity.tags = resolveTags(dto.tagIds());

		return TagGroupDto.from(entity);
	}

	@Transactional
	public void delete(Long id) throws BusinessException {
		TagGroupEntity entity = findEntity(id);
		tagGroupRepository.delete(entity);
	}

	private void validate(TagGroupDto dto) throws BusinessException {
		if (dto.name() == null || dto.name().isBlank()) {
			throw new BusinessException(messages.get(MsgKey.TAG_GROUP_NAME_REQUIRED));
		}
	}

	private List<TagEntity> resolveTags(List<Long> tagIds) throws BusinessException {
		List<TagEntity> resolved = new ArrayList<>();
		if (tagIds != null) {
			for (Long tagId : tagIds) {
				resolved.add(tagService.findTagEntity(tagId));
			}
		}
		return resolved;
	}
}
