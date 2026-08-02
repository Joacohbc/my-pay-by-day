package com.mypaybyday.dto;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * The single error envelope every failed request answers with, whatever the status code.
 *
 * @param error Localized, human-readable description of what went wrong.
 */
@Schema(name = "ErrorResponse", description = "Error envelope returned by every failed request")
public record ErrorResponseDto(String error) {
}
