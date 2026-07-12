package com.mypaybyday.entity;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.validation.constraints.NotBlank;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a file stored directly in the database.
 */
@Entity(name = "File")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileEntity extends BaseEntity {

	@NotBlank
	public String fileName;

	@NotBlank
	public String mimeType;

	public long size;

	@Column(columnDefinition = "BLOB")
	@Basic(fetch = FetchType.LAZY)
	public byte[] data;

	public String hash;

	@Column(columnDefinition = "TEXT")
	@Basic(fetch = FetchType.LAZY)
	public String markdownContent;

}
