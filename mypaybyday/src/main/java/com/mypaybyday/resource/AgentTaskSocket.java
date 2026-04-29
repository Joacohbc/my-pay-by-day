package com.mypaybyday.resource;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mypaybyday.dto.AgentTaskActionDto;
import com.mypaybyday.dto.AgentTaskStepDto;
import com.mypaybyday.service.agent.AgentTaskUpdatedEvent;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import org.jboss.logging.Logger;

@WebSocket(path = "/ws/agent-tasks/{taskId}")
@ApplicationScoped
public class AgentTaskSocket {

    private static final Logger log = Logger.getLogger(AgentTaskSocket.class);

    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketConnection> connections = new ConcurrentHashMap<>();

    public AgentTaskSocket(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @OnOpen
    public String onOpen(WebSocketConnection connection) {
        String taskId = connection.pathParam("taskId");
        connections.put(connection.id(), connection);
        log.infof("WebSocket opened for task %s, connection %s", taskId, connection.id());
        return "{\"type\":\"connected\",\"taskId\":\"" + taskId + "\"}";
    }

    @OnClose
    public void onClose(WebSocketConnection connection) {
        connections.remove(connection.id());
        log.infof("WebSocket closed: %s", connection.id());
    }

    public void onTaskUpdated(@Observes AgentTaskUpdatedEvent event) {
        String payload = serializeEvent(event);
        if (payload == null) return;
        connections.values().forEach(conn -> {
            String taskId = conn.pathParam("taskId");
            if (event.getTaskId().equals(taskId)) {
                conn.sendTextAndAwait(payload);
            }
        });
    }

    private String serializeEvent(AgentTaskUpdatedEvent event) {
        try {
            var dto = new WebSocketPayload(
                    event.getTaskId(),
                    event.getStatus().name(),
                    event.getProgress(),
                    event.getCurrentStep(),
                    event.getNewSteps(),
                    event.getNewActions()
            );
            return objectMapper.writeValueAsString(dto);
        } catch (JsonProcessingException e) {
            log.warnf("Failed to serialize WebSocket event for task %s", event.getTaskId());
            return null;
        }
    }

    record WebSocketPayload(
            String taskId,
            String status,
            int progress,
            String currentStep,
            List<AgentTaskStepDto> newSteps,
            List<AgentTaskActionDto> newActions
    ) {}
}
