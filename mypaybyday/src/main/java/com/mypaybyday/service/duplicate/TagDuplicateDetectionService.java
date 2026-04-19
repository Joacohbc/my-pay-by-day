package com.mypaybyday.service.duplicate;

import java.util.LinkedList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.entity.DuplicateDetectionSettingsEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TagGroupEntity;
import com.mypaybyday.enums.EntityType;
import com.mypaybyday.repository.DuplicateDetectionSettingsRepository;
import com.mypaybyday.repository.DuplicateRecordRepository;
import com.mypaybyday.repository.EventRepository;
import com.mypaybyday.repository.TagRepository;

@ApplicationScoped
public class TagDuplicateDetectionService {

	private final TagRepository tagRepository;
	private final DuplicateRecordRepository duplicateRecordRepository;
	private final DuplicateDetectionSettingsRepository settingsRepository;
	private final EventRepository eventRepository;

	public TagDuplicateDetectionService(TagRepository tagRepository,
			DuplicateRecordRepository duplicateRecordRepository,
			DuplicateDetectionSettingsRepository settingsRepository,
			EventRepository eventRepository) {
		this.tagRepository = tagRepository;
		this.duplicateRecordRepository = duplicateRecordRepository;
		this.settingsRepository = settingsRepository;
		this.eventRepository = eventRepository;
	}

	@Transactional
	public void detectDuplicates(Long tagId) {
		TagEntity tag = tagRepository.findById(tagId);
		if (tag == null) return;

		DuplicateDetectionSettingsEntity settings = settingsRepository.getSettings();
		List<TagEntity> allTags = tagRepository.listAll();

		List<DuplicateUtils.DuplicateRecordData> potentialDuplicates = new LinkedList<>();
		for (TagEntity other : allTags) {
			if (tag.id.equals(other.id)) continue;

			double similarity = DuplicateUtils.calculateTextSimilarityScore(tag.name, other.name);
			if (similarity >= settings.textSimilarityThresholdScore) {
				DuplicateUtils.DuplicateRecordData recordData = new DuplicateUtils.DuplicateRecordData(
					tag.id,
					other.id,
					EntityType.TAG,
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
		DuplicateUtils.saveDuplicateRecords(duplicateRecordRepository, EntityType.TAG, tag.id, potentialDuplicates);
	}

	@Transactional
	public void merge(Long keepId, Long deleteId) {
		TagEntity keepTag = tagRepository.findById(keepId);
		TagEntity deleteTag = tagRepository.findById(deleteId);
		if (keepTag == null || deleteTag == null) return;

		List<FinanceEventEntity> events = eventRepository.find("select e from FinanceEvent e join e.tags t where t = ?1", deleteTag).list();
		for (FinanceEventEntity event : events) {
			event.tags.remove(deleteTag);
			event.tags.add(keepTag);
			eventRepository.persist(event);
		}

		List<TagGroupEntity> groups = TagGroupEntity.find("select g from TagGroup g join g.tags t where t = ?1", deleteTag).list();
		for (TagGroupEntity group : groups) {
			group.tags.remove(deleteTag);
			group.tags.add(keepTag);
			group.persist();
		}

		tagRepository.delete(deleteTag);
	}
}
