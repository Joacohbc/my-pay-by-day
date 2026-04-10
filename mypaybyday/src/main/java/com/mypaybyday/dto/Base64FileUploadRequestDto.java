package com.mypaybyday.dto;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Request object for base64 file upload")
public record Base64FileUploadRequestDto(
	@Schema(description = "Name of the file", required = true)
	String fileName,

	@Schema(description = "Mime type of the file (e.g. image/png)", required = true)
	String mimeType,

	@Schema(description = "Base64 encoded string of the file content", required = true)
	String base64Content
) {}
