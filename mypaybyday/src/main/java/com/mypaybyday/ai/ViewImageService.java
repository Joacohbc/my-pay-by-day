package com.mypaybyday.ai;

import dev.langchain4j.data.image.Image;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import io.quarkiverse.langchain4j.RegisterAiService;

@RegisterAiService
public interface ViewImageService {
    @SystemMessage("{systemMessage}")
    String viewImage(String systemMessage, @UserMessage Image image);
}
