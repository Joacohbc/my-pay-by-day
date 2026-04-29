package com.mypaybyday.service.agent;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.context.control.ActivateRequestContext;
import jakarta.inject.Named;
import jakarta.inject.Inject;

import com.mypaybyday.enums.AgentAttachmentKind;
import com.mypaybyday.enums.AgentTaskExecutionMode;
import com.mypaybyday.enums.AgentTaskStepType;
import com.mypaybyday.i18n.TimezoneContext;
import com.mypaybyday.service.ai.PromptCollection;
import com.mypaybyday.service.agent.AgentTaskPersistHelper.AttachmentFile;
import com.mypaybyday.service.ai.IAUtils;
import com.mypaybyday.service.ai.AgentToolKind;
import com.mypaybyday.service.ai.DbChatMemoryStore;
import com.mypaybyday.service.ai.FinanceAiTools;

import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolSpecification;
import dev.langchain4j.agent.tool.ToolSpecifications;
import dev.langchain4j.data.image.Image;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.V;
import dev.langchain4j.service.tool.DefaultToolExecutor;
import dev.langchain4j.service.tool.ToolExecutor;
import org.jboss.logging.Logger;

@ApplicationScoped
public class AgentTaskExecutor {

    private static final Logger log = Logger.getLogger(AgentTaskExecutor.class);
    private static final int MAX_CHAT_MESSAGES = 50;

    private final ChatModel agentChatModel;
    private final DbChatMemoryStore dbChatMemoryStore;
    private final FinanceAiTools financeAiTools;
    private final AgentTaskPersistHelper persistHelper;
    private final IAUtils agentFinanceEventCreator;
    private final DateConversionTool dateConversionTool;
    private final com.mypaybyday.i18n.TimezoneContext timezoneContext;

    // TODO: Review this implementation for scalability and robustness.
    // Consider using task queue for better performance and reliability in production environments.
    private final ExecutorService executorService = Executors.newCachedThreadPool();
    private final Map<String, Future<?>> runningTasks = new ConcurrentHashMap<>();

    @Inject
    AgentTaskExecutor self;

    public AgentTaskExecutor(
            @Named("agentChatModel") ChatModel agentChatModel,
            DbChatMemoryStore dbChatMemoryStore,
            FinanceAiTools financeAiTools,
            AgentTaskPersistHelper persistHelper,
            IAUtils agentFinanceEventCreator,
            DateConversionTool dateConversionTool,
            TimezoneContext timezoneContext) {
        this.agentChatModel = agentChatModel;
        this.dbChatMemoryStore = dbChatMemoryStore;
        this.financeAiTools = financeAiTools;
        this.persistHelper = persistHelper;
        this.agentFinanceEventCreator = agentFinanceEventCreator;
        this.dateConversionTool = dateConversionTool;
        this.timezoneContext = timezoneContext;
    }

    public void submit(String taskId) {
        Future<?> future = executorService.submit(() -> self.runTaskWithRequestContext(taskId));
        runningTasks.put(taskId, future);
    }

    @ActivateRequestContext
    public void runTaskWithRequestContext(String taskId) {
        runTask(taskId);
    }

    public void forceCancel(String taskId) {
        Future<?> future = runningTasks.remove(taskId);
        if (future != null) {
            future.cancel(true);
        }
        persistHelper.markCancelled(taskId);
    }

    public void forcePause(String taskId) {
        persistHelper.markPaused(taskId);
        Future<?> future = runningTasks.remove(taskId);
        if (future != null) {
            future.cancel(true);
        }
    }

    @PreDestroy
    void shutdown() {
        executorService.shutdownNow();
    }

    private void runTask(String taskId) {
        var task = persistHelper.markRunning(taskId);
        if (task == null) {
            log.warnf("Task not found or already in terminal state: %s", taskId);
            runningTasks.remove(taskId);
            return;
        }

        try {
            timezoneContext.setTimezone(task.getTimezone() != null ? task.getTimezone() : "UTC");
            List<AttachmentFile> attachments = persistHelper.loadAttachmentFiles(taskId);
            String enrichedInstruction = buildEnrichedInstruction(task.getUserInstruction(), attachments);
            
            boolean isResumed = persistHelper.hasPreviousSteps(taskId);
            String userFeedback = isResumed ? persistHelper.getLastUserFeedback(taskId) : null;
            String effectiveInstruction = userFeedback != null ? userFeedback : enrichedInstruction;
            
            AgentExecutionContext ctx = new AgentExecutionContext(
                task.getId(),
                effectiveInstruction,
                task.getExecutionMode(),
                task.getLang(),
                task.getTimezone(),
                isResumed
            );

            runAgentLoop(ctx);
        } catch (CancellationException | InterruptedException e) {
            handleInterrupt(taskId);
        } catch (Exception e) {
            if (isInterrupt(e)) {
                handleInterrupt(taskId);
            } else {
                log.errorf(e, "Agent task %s failed", taskId);
                persistHelper.markFailed(taskId, e.getMessage());
            }
        } finally {
            runningTasks.remove(taskId);
        }
    }

    private boolean isInterrupt(Throwable e) {
        Throwable cause = e;
        while (cause != null) {
            if (cause instanceof InterruptedException || cause instanceof CancellationException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private void handleInterrupt(String taskId) {
        Thread.currentThread().interrupt();
        if (!persistHelper.isPaused(taskId)) {
            persistHelper.markCancelled(taskId);
        }
    }

    private String buildEnrichedInstruction(String userInstruction, List<AttachmentFile> attachments) {
        if (attachments.isEmpty()) return userInstruction;
        StringBuilder sb = new StringBuilder(userInstruction);
        for (AttachmentFile att : attachments) {
            sb.append("\n\n");
            if (att.kind() == AgentAttachmentKind.IMAGE) {
                log.infof("Agent task: describing image attachment '%s' via vision model", att.fileName());
                String description = describeImageAttachment(att);
                sb.append("[ATTACHED IMAGE: ").append(att.fileName()).append("]\n").append(description);
            } else if (att.kind() == AgentAttachmentKind.PDF) {
                log.infof("Agent task: describing PDF attachment '%s' via vision model", att.fileName());
                String description = describePdfAttachment(att);
                sb.append("[ATTACHED PDF: ").append(att.fileName()).append("]\n").append(description);
            } else if (att.kind() == AgentAttachmentKind.TEXT
                    || att.kind() == AgentAttachmentKind.CSV
                    || att.kind() == AgentAttachmentKind.JSON) {
                String content = new String(att.data(), StandardCharsets.UTF_8);
                sb.append("[ATTACHED FILE: ").append(att.fileName()).append("]\n```\n")
                  .append(content).append("\n```");
            } else {
                sb.append("[ATTACHED FILE: ").append(att.fileName())
                  .append(" (").append(att.mimeType()).append(") — binary content not readable as text]");
            }
        }
        return sb.toString();
    }

    private String describeImageAttachment(AttachmentFile att) {
        try {
            String base64 = Base64.getEncoder().encodeToString(att.data());
            Image img = agentFinanceEventCreator.buildImage(base64, att.mimeType());
            return agentFinanceEventCreator.describeImages(List.of(img));
        } catch (Exception e) {
            log.warnf("Failed to describe image attachment '%s': %s", att.fileName(), e.getMessage());
            return "[Image could not be analyzed: " + e.getMessage() + "]";
        }
    }

    private String describePdfAttachment(AttachmentFile att) {
        try {
            String base64 = Base64.getEncoder().encodeToString(att.data());
            return agentFinanceEventCreator.describePdf(base64, att.mimeType());
        } catch (Exception e) {
            log.warnf("Failed to describe PDF attachment '%s': %s", att.fileName(), e.getMessage());
            return "[PDF could not be analyzed: " + e.getMessage() + "]";
        }
    }

    private void runAgentLoop(AgentExecutionContext ctx) throws InterruptedException {
        Map<ToolSpecification, ToolExecutor> toolMap = buildToolMap(ctx);

        AgentRunner agent = AiServices.builder(AgentRunner.class)
                .chatModel(agentChatModel)
                .tools(toolMap)
                .chatMemoryProvider(memoryId -> MessageWindowChatMemory.builder()
                        .chatMemoryStore(dbChatMemoryStore)
                        .maxMessages(MAX_CHAT_MESSAGES)
                        .id(memoryId)
                        .build())
                .build();

        if (Thread.interrupted()) throw new InterruptedException();
        if (persistHelper.isCancelRequested(ctx.taskId())) {
            throw new CancellationException("Cancel requested before agent start");
        }

        long startMs = System.currentTimeMillis();
        String response = agent.execute(ctx.taskId(), buildSystemPrompt(ctx), ctx.userInstruction());
        long durationMs = System.currentTimeMillis() - startMs;

        persistHelper.persistStep(ctx.taskId(), AgentTaskStepType.MESSAGE, null, response, durationMs);

        if (!persistHelper.isPaused(ctx.taskId())) {
            persistHelper.markCompleted(ctx.taskId());
        }
    }

    private Map<ToolSpecification, ToolExecutor> buildToolMap(AgentExecutionContext ctx) {
        Map<ToolSpecification, ToolExecutor> map = new LinkedHashMap<>();

        AgentProgressTool progressTool = new AgentProgressTool(ctx.taskId(), persistHelper);
        for (Method method : AgentProgressTool.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Tool.class)) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(progressTool, method));
            }
        }

        AgentUserRequestTool userRequestTool = new AgentUserRequestTool(ctx.taskId(), persistHelper, self);
        for (Method method : AgentUserRequestTool.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Tool.class)) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(userRequestTool, method));
            }
        }

        for (Method method : DateConversionTool.class.getDeclaredMethods()) {
            if (method.isAnnotationPresent(Tool.class)) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(dateConversionTool, method));
            }
        }

        for (Method method : FinanceAiTools.class.getDeclaredMethods()) {
            if (!method.isAnnotationPresent(Tool.class)) continue;

            AgentToolKind kindAnnotation = method.getAnnotation(AgentToolKind.class);
            AgentToolKind.Kind kind = kindAnnotation != null ? kindAnnotation.value() : AgentToolKind.Kind.READ;

            boolean included = switch (ctx.executionMode()) {
                case AUTONOMOUS -> kind == AgentToolKind.Kind.READ || kind == AgentToolKind.Kind.WRITE;
                case DRAFT_ONLY, READ_ONLY -> kind == AgentToolKind.Kind.READ;
            };

            if (included) {
                map.put(ToolSpecifications.toolSpecificationFrom(method),
                        new DefaultToolExecutor(financeAiTools, method));
            }
        }
        return map;
    }

    private String buildSystemPrompt(AgentExecutionContext ctx) {
        String now = DateConversionTool.formatNow(ctx.timezone());
        
        String modeNote = switch (ctx.executionMode()) {
            case AUTONOMOUS -> "You can read AND write data (create events, update categories, archive nodes, trigger subscriptions).";
            case DRAFT_ONLY -> "You can only READ data. Write operations are NOT available in this mode.";
            case READ_ONLY -> "You can only READ data. Write operations are NOT available in this mode.";
        };
        
        String languageName = switch (ctx.lang().toLowerCase()) {
            case "es" -> "Spanish";
            case "en" -> "English";
            default -> ctx.lang();
        };

        return PromptCollection.getSystemAgent(now, ctx.executionMode().name(), modeNote, languageName, ctx.isResumed());
    }

    interface AgentRunner {
        @dev.langchain4j.service.SystemMessage("{systemPrompt}")
        String execute(
                @MemoryId String chatId,
                @V("systemPrompt") String systemPrompt,
                @dev.langchain4j.service.UserMessage String userInstruction);
    }

    private record AgentExecutionContext(String taskId, String userInstruction, AgentTaskExecutionMode executionMode, String lang, String timezone, boolean isResumed) {}
}
