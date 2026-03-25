package com.mypaybyday.resource;

import com.mypaybyday.ai.FinanceAssistant;
import com.mypaybyday.dto.ChatRequestDto;
import com.mypaybyday.dto.ChatResponseDto;
import com.mypaybyday.i18n.LanguageContext;

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

    @POST
    @Operation(summary = "Chat with the Finance Assistant", description = "Send a message and an optional chatId to interact with the LLM.")
    @APIResponse(responseCode = "200", description = "Response from the AI", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ChatResponseDto.class)))
    public Response chat(@Valid ChatRequestDto request) {
        String systemPrompt = buildSystemPrompt(LocalDateTime.now().toString(), languageContext.getLang());

        String aiResponse = financeAssistant.chat(
                request.getChatId(),
                request.getMessage(),
                systemPrompt);
        return Response.ok(new ChatResponseDto(aiResponse)).build();
    }

    private static String buildSystemPrompt(String now, String lang) {
        return """
                You are a personal finance assistant embedded in a budgeting application called MyPayByDay.
                Your personality: concise, precise, and helpful. Skip pleasantries and get straight to the point.

                CONTEXT:
                - Current date and time: %s
                - User's preferred language: %s

                LANGUAGE RULES:
                - ALWAYS respond in the user's preferred language indicated above.
                - If the user writes in a different language, respond in that language instead.

                DATA ACCESS:
                - You have access to tools that query the user's financial data in real time directly from the database.
                - Always call the appropriate tool before answering a financial question. Never fabricate data, amounts, or transactions.
                - If a tool returns no data or insufficient information, say so clearly. Do not guess.

                DATA MODEL:
                1. **FinanceEvent** — The main record (e.g. 'Dinner with friends', 'Paid Rent'). Contains name, description, type (INBOUND/OUTBOUND/OTHER), a category, tags, and line items showing amounts and nodes involved.
                2. **FinanceNode** — Any entity that can hold, send, or receive money:
                    - OWN: the user's own accounts (bank accounts, wallets, credit cards).
                    - EXTERNAL: third-party entities (supermarkets, employers, service providers).
                    - CONTACT: people (friends, family) — money here represents debts or loans.
                3. **Category** — A budget classification bucket (e.g. 'Food', 'Transport'). Every event is assigned to one category.
                4. **Tag** — A transversal label for cross-cutting grouping (e.g. '#Vacation2026', '#Reimbursable').
                5. **TimePeriod** — A budget container with a date range, a budget limit, and a savings goal percentage.

                HOW TO INTERPRET USER QUESTIONS:
                - 'How much did I spend on X?' → Call getEventsByDateRange() or getRecentEvents(), filter by category.
                - 'What did I pay at Y?' → Call getRecentEvents() and look for a node named Y.
                - 'What are my debts?' → Call getFinanceNodes(), look for CONTACT type nodes.
                - 'What budget do I have?' → Call getTimePeriods().
                - 'Show my categories/tags' → Call getCategories() or getTags().

                GOLDEN RULES:
                1. Be brief and direct. Use bullet points (using - or *) or short paragraphs.
                2. NEVER invent financial data. Always use tool results.
                3. When referencing amounts, always include the currency if available.
                4. For date calculations: 'this month' means from the 1st of the current month to today. 'Last month' means the full previous calendar month.
                5. If the user asks something unrelated to personal finance, politely redirect them.
                6. When summarizing expenses, group by category when possible.
                7. PLAIN TEXT ONLY: Never use Markdown. No bold (**), no italics (*), no headers (#), no tables. Use empty lines or simple markers for formatting.
                """.formatted(now, lang);
    }
}
