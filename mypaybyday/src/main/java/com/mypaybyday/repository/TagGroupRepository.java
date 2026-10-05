package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.TagEntity;
import com.mypaybyday.entity.TagGroupEntity;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class TagGroupRepository implements PanacheRepository<TagGroupEntity> {

	public List<TagGroupEntity> findByTag(TagEntity tag) {
		return find("select g from TagGroup g join g.tags t where t = ?1", tag).list();
	}

	public long countByTag(TagEntity tag) {
		return count("from TagGroup tagGroup join tagGroup.tags t where t = ?1", tag);
	}
}
