package com.mypaybyday.repository;

import com.mypaybyday.entity.StoredFile;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class StoredFileRepository implements PanacheRepository<StoredFile> {
}
