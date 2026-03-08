package com.mypaybyday.service;

import com.mypaybyday.dto.TagDto;
import com.mypaybyday.entity.Tag;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.TagRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class TagService {

    @Inject
    TagRepository tagRepository;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<TagDto> listAll() {
        return tagRepository.listAll().stream().map(TagDto::from).toList();
    }

    public TagDto findById(Long id) throws BusinessException {
        return TagDto.from(findTagEntity(id));
    }

    /**
     * Internal method used by other services that need a managed {@link Tag} entity
     * (e.g. {@link EventService} when resolving tag references).
     */
    Tag findTagEntity(Long id) throws BusinessException {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            throw new BusinessException("Tag not found: " + id);
        }
        return tag;
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public TagDto create(TagDto dto) throws BusinessException {
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException("Tag name must not be blank");
        }
        Tag tag = new Tag();
        tag.name = dto.name();
        tag.description = dto.description();
        tagRepository.persist(tag);
        return TagDto.from(tag);
    }

    @Transactional
    public TagDto update(Long id, TagDto dto) throws BusinessException {
        Tag tag = findTagEntity(id);
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException("Tag name must not be blank");
        }
        tag.name = dto.name();
        tag.description = dto.description();
        return TagDto.from(tag);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Tag tag = findTagEntity(id);
        tagRepository.delete(tag);
    }
}
