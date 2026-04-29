package com.mypaybyday.service.ai;

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

    public static String getSystemAgent(String now, String executionMode, String modeNote, String lang) {
        return PromptKey.SYSTEM_AGENT.getContent().formatted(now, executionMode, modeNote, lang);
    }

    public static String getSystemChat(String now, String userLanguage) {
        return PromptKey.SYSTEM_CHAT.getContent().formatted(now, userLanguage);
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
}
