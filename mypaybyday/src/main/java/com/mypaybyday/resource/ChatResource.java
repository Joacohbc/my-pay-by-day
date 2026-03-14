package com.mypaybyday.resource;

import com.mypaybyday.ai.FinanceAssistant;
import com.mypaybyday.dto.ChatRequestDto;
import com.mypaybyday.dto.ChatResponseDto;
import com.mypaybyday.i18n.LanguageContext;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

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

        String aiResponse = financeAssistant.chat(
                request.getChatId(),
                request.getMessage(),
                systemPrompt);
        return Response.ok(new ChatResponseDto(aiResponse)).build();
    }
}
