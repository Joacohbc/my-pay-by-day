package com.mypaybyday.dto;

import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.DuplicateRecordStatus;

public class ResolveDuplicateRequestDto {
	@NotNull
	public DuplicateRecordStatus action;
	public Long keepEntityId;
}
