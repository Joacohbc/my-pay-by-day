package com.mypaybyday.entity;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a file stored directly in the database.
 */
@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "file_entity")
public class FileEntity extends BaseEntity {

    @NotBlank
    public String fileName;

    @NotBlank
    public String mimeType;

    public long size;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    public byte[] data;

}
