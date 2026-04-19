package com.mypaybyday.dto;

import com.mypaybyday.enums.DuplicateRecordStatus;
import jakarta.validation.constraints.NotNull;

public class ResolveDuplicateRequestDto {
	@NotNull
	public DuplicateRecordStatus action;
	public Long keepEntityId;
}
