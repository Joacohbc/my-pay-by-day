package com.mypaybyday.resource;

import com.mypaybyday.ai.AgentFinanceEventCreator;
import com.mypaybyday.ai.ChatMemoryOnRAM;
import com.mypaybyday.dto.ChatResponseDto;
import com.mypaybyday.i18n.LanguageContext;

import dev.langchain4j.data.image.Image;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.io.InputStream;
import java.nio.file.Files;
import java.util.Base64;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/**
 * Unified chat endpoint.
 * Accepts multipart/form-data with optional image attachment.
 * When 'mode' is 'agent' (or an image is supplied), the FinanceAgent is used.
 * Otherwise, the read-only FinanceAssistant performs the query.
 */
@Path("/chat")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Chat", description = "AI-powered chat endpoint for querying and managing financial information.")
public class ChatResource {

    private static final Logger log = Logger.getLogger(ChatResource.class);

    @Inject
    AgentFinanceEventCreator agentFinanceEventCreator;

    @Inject
    LanguageContext languageContext;

    @Inject
    ChatMemoryOnRAM chatMemoryBean;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Operation(
            summary = "Chat with the Finance Assistant",
            description = "Send a message with an optional image attachment and a chatId. "
                    + "Use mode='agent' (or attach an image) for creating events/drafts via the agent. "
                    + "Use mode='query' (default, no image) for read-only queries.")
    @APIResponses({
            @APIResponse(responseCode = "200", description = "Response from the AI",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON,
                            schema = @Schema(implementation = ChatResponseDto.class))),
            @APIResponse(responseCode = "400", description = "Invalid request or image processing failed")
    })
    public Response chat(
            @RestForm String chatId,
            @RestForm String message,
            @RestForm String mode,
            @RestForm("image") FileUpload image) {

        if (chatId == null || chatId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ChatResponseDto("chatId is required"))
                    .build();
        }

        boolean hasImage = image != null;

        try {
            String aiResponse;
            String base64Data = null;
            String mimeType = null;

            if (hasImage) {
                byte[] imageBytes;
                try (InputStream is = Files.newInputStream(image.uploadedFile())) {
                    imageBytes = is.readAllBytes();
                }
                base64Data = Base64.getEncoder().encodeToString(imageBytes);
                mimeType = image.contentType();
                if (mimeType == null || mimeType.isBlank()) {
                    mimeType = "image/jpeg";
                }
                log.infof("Chat request [chatId=%s, mode=agent, mimeType=%s, imageSize=%d bytes]", chatId, mimeType, imageBytes.length);
            } else {
                log.infof("Chat request [chatId=%s, mode=agent]", chatId);
            }

            if(hasImage) {
                Image imageIa = agentFinanceEventCreator.buildImage(base64Data, mimeType);
                aiResponse = agentFinanceEventCreator.processImage(chatId, imageIa);
            } else {
                aiResponse = agentFinanceEventCreator.processText(chatId, message);
            }

            return Response.ok(new ChatResponseDto(aiResponse)).build();

        } catch (Exception e) {
            log.errorf(e, "Failed to process chat request");
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new ChatResponseDto("Failed to process request: " + e.getMessage()))
                    .build();
        }
    }

    @DELETE
    @Path("/{chatId}")
    @Operation(summary = "Clear chat memory", description = "Clears the AI's memory for a specific chatId.")
    @APIResponses({
            @APIResponse(responseCode = "204", description = "Memory cleared"),
            @APIResponse(responseCode = "400", description = "Invalid chatId")
    })
    public Response clearMemory(@PathParam("chatId") String chatId) {
        if (chatId == null || chatId.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        chatMemoryBean.clear(chatId);
        return Response.noContent().build();
    }
}
