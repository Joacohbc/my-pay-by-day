package com.mypaybyday.service.ai;
import java.util.List;
import java.util.stream.Collectors;
import dev.langchain4j.data.message.ChatMessage;


public class PromptCollection {

    public static String getEventExtractionTemplate(
            String languageNote,
            String nodesList,
            String categoriesList,
            String tagsList,
            String userInstructions) {
        return PromptKey.EXTRACTION_TEMPLATE.getContent().formatted(
            languageNote,
            nodesList,
            categoriesList,
            tagsList,
            userInstructions
        );
    }

    public static String getSystemAgent(String now, String executionMode, String modeNote, String lang, boolean isResumed) {
        String stateNote = isResumed ? "This task was PAUSED and is now being RESUMED. Check the chat history to see where you left off." : "This is a NEW task.";
        return PromptKey.SYSTEM_AGENT.getContent().formatted(now, executionMode, modeNote, stateNote, lang, lang);
    }

    public static String getSystemChat(String now, String userLanguage) {
        return PromptKey.SYSTEM_CHAT.getContent().formatted(now, userLanguage, userLanguage);
    }

    public static String getSystemEventDescription(String userLanguage) {
        return PromptKey.SYSTEM_EVENT_DESCRIPTION.getContent().formatted(userLanguage);
    }

    public static String getSystemExtraction(String now, String userLanguage) {
        return PromptKey.SYSTEM_EXTRACTION.getContent().formatted(now, userLanguage);
    }

    public static String getSystemImages(String now, String userLanguage) {
        return PromptKey.SYSTEM_IMAGES.getContent().formatted(now, userLanguage);
    }

    public static String getSystemAudio() {
        return PromptKey.SYSTEM_AUDIO.getContent();
    }

    public static String getResumeWithFeedback(String userFeedback) {
        return PromptKey.RESUME_CONTEXT_WITH_FEEDBACK.getContent().formatted(userFeedback);
    }

    public static String getResumeAutomatic() {
        return PromptKey.RESUME_CONTEXT_AUTOMATIC.getContent();
    }

    public static String getCompactMemoryPrompt(String languageName, List<ChatMessage> messages) {
        String history = messages.stream()
            .map(m -> {
                String type = m.type().name();
                String text = "";
                if (m instanceof dev.langchain4j.data.message.AiMessage am) {
                    text = am.text();
                } else if (m instanceof dev.langchain4j.data.message.UserMessage um) {
                    text = um.singleText();
                } else if (m instanceof dev.langchain4j.data.message.SystemMessage sm) {
                    text = sm.text();
                } else if (m instanceof dev.langchain4j.data.message.ToolExecutionResultMessage trm) {
                    text = trm.text();
                } else {
                    text = m.toString();
                }
                return type + ": " + text;
            })
            .collect(Collectors.joining("\n"));
        return PromptKey.MEM_COMPACTION.getContent().formatted(languageName, history);
    }
}

