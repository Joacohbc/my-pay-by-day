package com.mypaybyday.dto;

import jakarta.validation.constraints.NotNull;

import com.mypaybyday.enums.AiTextAction;

public class AiTextRequestDto {

    @NotNull
    private AiTextAction action;

    private String context;

    private String currentValue;

    private String customPrompt;

    public AiTextAction getAction() { return action; }
    public void setAction(AiTextAction action) { this.action = action; }

    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }

    public String getCurrentValue() { return currentValue; }
    public void setCurrentValue(String currentValue) { this.currentValue = currentValue; }

    public String getCustomPrompt() { return customPrompt; }
    public void setCustomPrompt(String customPrompt) { this.customPrompt = customPrompt; }
}
