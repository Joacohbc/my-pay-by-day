package com.mypaybyday.service.duplicate;

import java.time.Instant;
import java.util.Optional;

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

	public static void saveDuplicateRecord(DuplicateRecordRepository duplicateRecordRepository, Long id1, Long id2, EntityType type, double score, Double dateScore, Double amountScore, Double nodeScore, Double categoryScore, Double tagScore, Double nameScore) {
		Long firstId = Math.min(id1, id2);
		Long secondId = Math.max(id1, id2);

		Optional<DuplicateRecordEntity> existingOpt = duplicateRecordRepository.find("entityType = ?1 and entityId1 = ?2 and entityId2 = ?3", type, firstId, secondId).firstResultOptional();

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

	public static void saveDuplicateRecords(DuplicateRecordRepository repository, EntityType type, Long sharedId, java.util.List<DuplicateRecordData> dataList) {
		if (dataList == null || dataList.isEmpty()) return;

		java.util.List<DuplicateRecordEntity> existingRecords = repository.find("entityType = ?1 and (entityId1 = ?2 or entityId2 = ?2)",
				type, sharedId).list();

		java.util.Map<Long, DuplicateRecordEntity> existingMap = new java.util.HashMap<>();
		for (DuplicateRecordEntity record : existingRecords) {
			Long otherId = record.entityId1.equals(sharedId) ? record.entityId2 : record.entityId1;
			existingMap.put(otherId, record);
		}

		for (DuplicateRecordData data : dataList) {
			Long otherId = data.id1().equals(sharedId) ? data.id2() : data.id1();
			DuplicateRecordEntity existing = existingMap.get(otherId);

			if (existing != null) {
				if (existing.status != DuplicateRecordStatus.PENDING) continue;
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
			} else {
				DuplicateRecordEntity record = createRecord(type, Math.min(data.id1(), data.id2()), Math.max(data.id1(), data.id2()), data.score(), data.dateScore(), data.amountScore(), data.nodeScore(), data.categoryScore(), data.tagScore(), data.nameScore());
				repository.persist(record);
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
