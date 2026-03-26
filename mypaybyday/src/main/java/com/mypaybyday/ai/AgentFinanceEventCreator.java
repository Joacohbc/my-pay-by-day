package com.mypaybyday.ai;

import java.time.LocalDateTime;

import org.jboss.logging.Logger;

import com.mypaybyday.i18n.LanguageContext;

import dev.langchain4j.data.image.Image;
import dev.langchain4j.data.message.UserMessage;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class AgentFinanceEventCreator {

    private static final Logger log = Logger.getLogger(AgentFinanceEventCreator.class);
    private final LanguageContext languageContext;
    private final ViewImageService viewImageService;
    private final CreateFinanceEventService createFinanceEventService;

    @Inject
    public AgentFinanceEventCreator(
            LanguageContext languageContext,
            ViewImageService viewImageService,
            CreateFinanceEventService createFinanceEventService) {
        this.languageContext = languageContext;
        this.viewImageService = viewImageService;
        this.createFinanceEventService = createFinanceEventService;
    }

    final String SYSTEM_PROMPT_FOR_IMAGES = """
Analyze the provided image and determine its type (receipt, invoice, ticket, etc.).
Extract the maximum amount of information possible to allow for the creation of one or more finance events.

Please extract and list the following details:
- Document Type (Receipt, Invoice, Tax document, etc.)
- Merchant/Provider name
- Date and Time of the transaction
- Total amount and Currency
- Individual line items (description and price)
- Taxes, tips, or fees
- Payment method
- Suggested category or tags

Generate a specific sentence for each individual item or piece of information identified in the image.
Provide a comprehensive and structured description of the image content.
""";

    final String SYSTEM_PROMPT_FOR_CHAT = """
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
- Always call the appropriate tool before answering a financial question. Never fabricate data.
- If a tool returns no data, say so clearly. Do not guess.

DATA MODEL:
1. FinanceEvent — The main record. Contains name, description, type (INBOUND/OUTBOUND/OTHER), a category, tags, and line items.
2. FinanceNode — Any entity that can hold, send, or receive money (OWN, EXTERNAL, CONTACT).
3. Category — A budget classification bucket.
4. Tag — A transversal label for cross-cutting grouping.
5. TimePeriod — A budget container with date range, budget limit, and savings goal.

GOLDEN RULES:
1. Be brief and direct. Use bullet points or short paragraphs.
2. NEVER invent financial data. Always use tool results.
3. When referencing amounts, always include the currency if available.
4. PLAIN TEXT ONLY: Never use Markdown. No bold, no italics, no headers, no tables.
""";

    private String buildSystemPrompt(String prompt) {
        String now = LocalDateTime.now().toString();
        String lang = languageContext.getLang();

        return prompt.formatted(now, lang);
    }

    public Image buildImage(String base64Data, String mimeType) {
        return Image.builder()
            .base64Data(base64Data)
            .mimeType(mimeType)
            .build();
    }

    public String processImage(String chatId, Image image) {
        String desc = viewImageService.viewImage(SYSTEM_PROMPT_FOR_IMAGES, image);

        log.infof("Description: %s", desc);
        String message = "IMAGE DESCRIPTION:\n-----------------------\n" + desc + "\n-----------------------\n";
        return processText(chatId, message);
    }

    public String processText(String chatId, String text) {
        String prompt = buildSystemPrompt(SYSTEM_PROMPT_FOR_CHAT);
        UserMessage userMessage = UserMessage.from(text);
        return createFinanceEventService.chat(chatId, prompt, userMessage);
    }
}
