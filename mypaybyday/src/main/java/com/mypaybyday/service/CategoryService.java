package com.mypaybyday.service;

import com.mypaybyday.dto.CategoryDto;
import com.mypaybyday.entity.Category;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.CategoryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import java.util.List;

@ApplicationScoped
public class CategoryService {

    @Inject
    CategoryRepository categoryRepository;

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    public List<CategoryDto> listAll() {
        return categoryRepository.listAll().stream().map(CategoryDto::from).toList();
    }

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
            throw new BusinessException("Category not found: " + id);
        }
        return category;
    }

    // -------------------------------------------------------------------------
    // Commands
    // -------------------------------------------------------------------------

    @Transactional
    public CategoryDto create(CategoryDto dto) throws BusinessException {
        if (dto.name() == null || dto.name().isBlank()) {
            throw new BusinessException("Category name must not be blank");
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
            throw new BusinessException("Category name must not be blank");
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
