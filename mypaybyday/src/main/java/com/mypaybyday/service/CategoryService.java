package com.mypaybyday.service;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.Category;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.repository.CategoryRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class CategoryService {

    @Inject
    CategoryRepository categoryRepository;

    @Inject
    Messages messages;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    @Transactional
    public PagedResponse<CategoryDto> listAll(int page, int size) {
        long totalElements = categoryRepository.count();
        List<CategoryDto> content = categoryRepository.findAll()
                .page(Page.of(page, size))
                .stream()
                .map(CategoryDto::from)
                .toList();
        return PagedResponse.of(content, page, size, totalElements);
    }

    @Transactional
    public CategoryDto findById(Long id) throws BusinessException {
        return CategoryDto.from(findEntityById(id));
    }

    /**
     * Internal method used by other services that need a managed {@link Category} entity
     * (e.g. {@link EventService} when resolving a category reference).
     */
    Category findEntityById(Long id) throws BusinessException {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            throw new BusinessException(messages.get(MsgKey.CATEGORY_NOT_FOUND, id));
        }
        return category;
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public CategoryDto create(CategoryDto dto) throws BusinessException {
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException(messages.get(MsgKey.CATEGORY_NAME_REQUIRED));
        }
        Category category = new Category();
        category.name = dto.name();
        category.description = dto.description();
        categoryRepository.persist(category);
        return CategoryDto.from(category);
    }

    @Transactional
    public CategoryDto update(Long id, CategoryDto dto) throws BusinessException {
        Category category = findEntityById(id);
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException(messages.get(MsgKey.CATEGORY_NAME_REQUIRED));
        }
        category.name = dto.name();
        category.description = dto.description();
        return CategoryDto.from(category);
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Category category = findEntityById(id);
        categoryRepository.delete(category);
    }
}
