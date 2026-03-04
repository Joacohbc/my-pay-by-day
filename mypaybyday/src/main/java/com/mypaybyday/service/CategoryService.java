package com.mypaybyday.service;

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

    public List<Category> listAll() {
        return categoryRepository.listAll();
    }

    public Category findById(Long id) throws BusinessException {
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
    public Category create(Category category) throws BusinessException {
        if (category.name == null || category.name.isBlank()) {
            throw new BusinessException("Category name must not be blank");
        }
        categoryRepository.persist(category);
        return category;
    }

    @Transactional
    public Category update(Long id, Category categoryDetails) throws BusinessException {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            throw new BusinessException("Category not found: " + id);
        }
        if (categoryDetails.name == null || categoryDetails.name.isBlank()) {
            throw new BusinessException("Category name must not be blank");
        }
        category.name = categoryDetails.name;
        category.description = categoryDetails.description;
        return category;
    }

    @Transactional
    public void delete(Long id) throws BusinessException {
        Category category = categoryRepository.findById(id);
        if (category == null) {
            throw new BusinessException("Category not found: " + id);
        }
        categoryRepository.delete(category);
    }
}
