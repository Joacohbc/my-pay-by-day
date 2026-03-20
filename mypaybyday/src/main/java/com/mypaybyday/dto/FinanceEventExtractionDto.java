package com.mypaybyday.dto;

import com.mypaybyday.enums.EventType;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class FinanceEventExtractionDto {

    private String name;

    private BigDecimal amount;

    private Long sourceNodeId;

    private Long destinationNodeId;

    private Long categoryId;

    private String transactionDate;

    private EventType eventType;
}
