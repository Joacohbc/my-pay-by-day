package com.mypaybyday.service.agent;

import java.time.LocalDateTime;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.AgentTaskActionDto;
import com.mypaybyday.dto.AgentTaskActionResolveDto;
import com.mypaybyday.dto.AgentTaskAttachmentDto;
import com.mypaybyday.dto.AgentTaskDto;
import com.mypaybyday.dto.AgentTaskMessageDto;
import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.enums.AgentTaskStepType;
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
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;
import com.mypaybyday.service.FileService;

@ApplicationScoped
public class AgentTaskService {

    private final AgentTaskRepository taskRepository;
    private final AgentTaskStepRepository stepRepository;
    private final AgentTaskAttachmentRepository attachmentRepository;
    private final AgentTaskActionRepository actionRepository;
    private final AgentTaskPersistHelper persistHelper;
    private final FileService fileService;
    private final LanguageContext languageContext;
    private final TimezoneContext timezoneContext;
    private final Messages messages;

    public AgentTaskService(
            AgentTaskRepository taskRepository,
            AgentTaskStepRepository stepRepository,
            AgentTaskAttachmentRepository attachmentRepository,
            AgentTaskActionRepository actionRepository,
            AgentTaskPersistHelper persistHelper,
            FileService fileService,
            LanguageContext languageContext,
            TimezoneContext timezoneContext,
            Messages messages) {
        this.taskRepository = taskRepository;
        this.stepRepository = stepRepository;
        this.attachmentRepository = attachmentRepository;
        this.actionRepository = actionRepository;
        this.persistHelper = persistHelper;
        this.fileService = fileService;
        this.languageContext = languageContext;
        this.timezoneContext = timezoneContext;
        this.messages = messages;
    }

    @Transactional
    public AgentTaskDto submit(AgentTaskSubmitDto dto) throws BusinessException {
        if (dto.getInstruction() == null || dto.getInstruction().isBlank()) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_INSTRUCTION_REQUIRED));
        }
        AgentTaskEntity task = new AgentTaskEntity();
        task.userInstruction = dto.getInstruction();
        task.executionMode = dto.getExecutionMode();
        task.lang = languageContext.getLang();
        task.timezone = timezoneContext.getTimezone();
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
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        task.cancelRequested = true;
        taskRepository.persist(task);
        return AgentTaskDto.from(task);
    }

    @Transactional
    public AgentTaskDto pause(String id) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        if (task.status == AgentTaskStatus.COMPLETED
                || task.status == AgentTaskStatus.FAILED
                || task.status == AgentTaskStatus.CANCELLED) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        task.status = AgentTaskStatus.PAUSED;
        taskRepository.persist(task);
        return AgentTaskDto.from(task);
    }

    @Transactional
    public AgentTaskDto resume(String id) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        if (task.status == AgentTaskStatus.COMPLETED
                || task.status == AgentTaskStatus.FAILED
                || task.status == AgentTaskStatus.CANCELLED) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        List<AgentTaskActionEntity> pendingActions = actionRepository.findPendingByTask(task);
        if (!pendingActions.isEmpty()) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_PENDING_ACTIONS));
        }
        task.status = AgentTaskStatus.PENDING;
        taskRepository.persist(task);
        return AgentTaskDto.from(task);
    }

    @Transactional
    public AgentTaskDto sendMessage(String id, AgentTaskMessageDto dto) throws BusinessException {
        if (dto == null || dto.message() == null || dto.message().isBlank()) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_INSTRUCTION_REQUIRED));
        }
        AgentTaskEntity task = requireTask(id);
        if (task.status == AgentTaskStatus.CANCELLED) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        
        if (task.status == AgentTaskStatus.RUNNING || task.status == AgentTaskStatus.RETRYING) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        
        persistHelper.persistStep(id, AgentTaskStepType.USER, dto.message());

        if (dto.fileIds() != null) {
            for (Long fileId : dto.fileIds()) {
                attachFile(task, fileId);
            }
        }
        
        task.status = AgentTaskStatus.PENDING;
        task.cancelRequested = false;
        taskRepository.persist(task);
        persistHelper.fireTaskUpdated(id);
        return AgentTaskDto.from(task);
    }

    @Transactional
    public AgentTaskDto updateExecutionMode(String id, com.mypaybyday.enums.AgentTaskExecutionMode mode) throws BusinessException {
        AgentTaskEntity task = requireTask(id);
        if (task.status == AgentTaskStatus.RUNNING || task.status == AgentTaskStatus.RETRYING) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_TERMINAL_STATE, task.status));
        }
        task.executionMode = mode;
        taskRepository.persist(task);
        persistHelper.fireTaskUpdated(id);
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
    public AgentTaskActionDto approveAction(String taskId, Long actionId, AgentTaskActionResolveDto dto) throws BusinessException {
        AgentTaskActionEntity action = requireAction(taskId, actionId);
        action.status = AgentTaskActionStatus.APPROVED;
        action.resolvedAt = LocalDateTime.now();
        if (dto != null && dto.feedback() != null && !dto.feedback().isBlank()) {
            action.resultMessage = dto.feedback();
        }
        actionRepository.persist(action);
        String feedback = action.resultMessage != null ? action.resultMessage : messages.get(MsgKey.AGENT_TASK_ACTION_APPROVED);
        persistHelper.persistStep(taskId, AgentTaskStepType.USER, feedback);
        persistHelper.fireTaskUpdated(taskId);
        return AgentTaskActionDto.from(action);
    }

    @Transactional
    public AgentTaskActionDto rejectAction(String taskId, Long actionId, AgentTaskActionResolveDto dto) throws BusinessException {
        AgentTaskActionEntity action = requireAction(taskId, actionId);
        action.status = AgentTaskActionStatus.REJECTED;
        action.resolvedAt = LocalDateTime.now();
        if (dto != null && dto.feedback() != null && !dto.feedback().isBlank()) {
            action.resultMessage = dto.feedback();
        }
        actionRepository.persist(action);
        String feedback = action.resultMessage != null ? action.resultMessage : messages.get(MsgKey.AGENT_TASK_ACTION_REJECTED);
        persistHelper.persistStep(taskId, AgentTaskStepType.USER, feedback);
        persistHelper.fireTaskUpdated(taskId);
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
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_NOT_FOUND, id));
        }
        return task;
    }

    private AgentTaskActionEntity requireAction(String taskId, Long actionId) throws BusinessException {
        requireTask(taskId);
        AgentTaskActionEntity action = actionRepository.findById(actionId);
        if (action == null || !taskId.equals(action.task.getId())) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_ACTION_NOT_FOUND, actionId));
        }
        if (action.status != AgentTaskActionStatus.PENDING_APPROVAL) {
            throw new BusinessException(messages.get(MsgKey.AGENT_TASK_ACTION_NOT_PENDING, action.status));
        }
        return action;
    }
}
