package com.mypaybyday.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.SectionImportResult;
import com.mypaybyday.dto.TagDto;
import com.mypaybyday.dto.TagGroupDto;
import com.mypaybyday.dto.TagResolveConfig;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.enums.DataSection;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.SubscriptionRepository;
import com.mypaybyday.repository.TagGroupRepository;
import com.mypaybyday.repository.TemplateRepository;
import com.mypaybyday.service.transfer.ArchivedItemImporter;
import com.mypaybyday.service.transfer.DataSectionTransfer;
import com.mypaybyday.service.transfer.ImportContext;
import com.mypaybyday.validation.TagGroupValidator;
import io.quarkus.logging.Log;

@ApplicationScoped
public class TagGroupService implements DataSectionTransfer<TagGroupDto> {

	private final TagGroupRepository tagGroupRepository;
	private final TagService tagService;
	private final Messages messages;
	private final TagGroupValidator tagGroupValidator;
	private final ArchivedItemImporter archivedItemImporter;

	public TagGroupService(
			TagGroupRepository tagGroupRepository,
			TagService tagService,
			Messages messages,
			TagGroupValidator tagGroupValidator,
			TemplateRepository templateRepository,
			SubscriptionRepository subscriptionRepository,
			ArchivedItemImporter archivedItemImporter) {
		this.tagGroupRepository = tagGroupRepository;
		this.tagService = tagService;
		this.messages = messages;
		this.tagGroupValidator = tagGroupValidator;
		this.archivedItemImporter = archivedItemImporter;
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
			throw messages.reject(MsgKey.TAG_GROUP_NOT_FOUND, id);
		}
		if (failIfArchived && entity.archived) {
			throw messages.reject(MsgKey.TAG_GROUP_NOT_FOUND_ARCHIVED, id);
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

	// -------------------------------------------------------------------------
	// Data transfer
	// -------------------------------------------------------------------------

	@Override
	public DataSection section() {
		return DataSection.TAG_GROUPS;
	}

	@Override
	@Transactional
	public long countForExport() {
		return tagGroupRepository.count();
	}

	@Override
	@Transactional
	public List<TagGroupDto> exportData() {
		return tagGroupRepository.listAll().stream().map(TagGroupDto::from).toList();
	}

	@Override
	@Transactional
	public SectionImportResult importData(List<TagGroupDto> items, ImportContext context) {
		return archivedItemImporter.importEach(section(), items, TagGroupDto::name, dto -> {
			TagGroupDto remapped = withRemappedTagIds(dto, context);
			TagGroupEntity entity = new TagGroupEntity();
			entity.archived = dto.archived();
			entity.tags = tagService.resolveTags(new HashSet<>(remapped.tagIds()),
					new TagResolveConfig(TagResolveConfig.Strategy.ALLOW_ALL_ARCHIVED, Set.of()));
			tagGroupValidator.validate(remapped, entity);
			tagGroupRepository.persist(entity);
			context.rememberId(section(), dto.id(), entity.id);
		});
	}

	/**
	 * An archived group carries its members as whole tags, but the validator and the resolver both
	 * work from {@code tagIds} — which the archive never contains, and which point at the source
	 * database anyway. Rebuild them from the ids this import has already assigned.
	 */
	private TagGroupDto withRemappedTagIds(TagGroupDto dto, ImportContext context) {
		List<Long> tagIds = new ArrayList<>();
		for (TagDto tag : dto.tags() != null ? dto.tags() : List.<TagDto>of()) {
			Long importedTagId = context.remap(DataSection.TAGS, tag.id());
			if (importedTagId != null) {
				tagIds.add(importedTagId);
			}
		}
		return new TagGroupDto(dto.id(), dto.name(), dto.description(), dto.icon(), dto.archived(), dto.tags(), tagIds);
	}
}
