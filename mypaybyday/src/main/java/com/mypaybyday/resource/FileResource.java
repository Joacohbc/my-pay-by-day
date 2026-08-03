package com.mypaybyday.resource;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import com.mypaybyday.dto.Base64FileUploadRequestDto;
import com.mypaybyday.dto.EmailFileDto;
import com.mypaybyday.dto.EmailUploadRequestDto;
import com.mypaybyday.dto.ErrorResponseDto;
import com.mypaybyday.dto.FileDto;
import com.mypaybyday.dto.FileWithEventDto;
import com.mypaybyday.dto.PagedResponse;
import com.mypaybyday.entity.FileEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.EmailFileService;
import com.mypaybyday.service.FileService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/files")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Files", description = "File storage and retrieval for events")
public class FileResource {

	private final FileService fileService;

	private final EmailFileService emailFileService;

	public FileResource(FileService fileService, EmailFileService emailFileService) {
		this.fileService = fileService;
		this.emailFileService = emailFileService;
	}

	@POST
	@Path("/base64")
	@Operation(summary = "Upload a file encoded in Base64", description = "Upload a new file providing its content as a Base64 string")
	@APIResponses({
		@APIResponse(responseCode = "201", description = "File uploaded successfully",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FileDto.class))),
		@APIResponse(responseCode = "400", description = "Validation error or file too large",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<FileDto> uploadBase64(Base64FileUploadRequestDto request) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, fileService.uploadBase64(request));
	}

	@POST
	@Path("/emails")
	@Operation(summary = "Store an email as a file", description = "Stores an email as a JSON file, converting its HTML body to Markdown")
	@APIResponses({
		@APIResponse(responseCode = "201", description = "Email stored successfully",
				content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FileDto.class))),
		@APIResponse(responseCode = "400", description = "Validation error, file too large, or the HTML body could not be converted")
	})
	public RestResponse<FileDto> uploadEmail(EmailUploadRequestDto request) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, emailFileService.upload(request));
	}

	@GET
	@Operation(summary = "List files (paginated)", description = "Returns a paginated list of files with optional filter by orphaned status")
	@APIResponse(responseCode = "200", description = "Paginated list of files",
			content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PagedResponse.class)))
	public RestResponse<PagedResponse<FileWithEventDto>> getAll(
			@Parameter(description = "Zero-based page index") @QueryParam("page") @DefaultValue("0") int page,
			@Parameter(description = "Page size") @QueryParam("size") @DefaultValue("20") int size,
			@Parameter(description = "Filter by orphaned status (true=only orphans, false=only linked, omitted=all)") @QueryParam("orphaned") Boolean orphaned) {

		return RestResponse.ok(fileService.listFiles(page, size, orphaned));
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get file metadata by ID", description = "Returns the file details (not the content)")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "File found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = FileDto.class))),
			@APIResponse(responseCode = "404", description = "File not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<FileDto> getById(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		return RestResponse.ok(fileService.getFileMetadata(id));
	}

	@GET
	@Path("/{id}/content/binary")
	@Produces(MediaType.WILDCARD)
	@Operation(summary = "Get file content", description = "Returns the binary content of the file with the appropriate mime type")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "File content stream"),
			@APIResponse(responseCode = "404", description = "File not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public jakarta.ws.rs.core.Response getContentBinary(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		FileEntity file = fileService.getFileContent(id);
		return jakarta.ws.rs.core.Response.ok(file.data, file.mimeType)
				.header("Content-Disposition", "inline; filename=\"" + file.fileName + "\"")
				.build();
	}

	@GET
	@Path("/{id}/content/markdown")
	@Produces("text/markdown")
	@Operation(summary = "Get file content as Markdown", description = "Returns the persisted Markdown conversion of the file, converting on demand when missing")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "File content as Markdown text"),
			@APIResponse(responseCode = "204", description = "File is not convertible or the conversion service is unavailable"),
			@APIResponse(responseCode = "404", description = "File not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<String> getContentMarkdown(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		String markdown = fileService.getMarkdownContent(id);
		if (markdown == null) {
			return RestResponse.noContent();
		}
		return RestResponse.ok(markdown);
	}

	@GET
	@Path("/{id}/email")
	@Operation(summary = "Get an email file as a structured email", description = "Returns the stored email (subject, sender, recipients, date and body) so it can be rendered as an email")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "Stored email",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = EmailFileDto.class))),
			@APIResponse(responseCode = "400", description = "The file is not an email or its content is unreadable"),
			@APIResponse(responseCode = "404", description = "File not found")
	})
	public RestResponse<EmailFileDto> getEmail(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		return RestResponse.ok(emailFileService.getEmail(id));
	}

	@GET
	@Path("/{id}/content/base64")
	@Produces(MediaType.TEXT_PLAIN)
	@Operation(summary = "Get file content as Base64", description = "Returns the file content encoded in Base64 (Data URI format)")
	@APIResponses({
			@APIResponse(responseCode = "200", description = "File content as Base64 string"),
			@APIResponse(responseCode = "404", description = "File not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<String> getContentBase64(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		String dataUri = fileService.getFileContentAsBase64(id);
		return RestResponse.ok(dataUri);
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a file", description = "Permanently deletes the file. Fails if the file is still linked to an event.")
	@APIResponses({
			@APIResponse(responseCode = "204", description = "File deleted"),
			@APIResponse(responseCode = "404", description = "File not found",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class))),
			@APIResponse(responseCode = "409", description = "File is still linked to an event",
					content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = ErrorResponseDto.class)))
	})
	public RestResponse<Void> delete(
			@Parameter(description = "ID of the file", required = true) @PathParam("id") Long id)
			throws BusinessException {
		fileService.deleteFile(id);
		return RestResponse.noContent();
	}
}
