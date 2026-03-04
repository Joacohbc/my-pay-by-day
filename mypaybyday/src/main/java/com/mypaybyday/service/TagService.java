package com.mypaybyday.service;

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

    public List<Tag> listAll() {
        return tagRepository.listAll();
    }

    public Tag findById(Long id) throws BusinessException {
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
    public Tag create(Tag tag) throws BusinessException {
        if (tag.name == null || tag.name.isBlank()) {
            throw new BusinessException("Tag name must not be blank");
        }
        tagRepository.persist(tag);
        return tag;
    }

    @Transactional
    public Tag update(Long id, Tag tagDetails) throws BusinessException {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            throw new BusinessException("Tag not found: " + id);
        }
        if (tagDetails.name == null || tagDetails.name.isBlank()) {
            throw new BusinessException("Tag name must not be blank");
        }
        tag.name = tagDetails.name;
        tag.description = tagDetails.description;
        return tag;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Tag tag = tagRepository.findById(id);
        if (tag == null) {
            throw new BusinessException("Tag not found: " + id);
        }
        tagRepository.delete(tag);
    }
}
