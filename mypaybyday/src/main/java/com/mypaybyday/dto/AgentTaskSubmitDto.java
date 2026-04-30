package com.mypaybyday.dto;

import java.util.List;

import com.mypaybyday.enums.AgentTaskExecutionMode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AgentTaskSubmitDto {
    private String instruction;
    private AgentTaskExecutionMode executionMode = AgentTaskExecutionMode.AUTONOMOUS;
    private List<Long> fileIds;
}
