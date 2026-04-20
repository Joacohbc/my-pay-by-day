package com.mypaybyday.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;
import org.openapitools.jackson.nullable.JsonNullable;

@Getter
@Setter
public class BulkPatchEventDto {

	@NotEmpty
	private List<Long> eventIds;

	private JsonNullable<CategoryDto> category = JsonNullable.undefined();
	private JsonNullable<List<TagDto>> tags = JsonNullable.undefined();
}
