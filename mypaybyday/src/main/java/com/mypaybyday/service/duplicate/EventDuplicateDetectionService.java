package com.mypaybyday.service.duplicate;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BinaryOperator;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.DuplicateRecordEntity;
import com.mypaybyday.enums.DuplicateRecordStatus;
import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.entity.DuplicateEventRecordEntity;

@ApplicationScoped
public class EventDuplicateDetectionService {

	private static final Logger LOG = Logger.getLogger(EventDuplicateDetectionService.class);

	private final EventRepository eventRepository;
	private final DuplicateRecordRepository duplicateRecordRepository;
	private final DuplicateDetectionSettingsRepository settingsRepository;

	public EventDuplicateDetectionService(EventRepository eventRepository,
			DuplicateRecordRepository duplicateRecordRepository,
			DuplicateDetectionSettingsRepository settingsRepository) {
		this.eventRepository = eventRepository;
		this.duplicateRecordRepository = duplicateRecordRepository;
		this.settingsRepository = settingsRepository;
	}

	/**
	 * Executes the duplicate detection algorithm for a single event against all other events.
	 * 
	 * Business Rule (State Tracking): The system intentionally maintains all possible duplicate 
	 * pairings. This preserves the history of manually resolved duplicates and allows unseen 
	 * pending records to dynamically transition between PENDING and AUTO_RESOLVED_NOT_DUPLICATED 
	 * as the user updates event details and their similarity scores fluctuate.
	 * 
	 * Implementation note (Optimization): Employs a timestamp-based caching mechanism. 
	 * If neither the target event nor the compared event has been updated since their last 
	 * recorded calculation, the expensive text and math scoring logic is completely bypassed.
	 *
	 * @param eventId The ID of the event to evaluate.
	 */
	@Transactional
	public void detectDuplicates(Long eventId) {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) return;

		LOG.infof("Starting duplicate detection for Event %d: %s", event.id, event.name);

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<FinanceEventEntity> allEvents = eventRepository.listAll();

		List<DuplicateRecordEntity> existingRecordsList = duplicateRecordRepository.findAllByEntity(EntityType.FINANCE_EVENT, event.id);
		Map<Long, DuplicateRecordEntity> existingRecordsMap = DuplicateUtils.buildExistingRecordsMap(existingRecordsList, event.id);

		List<DuplicateUtils.DuplicateRecordData> potentialDuplicates = new ArrayList<>();
		for (FinanceEventEntity other : allEvents) {
			if (event.id.equals(other.id)) continue;

			// Check if we can skip calculation based on timestamps (caching optimization)
			DuplicateRecordEntity existingRecord = existingRecordsMap.get(other.id);
			
			boolean isRecordCached = existingRecord != null;
			if(isRecordCached) {
				boolean isUnchanged = 
					!existingRecord.updatedAt.isBefore(event.updatedAt) 
					&& !existingRecord.updatedAt.isBefore(other.updatedAt);

				boolean notResolvedByUser = 
					existingRecord.status == DuplicateRecordStatus.PENDING 
					|| existingRecord.status == DuplicateRecordStatus.AUTO_RESOLVED_NOT_DUPLICATED;

				// If the record is cached and both events are unchanged since last calculation, 
				// we can reuse the existing score and skip recalculation
				if (isUnchanged) {
					if (notResolvedByUser) {
						Double dateScore = null, amountScore = null, nodeScore = null, categoryScore = null, tagScore = null, nameScore = null;
						
						if (existingRecord instanceof DuplicateEventRecordEntity eventRecord) {
							dateScore = eventRecord.dateScore;
							amountScore = eventRecord.amountScore;
							nodeScore = eventRecord.nodeScore;
							categoryScore = eventRecord.categoryScore;
							tagScore = eventRecord.tagScore;
							nameScore = eventRecord.nameScore;
						} else {
							// In case of data inconsistency where we have a non-event record for finance events, we log a warning and fallback to using the total score only
							LOG.warnf("Data inconsistency detected: Expected DuplicateEventRecordEntity but found %s for Event %d vs %d. Falling back to total score only.", 
								existingRecord.getClass().getSimpleName(), event.id, other.id);
							continue;
						}

						potentialDuplicates.add(new DuplicateUtils.DuplicateRecordData(
							event.id,
							other.id,
							EntityType.FINANCE_EVENT,
							existingRecord.score,
							dateScore,
							amountScore,
							nodeScore,
							categoryScore,
							tagScore,
							nameScore
						));
					}
					
					continue;
				}
			}

			// Perform full calculation if not cached or if events have changed since last calculation
			double dateScore = calculateDateScore(event, other, settings.eventTimeThresholdMinutes);
			double amountScore = calculateAmountScore(event, other);
			double nodeScore = calculateNodeScore(event, other);
			double categoryScore = calculateCategoryScore(event, other);
			double tagScore = calculateTagScore(event, other);
			double nameScore = DuplicateUtils.calculateTextSimilarityScore(event.name, other.name);

			double totalScore =
				(dateScore * settings.eventDateWeight) +
				(amountScore * settings.eventAmountWeight) +
				(nodeScore * settings.eventNodeWeight) +
				(categoryScore * settings.eventCategoryWeight) +
				(tagScore * settings.eventTagWeight) +
				(nameScore * settings.eventNameWeight);
			
			LOG.infof("EventDuplicateDetectionService: Event %d vs %d - dateScore: %.4f, amountScore: %.4f, nodeScore: %.4f, categoryScore: %.4f, tagScore: %.4f, nameScore: %.4f, totalScore: %.4f",
				event.id, other.id, dateScore, amountScore, nodeScore, categoryScore, tagScore, nameScore, totalScore);

			if (totalScore >= settings.eventTotalThresholdScore) {
				LOG.infof("Potential duplicate found: Event %d vs %d with score %.4f", event.id, other.id, totalScore);
				DuplicateUtils.DuplicateRecordData recordData = new DuplicateUtils.DuplicateRecordData(
					event.id,
					other.id,
					EntityType.FINANCE_EVENT,
					totalScore,
					dateScore,
					amountScore,
					nodeScore,
					categoryScore,
					tagScore,
					nameScore
				);

				potentialDuplicates.add(recordData);
			}
		}

		DuplicateUtils.saveDuplicateRecords(duplicateRecordRepository, EntityType.FINANCE_EVENT, event.id, potentialDuplicates);
	}

	@Transactional
	public void delete(Long deleteId) {
		FinanceEventEntity event = eventRepository.findById(deleteId);
		if (event != null) {
			eventRepository.delete(event);
		}
	}

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
}
