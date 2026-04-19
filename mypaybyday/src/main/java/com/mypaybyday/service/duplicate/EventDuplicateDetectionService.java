package com.mypaybyday.service.duplicate;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;

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

	@Transactional
	public void detectDuplicates(Long eventId) {
		FinanceEventEntity event = eventRepository.findById(eventId);
		if (event == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<FinanceEventEntity> allEvents = eventRepository.listAll();

		List<DuplicateUtils.DuplicateRecordData> potentialDuplicates = new ArrayList<>();
		for (FinanceEventEntity other : allEvents) {
			if (event.id.equals(other.id)) continue;

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
