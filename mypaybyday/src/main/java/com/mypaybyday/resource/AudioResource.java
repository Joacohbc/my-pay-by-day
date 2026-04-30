package com.mypaybyday.resource;

import java.io.InputStream;
import java.nio.file.Files;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.service.ai.AudioTranscriptionService;
import com.mypaybyday.dto.AudioTranscriptionDto;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/ai/audio")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "Audio", description = "Audio transcription endpoint.")
public class AudioResource {

	private static final Logger log = Logger.getLogger(AudioResource.class);

	private final AudioTranscriptionService audioTranscriptionService;

	public AudioResource(AudioTranscriptionService audioTranscriptionService) {
		this.audioTranscriptionService = audioTranscriptionService;
	}

	private static String resolveBaseMimeType(String mimeType) {
		if (mimeType == null || mimeType.isBlank()) {
			return "";
		}

		int semicolonIndex = mimeType.indexOf(';');
		if (semicolonIndex > 0) {
			return mimeType.substring(0, semicolonIndex).trim().toLowerCase();
		}

		return mimeType.trim().toLowerCase();
	}

	private static boolean isWavMimeType(String mimeType) {
		String resolvedMimeType = resolveBaseMimeType(mimeType);
		return "audio/wav".equals(resolvedMimeType)
				|| "audio/x-wav".equals(resolvedMimeType)
				|| "audio/wave".equals(resolvedMimeType);
	}

	private static boolean hasWavExtension(String fileName) {
		if (fileName == null || fileName.isBlank()) {
			return false;
		}

		return fileName.trim().toLowerCase().endsWith(".wav");
	}

	@POST
	@Path("/transcribe")
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Operation(
			summary = "Transcribe audio",
			description = "Accepts only WAV audio files and returns the transcription produced by the configured audio model.")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Transcription successful",
					content = @Content(mediaType = MediaType.APPLICATION_JSON,
							schema = @Schema(implementation = AudioTranscriptionDto.class))),
			@APIResponse(responseCode = "400", description = "Missing audio file or invalid format (only .wav supported)"),
			@APIResponse(responseCode = "500", description = "Transcription failed")
	})
	public Response transcribe(@RestForm("audio") FileUpload audioFile) {
		if (audioFile == null) {
			return Response.status(Response.Status.BAD_REQUEST)
					.entity(new AudioTranscriptionDto("audio file is required"))
					.build();
		}

		String fileName = audioFile.fileName();
		String mimeType = audioFile.contentType();
		if (!hasWavExtension(fileName) || !isWavMimeType(mimeType)) {
			return Response.status(Response.Status.BAD_REQUEST)
					.entity(new AudioTranscriptionDto("only .wav audio files are supported"))
					.build();
		}

		try {
			byte[] audioBytes;
			try (InputStream is = Files.newInputStream(audioFile.uploadedFile())) {
				audioBytes = is.readAllBytes();
			}

			log.infof("Audio transcription request [fileName=%s, mimeType=%s, bytes=%d]", fileName, mimeType, audioBytes.length);

			String transcription = audioTranscriptionService.transcribeAudio(audioBytes, mimeType);
			return Response.ok(new AudioTranscriptionDto(transcription)).build();

		} catch (Exception e) {
			log.errorf(e, "Failed to transcribe audio");
			return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
					.entity(new AudioTranscriptionDto("Transcription failed: " + e.getMessage()))
					.build();
		}
	}
}
