package com.mypaybyday.service;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.CategoryEntity;
import com.mypaybyday.entity.DuplicateCategoryRecordEntity;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.entity.DuplicateEventRecordEntity;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.entity.DuplicateTagRecordEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.CategoryRepository;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.TagRepository;

import org.jboss.logging.Logger;

@ApplicationScoped
public class DuplicateDetectionService {

	private static final Logger LOG = Logger.getLogger(DuplicateDetectionService.class);

	private final DuplicateRecordRepository duplicateRecordRepository;
	private final DuplicateDetectionSettingsRepository settingsRepository;
	private final EventRepository eventRepository;
	private final CategoryRepository categoryRepository;
	private final TagRepository tagRepository;

	public DuplicateDetectionService(DuplicateRecordRepository duplicateRecordRepository,
			DuplicateDetectionSettingsRepository settingsRepository, EventRepository eventRepository,
			CategoryRepository categoryRepository, TagRepository tagRepository) {
		this.duplicateRecordRepository = duplicateRecordRepository;
		this.settingsRepository = settingsRepository;
		this.eventRepository = eventRepository;
		this.categoryRepository = categoryRepository;
		this.tagRepository = tagRepository;
	}

	@Transactional
	public void detectDuplicatesForEvent(Long eventId) {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<FinanceEventEntity> allEvents = eventRepository.listAll();

		for (FinanceEventEntity other : allEvents) {
			if (event.id.equals(other.id)) continue;

			double dateScore = calculateDateScore(event, other, settings.eventTimeThresholdMinutes);
			if (dateScore == 0.0) continue;

			double amountScore = calculateAmountScore(event, other);
			double nodeScore = calculateNodeScore(event, other);
			double categoryScore = calculateCategoryScore(event, other);
			double tagScore = calculateTagScore(event, other);
			double nameScore = calculateTextSimilarityScore(event.name, other.name);

			double totalScore =
				(dateScore * 0.1) +
				(amountScore * settings.eventAmountWeight) +
				(nodeScore * settings.eventNodeWeight) +
				(categoryScore * settings.eventCategoryWeight) +
				(tagScore * settings.eventTagWeight) +
				(nameScore * settings.eventNameWeight);

			if (totalScore >= settings.eventTotalThresholdScore) {
				saveDuplicateRecord(event.id, other.id, EntityType.FINANCE_EVENT, totalScore, dateScore, amountScore, nodeScore, categoryScore, tagScore, nameScore);
			}
		}
	}

	@Transactional
	public void detectDuplicatesForCategory(Long categoryId) {
		CategoryEntity category = categoryRepository.findById(categoryId);
		if (category == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<CategoryEntity> allCategories = categoryRepository.listAll();

		for (CategoryEntity other : allCategories) {
			if (category.id.equals(other.id)) continue;

			double similarity = calculateTextSimilarityScore(category.name, other.name);
			if (similarity >= settings.textSimilarityThresholdScore) {
				saveDuplicateRecord(category.id, other.id, EntityType.CATEGORY, similarity, null, null, null, null, null, null);
			}
		}
	}

	@Transactional
	public void detectDuplicatesForTag(Long tagId) {
		TagEntity tag = tagRepository.findById(tagId);
		if (tag == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<TagEntity> allTags = tagRepository.listAll();

		for (TagEntity other : allTags) {
			if (tag.id.equals(other.id)) continue;

			double similarity = calculateTextSimilarityScore(tag.name, other.name);
			if (similarity >= settings.textSimilarityThresholdScore) {
				saveDuplicateRecord(tag.id, other.id, EntityType.TAG, similarity, null, null, null, null, null, null);
			}
		}
	}

	@Transactional
	public void scanAll() {
		LOG.info("Starting mass duplicate detection scan...");
		List<FinanceEventEntity> events = eventRepository.listAll();
		for (FinanceEventEntity event : events) {
			detectDuplicatesForEvent(event.id);
		}

		List<CategoryEntity> categories = categoryRepository.listAll();
		for (CategoryEntity category : categories) {
			detectDuplicatesForCategory(category.id);
		}

		List<TagEntity> tags = tagRepository.listAll();
		for (TagEntity tag : tags) {
			detectDuplicatesForTag(tag.id);
		}
		LOG.info("Mass duplicate detection scan completed.");
	}

	@Transactional
	public void resolveDuplicate(Long recordId, DuplicateRecordStatus action, Long keepEntityId) {
		DuplicateRecordEntity record = duplicateRecordRepository.findById(recordId);
		if (record == null) return;

		if (action == DuplicateRecordStatus.ACCEPTED_NOT_DUPLICATE) {
			record.status = DuplicateRecordStatus.ACCEPTED_NOT_DUPLICATE;
			duplicateRecordRepository.persist(record);
			return;
		}

		if (action == DuplicateRecordStatus.RESOLVED_MERGED && keepEntityId != null) {
			Long deleteEntityId = record.entityId1.equals(keepEntityId) ? record.entityId2 : record.entityId1;

			if (record.entityType == EntityType.CATEGORY) {
				mergeCategories(keepEntityId, deleteEntityId);
			} else if (record.entityType == EntityType.TAG) {
				mergeTags(keepEntityId, deleteEntityId);
			} else if (record.entityType == EntityType.FINANCE_EVENT) {
				deleteEvent(deleteEntityId);
			}

			record.status = DuplicateRecordStatus.RESOLVED_MERGED;
			duplicateRecordRepository.persist(record);
		}
	}

	private void mergeCategories(Long keepId, Long deleteId) {
		CategoryEntity keepCategory = categoryRepository.findById(keepId);
		CategoryEntity deleteCategory = categoryRepository.findById(deleteId);
		if (keepCategory == null || deleteCategory == null) return;

		eventRepository.update("category = ?1 where category = ?2", keepCategory, deleteCategory);

		com.mypaybyday.entity.TimePeriodBudgetEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);
		com.mypaybyday.entity.TemplateEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);
		com.mypaybyday.entity.SubscriptionEntity.update("category = ?1 where category = ?2", keepCategory, deleteCategory);

		categoryRepository.delete(deleteCategory);
	}

	private void mergeTags(Long keepId, Long deleteId) {
		TagEntity keepTag = tagRepository.findById(keepId);
		TagEntity deleteTag = tagRepository.findById(deleteId);
		if (keepTag == null || deleteTag == null) return;

		List<FinanceEventEntity> events = eventRepository.find("select e from FinanceEvent e join e.tags t where t = ?1", deleteTag).list();
		for (FinanceEventEntity event : events) {
			event.tags.remove(deleteTag);
			event.tags.add(keepTag);
			eventRepository.persist(event);
		}

		List<com.mypaybyday.entity.TagGroupEntity> groups = com.mypaybyday.entity.TagGroupEntity.find("select g from TagGroup g join g.tags t where t = ?1", deleteTag).list();
		for (com.mypaybyday.entity.TagGroupEntity group : groups) {
			group.tags.remove(deleteTag);
			group.tags.add(keepTag);
			group.persist();
		}

		tagRepository.delete(deleteTag);
	}

	private void deleteEvent(Long deleteId) {
		FinanceEventEntity event = eventRepository.findById(deleteId);
		if (event != null) {
			eventRepository.delete(event);
		}
	}

	private void saveDuplicateRecord(Long id1, Long id2, EntityType type, double score, Double dateScore, Double amountScore, Double nodeScore, Double categoryScore, Double tagScore, Double nameScore) {
		Long firstId = Math.min(id1, id2);
		Long secondId = Math.max(id1, id2);

		Optional<DuplicateRecordEntity> existingOpt = duplicateRecordRepository.find("entityType = ?1 and entityId1 = ?2 and entityId2 = ?3", type, firstId, secondId).firstResultOptional();

		if (existingOpt.isPresent()) {
			DuplicateRecordEntity existing = existingOpt.get();
			if (existing.status != DuplicateRecordStatus.PENDING) {
				return;
			}
			existing.score = score;
			existing.calculatedAt = java.time.Instant.now();
			if (type == EntityType.FINANCE_EVENT && existing instanceof DuplicateEventRecordEntity) {
				DuplicateEventRecordEntity eventRecord = (DuplicateEventRecordEntity) existing;
				eventRecord.dateScore = dateScore;
				eventRecord.amountScore = amountScore;
				eventRecord.nodeScore = nodeScore;
				eventRecord.categoryScore = categoryScore;
				eventRecord.tagScore = tagScore;
				eventRecord.nameScore = nameScore;
			}
			duplicateRecordRepository.persist(existing);
		} else {
			DuplicateRecordEntity record;
			if (type == EntityType.FINANCE_EVENT) {
				DuplicateEventRecordEntity eventRecord = new DuplicateEventRecordEntity();
				eventRecord.dateScore = dateScore;
				eventRecord.amountScore = amountScore;
				eventRecord.nodeScore = nodeScore;
				eventRecord.categoryScore = categoryScore;
				eventRecord.tagScore = tagScore;
				eventRecord.nameScore = nameScore;
				record = eventRecord;
			} else if (type == EntityType.CATEGORY) {
				record = new DuplicateCategoryRecordEntity();
			} else {
				record = new DuplicateTagRecordEntity();
			}
			record.entityType = type;
			record.entityId1 = firstId;
			record.entityId2 = secondId;
			record.score = score;
			record.status = DuplicateRecordStatus.PENDING;
			record.calculatedAt = java.time.Instant.now();
			duplicateRecordRepository.persist(record);
		}
	}

	// Helper calculation methods

	private double calculateDateScore(FinanceEventEntity e1, FinanceEventEntity e2, int thresholdMinutes) {
		if (e1.transaction == null || e2.transaction == null) return 0.0;
		long minutes = ChronoUnit.MINUTES.between(e1.transaction.transactionDate, e2.transaction.transactionDate);
		long absMinutes = Math.abs(minutes);
		if (absMinutes > thresholdMinutes) return 0.0;
		if (absMinutes == 0) return 1.0;
		return 1.0 - ((double) absMinutes / thresholdMinutes);
	}

	private double calculateAmountScore(FinanceEventEntity e1, FinanceEventEntity e2) {
		if (e1.transaction == null || e2.transaction == null) return 0.0;
		double amount1 = e1.transaction.lineItems.stream().filter(l -> l.amount.doubleValue() > 0).mapToDouble(l -> l.amount.doubleValue()).sum();
		double amount2 = e2.transaction.lineItems.stream().filter(l -> l.amount.doubleValue() > 0).mapToDouble(l -> l.amount.doubleValue()).sum();
		if (amount1 == amount2) return 1.0;
		double diff = Math.abs(amount1 - amount2);
		double max = Math.max(amount1, amount2);
		if (max == 0) return 0.0;
		double score = 1.0 - (diff / max);
		return Math.max(0.0, score);
	}

	private double calculateNodeScore(FinanceEventEntity e1, FinanceEventEntity e2) {
		if (e1.transaction == null || e2.transaction == null) return 0.0;
		Set<Long> nodes1 = e1.transaction.lineItems.stream().map(l -> l.financeNode.id).collect(Collectors.toSet());
		Set<Long> nodes2 = e2.transaction.lineItems.stream().map(l -> l.financeNode.id).collect(Collectors.toSet());
		if (nodes1.isEmpty() && nodes2.isEmpty()) return 1.0;

		int intersection = 0;
		for (Long id : nodes1) {
			if (nodes2.contains(id)) intersection++;
		}
		return (double) intersection / Math.max(nodes1.size(), nodes2.size());
	}

	private double calculateCategoryScore(FinanceEventEntity e1, FinanceEventEntity e2) {
		if (e1.category == null && e2.category == null) return 1.0;
		if (e1.category != null && e2.category != null && e1.category.id.equals(e2.category.id)) return 1.0;
		return 0.0;
	}

	private double calculateTagScore(FinanceEventEntity e1, FinanceEventEntity e2) {
		Set<Long> tags1 = e1.tags.stream().map(t -> t.id).collect(Collectors.toSet());
		Set<Long> tags2 = e2.tags.stream().map(t -> t.id).collect(Collectors.toSet());
		if (tags1.isEmpty() && tags2.isEmpty()) return 1.0;
		if (tags1.isEmpty() || tags2.isEmpty()) return 0.0;

		int intersection = 0;
		for (Long id : tags1) {
			if (tags2.contains(id)) intersection++;
		}
		return (double) intersection / Math.max(tags1.size(), tags2.size());
	}

	private double calculateTextSimilarityScore(String s1, String s2) {
		if (s1 == null || s2 == null) return 0.0;
		s1 = s1.toLowerCase().trim();
		s2 = s2.toLowerCase().trim();
		if (s1.equals(s2)) return 1.0;

		int[][] dp = new int[s1.length() + 1][s2.length() + 1];

		for (int i = 0; i <= s1.length(); i++) {
			for (int j = 0; j <= s2.length(); j++) {
				if (i == 0) {
					dp[i][j] = j;
				} else if (j == 0) {
					dp[i][j] = i;
				} else {
					dp[i][j] = min(dp[i - 1][j - 1]
								 + costOfSubstitution(s1.charAt(i - 1), s2.charAt(j - 1)),
								  dp[i - 1][j] + 1,
								  dp[i][j - 1] + 1);
				}
			}
		}

		int maxLength = Math.max(s1.length(), s2.length());
		if (maxLength == 0) return 1.0;
		int distance = dp[s1.length()][s2.length()];
		return 1.0 - ((double) distance / maxLength);
	}

	private int costOfSubstitution(char a, char b) {
		return a == b ? 0 : 1;
	}

	private int min(int... numbers) {
		int min = Integer.MAX_VALUE;
		for (int number : numbers) {
			if (number < min) {
				min = number;
			}
		}
		return min;
	}
}
