package com.mypaybyday.entity;

import com.mypaybyday.ai.RagObject;
import dev.langchain4j.data.document.Metadata;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;

/**
 * Common base for all domain entities.
 *
 * <p>Uses {@link GenerationType#IDENTITY} so that SQLite's native ROWID / AUTOINCREMENT
 * is used for ID generation. This avoids the need for a separate isolated JDBC connection
 * (as required by the default TABLE/SEQUENCE emulation strategy), which is incompatible
 * with a single-connection pool configured for SQLite.
 */
@MappedSuperclass
public abstract class BaseEntity extends PanacheEntityBase implements RagObject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(updatable = false)
    public Instant createdAt;

    public Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @Override
    public Metadata toRagMetadata() {
        Metadata metadata = new Metadata();
        metadata.put("id", id != null ? id.toString() : "unknown");
        metadata.put("type", this.getClass().getSimpleName().toLowerCase());
        return metadata;
    }
}
