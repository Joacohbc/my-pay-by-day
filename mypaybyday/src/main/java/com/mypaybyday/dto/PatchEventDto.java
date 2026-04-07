package com.mypaybyday.dto;

import com.mypaybyday.enums.EventType;
import lombok.Getter;
import lombok.Setter;
import org.openapitools.jackson.nullable.JsonNullable;

import java.util.List;

@Getter
@Setter
public class PatchEventDto {

    private JsonNullable<String> name = JsonNullable.undefined();
    private JsonNullable<String> description = JsonNullable.undefined();
    private JsonNullable<String> receiptUrl = JsonNullable.undefined();
    private JsonNullable<EventType> type = JsonNullable.undefined();
    private JsonNullable<CategoryDto> category = JsonNullable.undefined();
    private JsonNullable<List<TagDto>> tags = JsonNullable.undefined();
    private JsonNullable<List<Long>> fileIds = JsonNullable.undefined();
    private JsonNullable<PatchTransactionDto> transaction = JsonNullable.undefined();
}
