package com.mypaybyday.service.agent;

import com.mypaybyday.enums.AgentTaskActionType;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;

public class AgentUserRequestTool {

    private final String taskId;
    private final AgentTaskPersistHelper persistHelper;
    private final AgentTaskExecutor agentTaskExecutor;

    public AgentUserRequestTool(String taskId, AgentTaskPersistHelper persistHelper, AgentTaskExecutor agentTaskExecutor) {
        this.taskId = taskId;
        this.persistHelper = persistHelper;
        this.agentTaskExecutor = agentTaskExecutor;
    }

    @Tool("Request user input, approval, or additional information. " +
        "You MUST use this tool whenever you cannot proceed without user providing data, confirming a write action, or giving feedback when results are ambiguous. " +
        "Calling this tool will PAUSE the task. " +
        "When this tool returns a response starting with 'PAUSED:', you MUST stop ALL further tool calls immediately " +
        "and write your final response explaining clearly what you need from the user and why.")
    public String requestUserInput(
            @P("Type of request: APPROVAL (user must approve/reject an action), INFORMATION (you need data only the user has), or FEEDBACK (you need guidance on how to proceed)") AgentTaskActionType requestType,
            @P("Single, concise paragraph explaining the context and asking for the specific info/decision as a natural question or comment.") String description,
            @P("Optional: additional context, proposed values, or a JSON payload relevant to the request. Leave empty if not needed.") String payload) {
        persistHelper.createUserRequest(taskId, requestType, description, payload);
        agentTaskExecutor.forcePause(taskId);
        return "PAUSED: Task has been paused waiting for user input. Request type: " + requestType + ". " + description;
    }
}
