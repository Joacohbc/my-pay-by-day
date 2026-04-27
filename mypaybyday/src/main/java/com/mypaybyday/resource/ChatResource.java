package com.mypaybyday.resource;

import java.io.InputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.ChatResponseDto;
import com.mypaybyday.service.ai.IAUtils;
import com.mypaybyday.service.ai.ChatMemoryOnRAM;

import dev.langchain4j.data.image.Image;
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
@Path("/ai/chat")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Chat", description = "AI-powered chat endpoint for querying and managing financial information.")
public class ChatResource {

	private static final Logger log = Logger.getLogger(ChatResource.class);

	private final IAUtils agentFinanceEventCreator;
	private final ChatMemoryOnRAM chatMemoryBean;

	public ChatResource(
			IAUtils agentFinanceEventCreator,
			ChatMemoryOnRAM chatMemoryBean) {
		this.agentFinanceEventCreator = agentFinanceEventCreator;
		this.chatMemoryBean = chatMemoryBean;
	}

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
			@RestForm("images") List<FileUpload> images) {

		if (chatId == null || chatId.isBlank()) {
			return Response.status(Response.Status.BAD_REQUEST)
					.entity(new ChatResponseDto("chatId is required"))
					.build();
		}

		boolean hasImages = images != null && !images.isEmpty();

		try {
			String aiResponse;

			if (hasImages) {
				log.infof("Chat request [chatId=%s, imageCount=%d]", chatId, images.size());
				List<Image> extractedImages = new ArrayList<>();
				for (FileUpload img : images) {
					byte[] imageBytes;
					try (InputStream is = Files.newInputStream(img.uploadedFile())) {
						imageBytes = is.readAllBytes();
					}
					String base64Data = Base64.getEncoder().encodeToString(imageBytes);
					String mimeType = img.contentType();
					if (mimeType == null || mimeType.isBlank()) {
						mimeType = "image/jpeg";
					}
					extractedImages.add(agentFinanceEventCreator.buildImage(base64Data, mimeType));
				}
				aiResponse = agentFinanceEventCreator.processImages(chatId, extractedImages, message);
			} else {
				log.infof("Chat request [chatId=%s, mode=agent]", chatId);
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

	public static class TrimRequestDto {
		private String textToMatch;
		public String getTextToMatch() { return textToMatch; }
		public void setTextToMatch(String textToMatch) { this.textToMatch = textToMatch; }
	}

	@POST
	@Path("/{chatId}/trim")
	@Consumes(MediaType.APPLICATION_JSON)
	@Operation(summary = "Trim chat memory", description = "Trims the AI's memory from the last user message containing the specific text.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Memory trimmed"),
			@APIResponse(responseCode = "400", description = "Invalid request")
	})
	public Response trimMemory(
			@PathParam("chatId") String chatId,
			TrimRequestDto request) {

		if (chatId == null || chatId.isBlank() || request == null || request.getTextToMatch() == null) {
			return Response.status(Response.Status.BAD_REQUEST).build();
		}
		chatMemoryBean.trimFromMessageContent(chatId, request.getTextToMatch());
		return Response.ok().build();
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
