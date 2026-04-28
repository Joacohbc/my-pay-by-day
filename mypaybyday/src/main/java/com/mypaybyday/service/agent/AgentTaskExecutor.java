package com.mypaybyday.service.agent;

import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
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
            IAUtils agentFinanceEventCreator) {
        this.agentChatModel = agentChatModel;
        this.dbChatMemoryStore = dbChatMemoryStore;
        this.financeAiTools = financeAiTools;
        this.persistHelper = persistHelper;
        this.agentFinanceEventCreator = agentFinanceEventCreator;
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
            List<AttachmentFile> attachments = persistHelper.loadAttachmentFiles(taskId);
            String enrichedInstruction = buildEnrichedInstruction(task.getUserInstruction(), attachments);
            AgentExecutionContext ctx = new AgentExecutionContext(task.getId(), enrichedInstruction, task.getExecutionMode());
            runAgentLoop(ctx);
        } catch (CancellationException | InterruptedException e) {
            Thread.currentThread().interrupt();
            persistHelper.markCancelled(taskId);
        } catch (Exception e) {
            log.errorf(e, "Agent task %s failed", taskId);
            persistHelper.markFailed(taskId, e.getMessage());
        } finally {
            runningTasks.remove(taskId);
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

    private void runAgentLoop(AgentExecutionContext ctx) throws InterruptedException {
        Map<ToolSpecification, ToolExecutor> toolMap = buildToolMap(ctx.executionMode());

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

        persistHelper.persistStep(ctx.taskId(),
                AgentTaskStepType.MESSAGE, null, null, null,
                response, 0, 0, durationMs);

        persistHelper.markCompleted(ctx.taskId(), response);
    }

    private Map<ToolSpecification, ToolExecutor> buildToolMap(AgentTaskExecutionMode mode) {
        Map<ToolSpecification, ToolExecutor> map = new LinkedHashMap<>();
        for (Method method : FinanceAiTools.class.getDeclaredMethods()) {
            if (!method.isAnnotationPresent(Tool.class)) continue;

            AgentToolKind kindAnnotation = method.getAnnotation(AgentToolKind.class);
            AgentToolKind.Kind kind = kindAnnotation != null ? kindAnnotation.value() : AgentToolKind.Kind.READ;

            boolean included = switch (mode) {
                case AUTONOMOUS -> true;
                case DRAFT_ONLY -> kind == AgentToolKind.Kind.READ || kind == AgentToolKind.Kind.META;
                case READ_ONLY -> kind == AgentToolKind.Kind.READ || kind == AgentToolKind.Kind.META;
            };

            if (included) {
                ToolSpecification spec = ToolSpecifications.toolSpecificationFrom(method);
                map.put(spec, new DefaultToolExecutor(financeAiTools, method));
            }
        }
        return map;
    }

    private String buildSystemPrompt(AgentExecutionContext ctx) {
        String now = LocalDateTime.now().toString();
        String modeNote = switch (ctx.executionMode()) {
            case AUTONOMOUS -> "You can read AND write data (create events, update categories, archive nodes, trigger subscriptions).";
            case DRAFT_ONLY -> "You can only READ data. Write operations are NOT available in this mode.";
            case READ_ONLY -> "You can only READ data. Write operations are NOT available in this mode.";
        };
        return PromptCollection.getSystemAgent(now, ctx.executionMode().name(), modeNote);
    }

    interface AgentRunner {
        @dev.langchain4j.service.SystemMessage("{systemPrompt}")
        String execute(
                @MemoryId String chatId,
                @V("systemPrompt") String systemPrompt,
                @dev.langchain4j.service.UserMessage String userInstruction);
    }

    private record AgentExecutionContext(String taskId, String userInstruction, AgentTaskExecutionMode executionMode) {}
}
