package com.mypaybyday.service.agent;

import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.enums.AgentTaskStatus;

import java.util.List;

public class AgentTaskUpdatedEvent {

    private final String taskId;
    private final AgentTaskStatus status;
    private final int progress;
    private final String currentStep;
    private final String description;
    private final List<AgentTaskStepDto> newSteps;

    public AgentTaskUpdatedEvent(
            String taskId,
            AgentTaskStatus status,
            int progress,
            String currentStep,
            String description,
            List<AgentTaskStepDto> newSteps) {
        this.taskId = taskId;
        this.status = status;
        this.progress = progress;
        this.currentStep = currentStep;
        this.description = description;
        this.newSteps = newSteps;
    }

    public String getTaskId() { return taskId; }
    public AgentTaskStatus getStatus() { return status; }
    public int getProgress() { return progress; }
    public String getCurrentStep() { return currentStep; }
    public String getDescription() { return description; }
    public List<AgentTaskStepDto> getNewSteps() { return newSteps; }
}
