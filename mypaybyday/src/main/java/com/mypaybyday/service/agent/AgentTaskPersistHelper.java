package com.mypaybyday.service.agent;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.AgentTaskActionDto;
import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.entity.AgentTaskActionEntity;
import com.mypaybyday.entity.AgentTaskAttachmentEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.entity.AgentTaskStepEntity;
import com.mypaybyday.enums.AgentAttachmentKind;
import com.mypaybyday.enums.AgentTaskActionStatus;
import com.mypaybyday.enums.AgentTaskActionType;
import com.mypaybyday.enums.AgentTaskStatus;
import com.mypaybyday.enums.AgentTaskStepType;
import com.mypaybyday.repository.AgentTaskActionRepository;
import com.mypaybyday.repository.AgentTaskAttachmentRepository;
import com.mypaybyday.repository.AgentTaskRepository;
import com.mypaybyday.repository.AgentTaskStepRepository;

@ApplicationScoped
public class AgentTaskPersistHelper {

    public record AttachmentFile(String fileName, String mimeType, AgentAttachmentKind kind, byte[] data) {}

    private final AgentTaskRepository taskRepository;
    private final AgentTaskStepRepository stepRepository;
    private final AgentTaskAttachmentRepository attachmentRepository;
    private final AgentTaskActionRepository actionRepository;
    private final Event<AgentTaskUpdatedEvent> taskUpdatedBus;

    public AgentTaskPersistHelper(
            AgentTaskRepository taskRepository,
            AgentTaskStepRepository stepRepository,
            AgentTaskAttachmentRepository attachmentRepository,
            AgentTaskActionRepository actionRepository,
            Event<AgentTaskUpdatedEvent> taskUpdatedBus) {
        this.taskRepository = taskRepository;
        this.stepRepository = stepRepository;
        this.attachmentRepository = attachmentRepository;
        this.actionRepository = actionRepository;
        this.taskUpdatedBus = taskUpdatedBus;
    }

    @Transactional
    public AgentTaskEntity markRunning(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return null;
        if (task.status != AgentTaskStatus.PENDING
                && task.status != AgentTaskStatus.PAUSED
                && task.status != AgentTaskStatus.INTERRUPTED) {
            return null;
        }
        task.status = AgentTaskStatus.RUNNING;
        task.startedAt = LocalDateTime.now();
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
        return task;
    }

    @Transactional
    public void markCompleted(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.status = AgentTaskStatus.COMPLETED;
        task.finishedAt = LocalDateTime.now();
        task.progress = 100;
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
    }

    @Transactional
    public void markFailed(String taskId, String errorMessage) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        persistErrorStep(task, errorMessage);
        task.status = AgentTaskStatus.FAILED;
        task.finishedAt = LocalDateTime.now();
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
    }

    @Transactional
    public void markCancelled(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        if (task.status == AgentTaskStatus.COMPLETED || task.status == AgentTaskStatus.FAILED || task.status == AgentTaskStatus.CANCELLED) return;
        task.status = AgentTaskStatus.CANCELLED;
        task.finishedAt = LocalDateTime.now();
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
    }

    @Transactional
    public void markPaused(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        if (task.status == AgentTaskStatus.PAUSED
                || task.status == AgentTaskStatus.COMPLETED
                || task.status == AgentTaskStatus.FAILED
                || task.status == AgentTaskStatus.CANCELLED) return;
        task.status = AgentTaskStatus.PAUSED;
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
    }

    @Transactional
    public boolean isPaused(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        return task != null && task.status == AgentTaskStatus.PAUSED;
    }

    @Transactional
    public boolean hasPreviousSteps(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        return task != null && stepRepository.count("task", task) > 0;
    }

    @Transactional
    public List<AgentTaskStepEntity> getTaskSteps(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return List.of();
        return stepRepository.findByTaskOrderBySequence(task);
    }

    @Transactional
    public List<AgentTaskActionEntity> getTaskActions(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return List.of();
        return actionRepository.findByTask(task);
    }

    @Transactional
    public void markInterrupted(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        persistErrorStep(task, "Task was interrupted by server restart.");
        task.status = AgentTaskStatus.INTERRUPTED;
        taskRepository.persist(task);
    }

    @Transactional
    public AgentTaskStepEntity persistStep(
            String taskId,
            AgentTaskStepType type,
            String description,
            String content,
            long durationMs) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return null;

        AgentTaskStepEntity step = new AgentTaskStepEntity();
        step.task = task;
        step.type = type;
        step.description = description;
        step.content = content;
        step.durationMs = durationMs;
        step.stepCreatedAt = LocalDateTime.now();
        step.sequence = (int) stepRepository.count("task", task);
        stepRepository.persist(step);

        taskRepository.persist(task);

        fireUpdate(task, null, List.of(AgentTaskStepDto.from(step)), List.of());
        return step;
    }

    @Transactional
    public AgentTaskStepEntity persistStep(String taskId, AgentTaskStepType type, String description) {
        return persistStep(taskId, type, description, null, 0);
    }

    @Transactional
    public void updateProgress(String taskId, int progress, String currentStep) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.progress = progress;
        task.currentStep = currentStep;
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of());
    }

    @Transactional
    public void fireProgressUpdate(String taskId, int progress, String description) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        task.progress = progress;
        task.currentStep = description;
        taskRepository.persist(task);
        fireUpdate(task, description, List.of(), List.of());
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

    @Transactional
    public void createUserRequest(String taskId, AgentTaskActionType actionType, String description, String payload) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;

        AgentTaskActionEntity action = new AgentTaskActionEntity();
        action.task = task;
        action.actionType = actionType;
        action.payload = (payload != null && !payload.isBlank())
                ? description + "\n" + payload
                : description;
        action.status = AgentTaskActionStatus.PENDING_APPROVAL;
        action.actionCreatedAt = LocalDateTime.now();
        actionRepository.persist(action);

        task.status = AgentTaskStatus.PAUSED;
        taskRepository.persist(task);
        fireUpdate(task, null, List.of(), List.of(AgentTaskActionDto.from(action)));
    }

    @Transactional
    public String getLastUserFeedback(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return null;

        // Latest resolved action feedback
        LocalDateTime actionTime = null;
        String actionFeedback = null;

        var bestAction = actionRepository.findByTask(task).stream()
                .filter(a -> (a.status == AgentTaskActionStatus.APPROVED || a.status == AgentTaskActionStatus.REJECTED)
                        && a.resultMessage != null && !a.resultMessage.isBlank())
                .max(Comparator.comparing(a -> a.resolvedAt))
                .orElse(null);
        if (bestAction != null) {
            actionTime = bestAction.resolvedAt;
            actionFeedback = bestAction.resultMessage;
        }

        // Latest direct USER step (from sendMessage)
        LocalDateTime stepTime = null;
        String stepFeedback = null;
        var bestStep = stepRepository.findByTaskOrderBySequence(task).stream()
                .filter(s -> s.type == AgentTaskStepType.USER
                        && s.description != null && !s.description.isBlank())
                .max(Comparator.comparing(s -> s.stepCreatedAt))
                .orElse(null);
        if (bestStep != null) {
            stepTime = bestStep.stepCreatedAt;
            stepFeedback = bestStep.description;
        }

        if (stepFeedback != null && (actionTime == null || (stepTime != null && stepTime.isAfter(actionTime)))) {
            return stepFeedback;
        }
        return actionFeedback;
    }

    private void persistErrorStep(AgentTaskEntity task, String errorMessage) {
        AgentTaskStepEntity step = new AgentTaskStepEntity();
        step.task = task;
        step.type = AgentTaskStepType.ERROR;
        step.description = errorMessage;
        step.stepCreatedAt = LocalDateTime.now();
        step.sequence = (int) stepRepository.count("task", task);
        stepRepository.persist(step);
    }

    @Transactional
    public int countStepsByType(String taskId, AgentTaskStepType type) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return 0;
        return (int) stepRepository.count("task = ?1 AND type = ?2", task, type);
    }

    @Transactional
    public void fireTaskUpdated(String taskId) {
        AgentTaskEntity task = taskRepository.findById(taskId);
        if (task == null) return;
        List<AgentTaskStepDto> steps = stepRepository.findByTaskOrderBySequence(task).stream().map(AgentTaskStepDto::from).toList();
        List<AgentTaskActionDto> actions = actionRepository.findByTask(task).stream().map(AgentTaskActionDto::from).toList();
        fireUpdate(task, null, steps, actions);
    }

    private void fireUpdate(AgentTaskEntity task, String description, List<AgentTaskStepDto> newSteps, List<AgentTaskActionDto> newActions) {
        taskUpdatedBus.fire(new AgentTaskUpdatedEvent(
                task.getId(),
                task.getStatus(),
                task.getProgress(),
                task.getCurrentStep(),
                description,
                newSteps,
                newActions
        ));
    }
}
