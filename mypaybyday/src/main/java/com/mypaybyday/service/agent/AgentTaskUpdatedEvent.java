package com.mypaybyday.service.agent;

import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.enums.AgentTaskStatus;

import java.util.List;

public class AgentTaskUpdatedEvent {

    private final String taskId;
    private final AgentTaskStatus status;
    private final int progress;
    private final String currentStep;
    private final List<AgentTaskStepDto> newSteps;
    private final long totalInputTokens;
    private final long totalOutputTokens;

    public AgentTaskUpdatedEvent(
            String taskId,
            AgentTaskStatus status,
            int progress,
            String currentStep,
            List<AgentTaskStepDto> newSteps,
            long totalInputTokens,
            long totalOutputTokens) {
        this.taskId = taskId;
        this.status = status;
        this.progress = progress;
        this.currentStep = currentStep;
        this.newSteps = newSteps;
        this.totalInputTokens = totalInputTokens;
        this.totalOutputTokens = totalOutputTokens;
    }

    public String getTaskId() { return taskId; }
    public AgentTaskStatus getStatus() { return status; }
    public int getProgress() { return progress; }
    public String getCurrentStep() { return currentStep; }
    public List<AgentTaskStepDto> getNewSteps() { return newSteps; }
    public long getTotalInputTokens() { return totalInputTokens; }
    public long getTotalOutputTokens() { return totalOutputTokens; }
}
