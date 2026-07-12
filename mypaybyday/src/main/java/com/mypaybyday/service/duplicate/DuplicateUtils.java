package com.mypaybyday.service.duplicate;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.BinaryOperator;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.mypaybyday.entity.DuplicateCategoryRecordEntity;
import com.mypaybyday.entity.DuplicateEventRecordEntity;
import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.entity.DuplicateTagRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.DuplicateRecordRepository;

public class DuplicateUtils {

	public static double calculateTextSimilarityScore(String s1, String s2) {
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

	private static int costOfSubstitution(char a, char b) {
		return a == b ? 0 : 1;
	}

	private static int min(int... numbers) {
		int min = Integer.MAX_VALUE;
		for (int number : numbers) {
			if (number < min) {
				min = number;
			}
		}
		return min;
	}

	public record DuplicateRecordData(
		Long id1, Long id2, EntityType type, double score,
		Double dateScore, Double amountScore, Double nodeScore,
		Double categoryScore, Double tagScore, Double nameScore
	) {}

	/**
	 * Builds a robust map of existing duplicate records to efficiently bypass repetitive mathematical
	 * operations for unmutated entities during the detection sweep.
	 */
	public static Map<Long, DuplicateRecordEntity> buildExistingRecordsMap(List<DuplicateRecordEntity> records, Long entityId) {
		
		// This map is build in this way because the key must be the "other" event ID, not the current event ID
		// to facilitate quick lookups during iteration (performance optimization)
		Function<DuplicateRecordEntity, Long> extractOtherEventId = record -> 
			record.entityId1.equals(entityId) ? record.entityId2 : record.entityId1;

		// Build a map of existing records for quick lookup, with conflict resolution to handle potential duplicates in the database
		Function<DuplicateRecordEntity, DuplicateRecordEntity> identityMapper = record -> record;
		
		// In case of multiple records for the same pair (which shouldn't happen but we want to be safe), 
		// we keep the first one and ignore the rest
		BinaryOperator<DuplicateRecordEntity> keepFirstOnConflict = (first, second) -> first;

		// Build the existing records map for the current event
		Map<Long, DuplicateRecordEntity> existingRecordsMap = records.stream()
			.collect(Collectors.toMap(
				extractOtherEventId,
				identityMapper,
				keepFirstOnConflict
			));
			
		return existingRecordsMap;
	}

	public static void saveDuplicateRecord(DuplicateRecordRepository duplicateRecordRepository, Long id1, Long id2, EntityType type, double score, Double dateScore, Double amountScore, Double nodeScore, Double categoryScore, Double tagScore, Double nameScore) {
		Long firstId = Math.min(id1, id2);
		Long secondId = Math.max(id1, id2);

		Optional<DuplicateRecordEntity> existingOpt = duplicateRecordRepository.findByEntities(type, firstId, secondId);

		if (existingOpt.isPresent()) {
			DuplicateRecordEntity existing = existingOpt.get();
			if (existing.status != DuplicateRecordStatus.PENDING) {
				return;
			}
			existing.score = score;
			existing.calculatedAt = Instant.now();
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
			DuplicateRecordEntity record = createRecord(type, firstId, secondId, score, dateScore, amountScore, nodeScore, categoryScore, tagScore, nameScore);
			duplicateRecordRepository.persist(record);
		}
	}

	/**
	 * Persists duplicate records symmetrically (A to B, and B to A) ensuring bidirectional capability.
	 * Evaluates current database records against newly calculated duplicates to orchestrate status 
	 * transitions (PENDING vs AUTO_RESOLVED_NOT_DUPLICATED) gracefully without redundant calculations.
	 * 
	 * @param repository The managed persistence context for duplicates.
	 * @param type The entity type being compared.
	 * @param sharedId The ID of the core entity under evaluation.
	 * @param dataList The freshly calculated candidate list exceeding the duplicate threshold score.
	 */
	public static void saveDuplicateRecords(DuplicateRecordRepository repository, EntityType type, Long sharedId, List<DuplicateRecordData> dataList) {
		List<DuplicateRecordEntity> existingRecords = repository.find("entityType = ?1 and (entityId1 = ?2 or entityId2 = ?2)",
				type, sharedId).list();

		Map<Long, DuplicateRecordEntity> existingMap = new HashMap<>();
		for (DuplicateRecordEntity record : existingRecords) {
			Long otherId = record.entityId1.equals(sharedId) ? record.entityId2 : record.entityId1;
			existingMap.put(otherId, record);
		}

		Map<Long, DuplicateRecordData> targetDataMap = new HashMap<>();
		if (dataList != null) {
			for (DuplicateRecordData data : dataList) {
				Long otherId = data.id1().equals(sharedId) ? data.id2() : data.id1();
				targetDataMap.put(otherId, data);
			}
		}

		for (Map.Entry<Long, DuplicateRecordEntity> entry : existingMap.entrySet()) {
			Long otherId = entry.getKey();
			DuplicateRecordEntity existingRecord = entry.getValue();
			
			boolean isNoLongerConsideredDuplicate = !targetDataMap.containsKey(otherId);
			boolean isCurrentlyPending = existingRecord.status == DuplicateRecordStatus.PENDING;
			
			if (isNoLongerConsideredDuplicate) {
				List<DuplicateRecordEntity> pairedRecords = repository.findAllByEntities(type, sharedId, otherId);
				for (DuplicateRecordEntity pr : pairedRecords) {
					if (isCurrentlyPending) {
						pr.status = DuplicateRecordStatus.AUTO_RESOLVED_NOT_DUPLICATED;
					}
					pr.calculatedAt = Instant.now();
					repository.persist(pr);
				}
			}
		}

		for (DuplicateRecordData data : targetDataMap.values()) {
			Long otherId = data.id1().equals(sharedId) ? data.id2() : data.id1();
			List<DuplicateRecordEntity> pairedRecords = repository.findAllByEntities(type, sharedId, otherId);

			if (!pairedRecords.isEmpty()) {
				for (DuplicateRecordEntity existing : pairedRecords) {
					boolean isApplicableForStatusUpdate = existing.status == DuplicateRecordStatus.PENDING || 
													existing.status == DuplicateRecordStatus.AUTO_RESOLVED_NOT_DUPLICATED;
					
					if (isApplicableForStatusUpdate) {
						boolean needsPendingRevert = existing.status == DuplicateRecordStatus.AUTO_RESOLVED_NOT_DUPLICATED;
						if (needsPendingRevert) {
							existing.status = DuplicateRecordStatus.PENDING;
						}
					}
					existing.score = data.score();
					existing.calculatedAt = Instant.now();
					if (type == EntityType.FINANCE_EVENT && existing instanceof DuplicateEventRecordEntity eventRecord) {
						eventRecord.dateScore = data.dateScore();
						eventRecord.amountScore = data.amountScore();
						eventRecord.nodeScore = data.nodeScore();
						eventRecord.categoryScore = data.categoryScore();
						eventRecord.tagScore = data.tagScore();
						eventRecord.nameScore = data.nameScore();
					}
					repository.persist(existing);
				}
				
				boolean isMissingSymmetricRow = pairedRecords.size() == 1;
				if (isMissingSymmetricRow) {
					DuplicateRecordEntity existing = pairedRecords.get(0);
					DuplicateRecordEntity mirrorRecord;
					if (existing.entityId1.equals(sharedId)) {
						mirrorRecord = createRecord(type, otherId, sharedId, data.score(), data.dateScore(), data.amountScore(), data.nodeScore(), data.categoryScore(), data.tagScore(), data.nameScore());
					} else {
						mirrorRecord = createRecord(type, sharedId, otherId, data.score(), data.dateScore(), data.amountScore(), data.nodeScore(), data.categoryScore(), data.tagScore(), data.nameScore());
					}
					repository.persist(mirrorRecord);
				}
			} else {
				DuplicateRecordEntity record1 = createRecord(type, sharedId, otherId, data.score(), data.dateScore(), data.amountScore(), data.nodeScore(), data.categoryScore(), data.tagScore(), data.nameScore());
				DuplicateRecordEntity record2 = createRecord(type, otherId, sharedId, data.score(), data.dateScore(), data.amountScore(), data.nodeScore(), data.categoryScore(), data.tagScore(), data.nameScore());
				repository.persist(record1);
				repository.persist(record2);
			}
		}
	}

	private static DuplicateRecordEntity createRecord(EntityType type, Long firstId, Long secondId, double score, Double dateScore, Double amountScore, Double nodeScore, Double categoryScore, Double tagScore, Double nameScore) {
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
		record.calculatedAt = Instant.now();
		return record;
	}
}
