package com.mypaybyday.service.duplicate;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import java.util.Map;
import java.util.stream.Collectors;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.entity.SubscriptionEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.entity.TimePeriodBudgetEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;

@ApplicationScoped
public class CategoryDuplicateDetectionService {

	private final CategoryRepository categoryRepository;
	private final DuplicateRecordRepository duplicateRecordRepository;
	private final DuplicateDetectionSettingsRepository settingsRepository;
	private final EventRepository eventRepository;

	public CategoryDuplicateDetectionService(CategoryRepository categoryRepository,
			DuplicateRecordRepository duplicateRecordRepository,
			DuplicateDetectionSettingsRepository settingsRepository,
			EventRepository eventRepository) {
		this.categoryRepository = categoryRepository;
		this.duplicateRecordRepository = duplicateRecordRepository;
		this.settingsRepository = settingsRepository;
		this.eventRepository = eventRepository;
	}

	@Transactional
	public void detectDuplicates(Long categoryId) {
		CategoryEntity category = categoryRepository.findById(categoryId);
		if (category == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<CategoryEntity> allCategories = categoryRepository.listAll();

		List<DuplicateRecordEntity> existingRecordsList = duplicateRecordRepository.findAllByEntity(EntityType.CATEGORY, category.id);
		Map<Long, DuplicateRecordEntity> existingRecordsMap = DuplicateUtils.buildExistingRecordsMap(existingRecordsList, category.id);

		List<DuplicateUtils.DuplicateRecordData> potentialDuplicates = new ArrayList<>();
		for (CategoryEntity other : allCategories) {
			if (category.id.equals(other.id)) continue;

			DuplicateRecordEntity existingRecord = existingRecordsMap.get(other.id);
			if (existingRecord != null && !existingRecord.updatedAt.isBefore(category.updatedAt) && !existingRecord.updatedAt.isBefore(other.updatedAt)) {
				// No changes since last calculation, reuse previous results
				if (existingRecord.status == DuplicateRecordStatus.PENDING) {
					potentialDuplicates.add(new DuplicateUtils.DuplicateRecordData(
						category.id,
						other.id,
						EntityType.CATEGORY,
						existingRecord.score,
						null,
						null,
						null,
						null,
						null,
						existingRecord.score
					));
				}
				continue;
			}

			double similarity = DuplicateUtils.calculateTextSimilarityScore(category.name, other.name);
			if (similarity >= settings.textSimilarityThresholdScore) {
				DuplicateUtils.DuplicateRecordData recordData = new DuplicateUtils.DuplicateRecordData(
					category.id,
					other.id,
					EntityType.CATEGORY,
					similarity,
					null,
					null,
					null,
					null,
					null,
					null
				);
				potentialDuplicates.add(recordData);
			}
		}

		DuplicateUtils.saveDuplicateRecords(duplicateRecordRepository, EntityType.CATEGORY, category.id, potentialDuplicates);
	}

	@Transactional
	public void merge(Long keepId, Long deleteId) {
		CategoryEntity keepCategory = categoryRepository.findById(keepId);
		CategoryEntity deleteCategory = categoryRepository.findById(deleteId);
		if (keepCategory == null || deleteCategory == null) return;

		eventRepository.update("category = ?1 where category = ?2", keepCategory, deleteCategory);

		TimePeriodBudgetEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);
		TemplateEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);
		SubscriptionEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);

		categoryRepository.delete(deleteCategory);
	}
}
