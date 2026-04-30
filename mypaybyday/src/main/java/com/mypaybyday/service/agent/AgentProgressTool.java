package com.mypaybyday.service.agent;

import java.util.List;
import com.mypaybyday.entity.AgentTaskActionEntity;
import com.mypaybyday.entity.AgentTaskEntity;
import com.mypaybyday.entity.AgentTaskStepEntity;
import com.mypaybyday.enums.AgentTaskStatus;
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

    @Tool("Get the full history and context of this task. Use this when resuming a task to see all previous steps, user messages, and progress made so far.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String getTaskHistory() {
        AgentTaskEntity task = persistHelper.getTask(taskId);
        if (task == null) return "Task not found.";

        List<AgentTaskStepEntity> steps = persistHelper.getTaskSteps(taskId);
        List<AgentTaskActionEntity> actions = persistHelper.getTaskActions(taskId);
        
        if (steps.isEmpty() && actions.isEmpty()) return "No history found for this task.";

        List<AgentTaskStepEntity> plannedSteps = steps.stream().filter(s -> s.type == AgentTaskStepType.PLANNED_STEP).toList();
        List<AgentTaskStepEntity> progressSteps = steps.stream().filter(s -> s.type == AgentTaskStepType.PROGRESS || s.type == AgentTaskStepType.USER).toList();
        
        boolean isSuccessfullyCompleted = task.status == AgentTaskStatus.COMPLETED;
        int completedPlanCount = isSuccessfullyCompleted ? plannedSteps.size() : progressSteps.size();

        StringBuilder sb = new StringBuilder("Task History:\n");
        sb.append(String.format("Status: %s, Progress: %d%%\n", task.status, task.progress));
        
        sb.append("\n[STEPS]\n");
        for (AgentTaskStepEntity step : steps) {
            String type = step.type.name();
            String desc = step.description != null ? step.description : "";
            String content = step.content != null ? step.content : "";
            
            if (step.type == AgentTaskStepType.PLANNED_STEP) {
                int idx = plannedSteps.indexOf(step);
                String status = idx < completedPlanCount ? "COMPLETED" : "PENDING";
                sb.append(String.format("- [%s] %s\n", status, desc));
            } else {
                sb.append(String.format("- [%s] %s %s\n", type, desc, content).trim()).append("\n");
            }
        }
        
        if (!actions.isEmpty()) {
            sb.append("\n[ACTIONS / USER REQUESTS]\n");
            for (AgentTaskActionEntity action : actions) {
                sb.append(String.format("- [%s] Type: %s, Status: %s, Description/Payload: %s, Result: %s\n",
                    action.actionCreatedAt, action.actionType, action.status, action.payload, action.resultMessage));
            }
        }
        
        return sb.toString();
    }

    @Tool("Indicate that an error occurred and you will retry the current operation. Use when a tool call fails but a retry might succeed.")
    @AgentToolKind(AgentToolKind.Kind.META)
    public String reportRetry(@P("Reason for retrying.") String reason) {
        persistHelper.persistStep(taskId, AgentTaskStepType.RETRY, reason);
        log.infof("[AGENT RETRY] %s", reason);
        return "Retry recorded.";
    }
}
