package com.mypaybyday.resource;

import com.mypaybyday.ai.FinanceAssistant;
import com.mypaybyday.dto.ChatRequestDto;
import com.mypaybyday.dto.ChatResponseDto;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;

import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.time.LocalDateTime;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Chat", description = "AI-powered chat bot endpoint for querying financial information.")
public class ChatResource {

    @Inject
    FinanceAssistant financeAssistant;

    @Inject
    LanguageContext languageContext;

    @Inject
    Messages messages;

    @POST
    @Operation(summary = "Chat with the Finance Assistant", description = "Send a message and an optional chatId to interact with the LLM.")
    @APIResponse(responseCode = "200", description = "Response from the AI", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ChatResponseDto.class)))
    public Response chat(@Valid ChatRequestDto request) {
        String systemPrompt = messages.get(
                MsgKey.AI_SYSTEM_PROMPT,
                LocalDateTime.now().toString(),
                languageContext.getLang());

        UserMessage userMessage;
        
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            String base64Image = request.getImage();
            String mimeType = "image/jpeg"; // default
            
            // Extract mime type if it's a data URL
            if (base64Image.startsWith("data:")) {
                int commaIndex = base64Image.indexOf(',');
                if (commaIndex > 5) {
                    mimeType = base64Image.substring(5, base64Image.indexOf(';'));
                    base64Image = base64Image.substring(commaIndex + 1);
                }
            }
            
            userMessage = UserMessage.from(
                TextContent.from(request.getMessage()),
                ImageContent.from(base64Image, mimeType)
            );
        } else {
            userMessage = UserMessage.from(request.getMessage());
        }

        String aiResponse = financeAssistant.chat(
                request.getChatId(),
                userMessage,
                systemPrompt);
        return Response.ok(new ChatResponseDto(aiResponse)).build();
    }
}
