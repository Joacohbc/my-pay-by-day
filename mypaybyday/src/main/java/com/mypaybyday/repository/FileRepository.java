package com.mypaybyday.repository;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.FinanceEventEntity;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;

@ApplicationScoped
public class FileRepository implements PanacheRepository<FileEntity> {

	private static final String LINKED_FILE_IDS = "select f.id from FinanceEvent e join e.files f";

	public FileEntity findByHash(String hash) {
		return find("hash", hash).firstResult();
	}

	public PanacheQuery<FileEntity> findOrphans() {
		return find("id not in (" + LINKED_FILE_IDS + ")");
	}

	public PanacheQuery<FileEntity> findLinked() {
		return find("id in (" + LINKED_FILE_IDS + ")");
	}

	public long countEventsUsing(Long fileId) {
		return getEntityManager()
			.createQuery("select count(e) from FinanceEvent e join e.files f where f.id = :fileId", Long.class)
			.setParameter("fileId", fileId)
			.getSingleResult();
	}

	public List<FinanceEventEntity> findEventsUsing(Long fileId) {
		return getEntityManager()
			.createQuery("select e from FinanceEvent e join e.files f where f.id = :fileId", FinanceEventEntity.class)
			.setParameter("fileId", fileId)
			.getResultList();
	}
}
