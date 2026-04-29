package com.mypaybyday.service.agent;

import com.mypaybyday.enums.AgentTaskStepType;
import com.mypaybyday.service.ai.AgentToolKind;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import io.quarkus.runtime.annotations.RegisterForReflection;
import org.jboss.logging.Logger;

@RegisterForReflection
public class AgentProgressTool {

    private static final Logger log = Logger.getLogger(AgentProgressTool.class);

    private final String taskId;
    private final AgentTaskPersistHelper persistHelper;

    AgentProgressTool(String taskId, AgentTaskPersistHelper persistHelper) {
        this.taskId = taskId;
        this.persistHelper = persistHelper;
    }

    @Tool("Declare the execution plan for this task. Call ONCE at the very start with the ordered list of steps you plan to take.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String setPlan(@P("Ordered list of step descriptions.") String[] steps) {
        for (String step : steps) {
            persistHelper.persistStep(taskId, AgentTaskStepType.PLANNED_STEP, step);
        }
        log.infof("[AGENT PLAN] %d steps registered for task %s", steps.length, taskId);
        return "Plan registered: " + steps.length + " steps.";
    }

    @Tool("Report current progress. Call after completing each planned step.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String reportProgress(
            @P("Progress percentage (0-100).") int percent,
            @P("Short description of the completed step.") String description) {
        persistHelper.fireProgressUpdate(taskId, percent, description);
        persistHelper.persistStep(taskId, AgentTaskStepType.PROGRESS, description);
        log.infof("[AGENT PROGRESS %d%%] %s", percent, description);
        return String.format("Progress: %d%% - %s", percent, description);
    }

    @Tool("Send a message or commentary to the user. Use for warnings, clarifications, or notes that are not part of the planned progress.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String sendMessage(@P("Message to display to the user.") String message) {
        persistHelper.persistStep(taskId, AgentTaskStepType.MESSAGE, message);
        log.infof("[AGENT MESSAGE] %s", message);
        return "Message sent to user.";
    }

    @Tool("Indicate that an error occurred and you will retry the current operation. Use when a tool call fails but a retry might succeed.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String reportRetry(@P("Reason for retrying.") String reason) {
        persistHelper.persistStep(taskId, AgentTaskStepType.RETRY, reason);
        log.infof("[AGENT RETRY] %s", reason);
        return "Retry recorded.";
    }
}
