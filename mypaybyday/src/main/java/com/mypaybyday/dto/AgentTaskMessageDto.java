package com.mypaybyday.dto;

import java.util.List;

public record AgentTaskMessageDto(String message, List<Long> fileIds) {}
