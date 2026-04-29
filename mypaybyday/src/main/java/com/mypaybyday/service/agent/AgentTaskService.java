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
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.service.FileService;

@ApplicationScoped
public class AgentTaskService {

    private final AgentTaskRepository taskRepository;
    private final AgentTaskStepRepository stepRepository;
    private final AgentTaskAttachmentRepository attachmentRepository;
    private final AgentTaskActionRepository actionRepository;
    private final FileService fileService;
    private final LanguageContext languageContext;

    public AgentTaskService(
            AgentTaskRepository taskRepository,
            AgentTaskStepRepository stepRepository,
            AgentTaskAttachmentRepository attachmentRepository,
            AgentTaskActionRepository actionRepository,
            FileService fileService,
            LanguageContext languageContext) {
        this.taskRepository = taskRepository;
        this.stepRepository = stepRepository;
        this.attachmentRepository = attachmentRepository;
        this.actionRepository = actionRepository;
        this.fileService = fileService;
        this.languageContext = languageContext;
    }

    @Transactional
    public AgentTaskDto submit(AgentTaskSubmitDto dto) throws BusinessException {
        if (dto.getInstruction() == null || dto.getInstruction().isBlank()) {
            throw new BusinessException("Instruction is required.");
        }
        AgentTaskEntity task = new AgentTaskEntity();
        task.userInstruction = dto.getInstruction();
        task.executionMode = dto.getExecutionMode();
        task.lang = languageContext.getLang();
        task.status = AgentTaskStatus.PENDING;
        taskRepository.persist(task);
        
        if (dto.getFileIds() != null && !dto.getFileIds().isEmpty()) {
            for (Long fileId : dto.getFileIds()) {
                attachFile(task, fileId);
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

    private void attachFile(AgentTaskEntity task, Long fileId) {
        FileEntity file = fileService.getFileContent(fileId);
        AgentTaskAttachmentEntity attachment = new AgentTaskAttachmentEntity();
        attachment.task = task;
        attachment.file = file;
        attachment.originalName = file.fileName;
        attachment.mimeType = file.mimeType;
        attachment.sizeBytes = file.size;
        attachment.kind = resolveAttachmentKind(file.mimeType);
        attachmentRepository.persist(attachment);
    }

    private AgentAttachmentKind resolveAttachmentKind(String mimeType) {
        if (mimeType == null) return AgentAttachmentKind.OTHER;
        if (mimeType.startsWith("image/")) return AgentAttachmentKind.IMAGE;
        if (mimeType.equals("application/pdf")) return AgentAttachmentKind.PDF;
        if (mimeType.equals("text/csv")) return AgentAttachmentKind.CSV;
        if (mimeType.equals("application/json")) return AgentAttachmentKind.JSON;
        if (mimeType.startsWith("text/")) return AgentAttachmentKind.TEXT;
        return AgentAttachmentKind.OTHER;
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
