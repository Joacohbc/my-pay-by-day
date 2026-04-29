package com.mypaybyday.resource;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.AgentTaskActionResolveDto;
import com.mypaybyday.dto.AgentTaskDto;
import com.mypaybyday.dto.AgentTaskSubmitDto;
import com.mypaybyday.enums.AgentTaskStatus;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.agent.AgentTaskExecutor;
import com.mypaybyday.service.agent.AgentTaskService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/agent-tasks")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Agent Tasks", description = "Background AI agent tasks")
public class AgentTaskResource {

    private final AgentTaskService agentTaskService;
    private final AgentTaskExecutor agentTaskExecutor;

    public AgentTaskResource(AgentTaskService agentTaskService, AgentTaskExecutor agentTaskExecutor) {
        this.agentTaskService = agentTaskService;
        this.agentTaskExecutor = agentTaskExecutor;
    }

    @POST
    @Operation(summary = "Submit a new agent task")
    @APIResponses({
            @APIResponse(responseCode = "202", description = "Task accepted and queued",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = AgentTaskDto.class))),
            @APIResponse(responseCode = "400", description = "Invalid request")
    })
    public Response submit(AgentTaskSubmitDto dto) throws BusinessException {
        AgentTaskDto task = agentTaskService.submit(dto);
        agentTaskExecutor.submit(task.id());
        return Response.accepted(task).build();
    }

    @GET
    @Operation(summary = "List all agent tasks")
    @APIResponse(responseCode = "200", description = "List of agent tasks")
    public Response listAll(
            @Parameter(description = "Filter by status") @QueryParam("status") AgentTaskStatus status) {
        return Response.ok(agentTaskService.listAll(status)).build();
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get agent task by ID with steps, attachments, and actions")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Task found"),
            @APIResponse(responseCode = "404", description = "Task not found")
    })
    public Response getById(
            @Parameter(description = "Task ID", required = true) @PathParam("id") String id)
            throws BusinessException {
        return Response.ok(agentTaskService.findById(id)).build();
    }

    @POST
    @Path("/{id}/cancel")
    @Operation(summary = "Request cancellation of a running task")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Cancel requested"),
            @APIResponse(responseCode = "400", description = "Task already in terminal state"),
            @APIResponse(responseCode = "404", description = "Task not found")
    })
    public Response cancel(
            @Parameter(description = "Task ID", required = true) @PathParam("id") String id)
            throws BusinessException {
        AgentTaskDto task = agentTaskService.cancel(id);
        agentTaskExecutor.forceCancel(id);
        return Response.ok(task).build();
    }

    @POST
    @Path("/{id}/pause")
    @Operation(summary = "Pause a running task")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Task paused"),
            @APIResponse(responseCode = "400", description = "Task already in terminal state"),
            @APIResponse(responseCode = "404", description = "Task not found")
    })
    public Response pause(
            @Parameter(description = "Task ID", required = true) @PathParam("id") String id)
            throws BusinessException {
        AgentTaskDto task = agentTaskService.pause(id);
        agentTaskExecutor.forcePause(id);
        return Response.ok(task).build();
    }

    @POST
    @Path("/{id}/resume")
    @Operation(summary = "Resume an interrupted task")
    @APIResponses({
            @APIResponse(responseCode = "202", description = "Task resumed"),
            @APIResponse(responseCode = "404", description = "Task not found")
    })
    public Response resume(
            @Parameter(description = "Task ID", required = true) @PathParam("id") String id)
            throws BusinessException {
        AgentTaskDto task = agentTaskService.resume(id);
        agentTaskExecutor.submit(id);
        return Response.accepted(task).build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete an agent task and all its data")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Task deleted"),
            @APIResponse(responseCode = "404", description = "Task not found")
    })
    public Response delete(
            @Parameter(description = "Task ID", required = true) @PathParam("id") String id)
            throws BusinessException {
        agentTaskService.delete(id);
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/actions/{actionId}/approve")
    @Operation(summary = "Approve a pending agent action and optionally provide feedback to resume the agent")
    @APIResponses({
            @APIResponse(responseCode = "202", description = "Action approved, agent will resume if task was paused"),
            @APIResponse(responseCode = "400", description = "Action not pending"),
            @APIResponse(responseCode = "404", description = "Task or action not found")
    })
    public Response approveAction(
            @PathParam("id") String taskId,
            @PathParam("actionId") Long actionId,
            AgentTaskActionResolveDto dto) throws BusinessException {
        agentTaskService.approveAction(taskId, actionId, dto);
        agentTaskExecutor.submit(taskId);
        return Response.accepted().build();
    }

    @POST
    @Path("/{id}/actions/{actionId}/reject")
    @Operation(summary = "Reject a pending agent action and optionally provide feedback to resume the agent")
    @APIResponses({
            @APIResponse(responseCode = "202", description = "Action rejected, agent will resume if task was paused"),
            @APIResponse(responseCode = "400", description = "Action not pending"),
            @APIResponse(responseCode = "404", description = "Task or action not found")
    })
    public Response rejectAction(
            @PathParam("id") String taskId,
            @PathParam("actionId") Long actionId,
            AgentTaskActionResolveDto dto) throws BusinessException {
        agentTaskService.rejectAction(taskId, actionId, dto);
        agentTaskExecutor.submit(taskId);
        return Response.accepted().build();
    }
}
