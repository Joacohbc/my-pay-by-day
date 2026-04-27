package com.mypaybyday.service.agent;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.entity.AgentTaskAttachmentEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.entity.AgentTaskStepEntity;
import com.mypaybyday.enums.AgentAttachmentKind;
import com.mypaybyday.enums.AgentTaskStatus;
import com.mypaybyday.enums.AgentTaskStepType;
import com.mypaybyday.repository.AgentTaskAttachmentRepository;
import com.mypaybyday.repository.AgentTaskRepository;
import com.mypaybyday.repository.AgentTaskStepRepository;

@ApplicationScoped
public class AgentTaskPersistHelper {

    public record AttachmentFile(String fileName, String mimeType, AgentAttachmentKind kind, byte[] data) {}

    private final AgentTaskRepository taskRepository;
    private final AgentTaskStepRepository stepRepository;
    private final AgentTaskAttachmentRepository attachmentRepository;
    private final Event<AgentTaskUpdatedEvent> taskUpdatedBus;

    public AgentTaskPersistHelper(
            AgentTaskRepository taskRepository,
            AgentTaskStepRepository stepRepository,
            AgentTaskAttachmentRepository attachmentRepository,
            Event<AgentTaskUpdatedEvent> taskUpdatedBus) {
        this.taskRepository = taskRepository;
        this.stepRepository = stepRepository;
        this.attachmentRepository = attachmentRepository;
        this.taskUpdatedBus = taskUpdatedBus;
    }

    @Transactional
    public AgentTaskEntity markRunning(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return null;
        task.status = AgentTaskStatus.RUNNING;
        task.startedAt = LocalDateTime.now();
        taskRepository.persist(task);
        fireUpdate(task, List.of());
        return task;
    }

    @Transactional
    public void markCompleted(String taskId, String finalResponse) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.status = AgentTaskStatus.COMPLETED;
        task.finishedAt = LocalDateTime.now();
        task.finalResponse = finalResponse;
        task.progress = 100;
        taskRepository.persist(task);
        fireUpdate(task, List.of());
    }

    @Transactional
    public void markFailed(String taskId, String errorMessage) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.status = AgentTaskStatus.FAILED;
        task.finishedAt = LocalDateTime.now();
        task.lastError = errorMessage;
        taskRepository.persist(task);
        fireUpdate(task, List.of());
    }

    @Transactional
    public void markCancelled(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        if (task.status == AgentTaskStatus.COMPLETED || task.status == AgentTaskStatus.FAILED) return;
        task.status = AgentTaskStatus.CANCELLED;
        task.finishedAt = LocalDateTime.now();
        taskRepository.persist(task);
        fireUpdate(task, List.of());
    }

    @Transactional
    public void markInterrupted(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.status = AgentTaskStatus.INTERRUPTED;
        task.lastError = "Task was interrupted by server restart.";
        taskRepository.persist(task);
    }

    @Transactional
    public AgentTaskStepEntity persistStep(
            String taskId,
            AgentTaskStepType type,
            String toolName,
            String toolArgs,
            String toolResult,
            String content,
            int tokensIn,
            int tokensOut,
            long durationMs) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return null;

        AgentTaskStepEntity step = new AgentTaskStepEntity();
        step.task = task;
        step.type = type;
        step.toolName = toolName;
        step.toolArgs = toolArgs;
        step.toolResult = toolResult != null && toolResult.length() > 4000
                ? toolResult.substring(0, 4000) + "...[truncated]"
                : toolResult;
        step.content = content;
        step.tokensIn = tokensIn;
        step.tokensOut = tokensOut;
        step.durationMs = durationMs;
        step.stepCreatedAt = LocalDateTime.now();
        step.sequence = (int) stepRepository.count("task", task);
        stepRepository.persist(step);

        task.totalToolCalls += (type == AgentTaskStepType.TOOL_CALL ? 1 : 0);
        task.totalInputTokens += tokensIn;
        task.totalOutputTokens += tokensOut;
        taskRepository.persist(task);

        fireUpdate(task, List.of(AgentTaskStepDto.from(step)));
        return step;
    }

    @Transactional
    public void updateProgress(String taskId, int progress, String currentStep) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.progress = progress;
        task.currentStep = currentStep;
        taskRepository.persist(task);
        fireUpdate(task, List.of());
    }

    /** Loads attachment files for a task within a transaction (needed for lazy FileEntity.data). */
    @Transactional
    public List<AttachmentFile> loadAttachmentFiles(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return List.of();
        List<AgentTaskAttachmentEntity> attachments = attachmentRepository.findByTask(task);
        return attachments.stream()
                .filter(a -> a.file != null && a.file.data != null)
                .map(a -> new AttachmentFile(a.originalName, a.mimeType, a.kind, a.file.data))
                .toList();
    }

    @Transactional
    public boolean isCancelRequested(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        return task != null && task.cancelRequested;
    }

    private void fireUpdate(AgentTaskEntity task, List<AgentTaskStepDto> newSteps) {
        taskUpdatedBus.fire(new AgentTaskUpdatedEvent(
                task.getId(),
                task.getStatus(),
                task.getProgress(),
                task.getCurrentStep(),
                newSteps,
                task.getTotalInputTokens(),
                task.getTotalOutputTokens()
        ));
    }
}
