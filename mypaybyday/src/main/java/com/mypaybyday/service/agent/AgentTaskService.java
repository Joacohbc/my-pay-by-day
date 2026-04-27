package com.mypaybyday.service.agent;

import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.AgentTaskActionDto;
import com.mypaybyday.dto.AgentTaskAttachmentDto;
import com.mypaybyday.dto.AgentTaskDto;
import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.dto.AgentTaskSubmitDto;
import com.mypaybyday.entity.AgentTaskActionEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.enums.AgentTaskActionStatus;
import com.mypaybyday.enums.AgentTaskStatus;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.repository.AgentTaskActionRepository;
import com.mypaybyday.repository.AgentTaskAttachmentRepository;
import com.mypaybyday.repository.AgentTaskRepository;
import com.mypaybyday.repository.AgentTaskStepRepository;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.entity.AgentTaskAttachmentEntity;
import com.mypaybyday.enums.AgentAttachmentKind;

@ApplicationScoped
public class AgentTaskService {

    private final AgentTaskRepository taskRepository;
    private final AgentTaskStepRepository stepRepository;
    private final AgentTaskAttachmentRepository attachmentRepository;
    private final AgentTaskActionRepository actionRepository;

    public AgentTaskService(
            AgentTaskRepository taskRepository,
            AgentTaskStepRepository stepRepository,
            AgentTaskAttachmentRepository attachmentRepository,
            AgentTaskActionRepository actionRepository) {
        this.taskRepository = taskRepository;
        this.stepRepository = stepRepository;
        this.attachmentRepository = attachmentRepository;
        this.actionRepository = actionRepository;
    }

    @Transactional
    public AgentTaskDto submit(AgentTaskSubmitDto dto) throws BusinessException {
        if (dto.getInstruction() == null || dto.getInstruction().isBlank()) {
            throw new BusinessException("Instruction is required.");
        }
        AgentTaskEntity task = new AgentTaskEntity();
        task.userInstruction = dto.getInstruction();
        task.executionMode = dto.getExecutionMode();
        task.status = AgentTaskStatus.PENDING;
        taskRepository.persist(task);
        
        if (dto.getFileIds() != null && !dto.getFileIds().isEmpty()) {
            for (Long fileId : dto.getFileIds()) {
                FileEntity file = FileEntity.findById(fileId);
                if (file != null) {
                    AgentTaskAttachmentEntity attachment = new AgentTaskAttachmentEntity();
                    attachment.task = task;
                    attachment.file = file;
                    attachment.originalName = file.fileName;
                    attachment.mimeType = file.mimeType;
                    attachment.sizeBytes = file.size;
                    
                    if (file.mimeType != null) {
                        if (file.mimeType.startsWith("image/")) {
                            attachment.kind = AgentAttachmentKind.IMAGE;
                        } else if (file.mimeType.equals("application/pdf")) {
                            attachment.kind = AgentAttachmentKind.PDF;
                        } else if (file.mimeType.equals("text/csv")) {
                            attachment.kind = AgentAttachmentKind.CSV;
                        } else if (file.mimeType.equals("application/json")) {
                            attachment.kind = AgentAttachmentKind.JSON;
                        } else if (file.mimeType.startsWith("text/")) {
                            attachment.kind = AgentAttachmentKind.TEXT;
                        } else {
                            attachment.kind = AgentAttachmentKind.OTHER;
                        }
                    } else {
                        attachment.kind = AgentAttachmentKind.OTHER;
                    }
                    
                    attachmentRepository.persist(attachment);
                }
            }
        }
        
        return AgentTaskDto.from(task);
    }

    @Transactional
    public List<AgentTaskDto> listAll(AgentTaskStatus statusFilter) {
        List<AgentTaskEntity> entities = statusFilter != null
                ? taskRepository.findByStatus(statusFilter)
                : taskRepository.listAll();
        return entities.stream().map(AgentTaskDto::from).toList();
    }

    @Transactional
    public AgentTaskDto findById(String id) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        List<AgentTaskStepDto> steps = stepRepository.findByTaskOrderBySequence(task)
                .stream().map(AgentTaskStepDto::from).toList();
        List<AgentTaskAttachmentDto> attachments = attachmentRepository.findByTask(task)
                .stream().map(AgentTaskAttachmentDto::from).toList();
        List<AgentTaskActionDto> actions = actionRepository.findByTask(task)
                .stream().map(AgentTaskActionDto::from).toList();
        return AgentTaskDto.fromWithDetails(task, steps, attachments, actions);
    }

    @Transactional
    public AgentTaskDto cancel(String id) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        if (task.status == AgentTaskStatus.COMPLETED
                || task.status == AgentTaskStatus.FAILED
                || task.status == AgentTaskStatus.CANCELLED) {
            throw new BusinessException("Task is already in a terminal state: " + task.status);
        }
        task.cancelRequested = true;
        taskRepository.persist(task);
        return AgentTaskDto.from(task);
    }

    @Transactional
    public void delete(String id) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        actionRepository.delete("task", task);
        stepRepository.delete("task", task);
        attachmentRepository.delete("task", task);
        taskRepository.delete(task);
    }

    @Transactional
    public AgentTaskActionDto approveAction(String taskId, Long actionId) throws BusinessException {
        AgentTaskActionEntity action = requireAction(taskId, actionId);
        action.status = AgentTaskActionStatus.APPROVED;
        action.resolvedAt = java.time.LocalDateTime.now();
        actionRepository.persist(action);
        return AgentTaskActionDto.from(action);
    }

    @Transactional
    public AgentTaskActionDto rejectAction(String taskId, Long actionId) throws BusinessException {
        AgentTaskActionEntity action = requireAction(taskId, actionId);
        action.status = AgentTaskActionStatus.REJECTED;
        action.resolvedAt = java.time.LocalDateTime.now();
        actionRepository.persist(action);
        return AgentTaskActionDto.from(action);
    }

    private AgentTaskEntity requireTask(String id) throws BusinessException {
        AgentTaskEntity task = taskRepository.findById(id);
        if (task == null) {
            throw new BusinessException("Agent task not found: " + id);
        }
        return task;
    }

    private AgentTaskActionEntity requireAction(String taskId, Long actionId) throws BusinessException {
        requireTask(taskId);
        AgentTaskActionEntity action = actionRepository.findById(actionId);
        if (action == null || !taskId.equals(action.task.getId())) {
            throw new BusinessException("Action not found: " + actionId);
        }
        if (action.status != AgentTaskActionStatus.PENDING_APPROVAL) {
            throw new BusinessException("Action is not pending approval: " + action.status);
        }
        return action;
    }
}
