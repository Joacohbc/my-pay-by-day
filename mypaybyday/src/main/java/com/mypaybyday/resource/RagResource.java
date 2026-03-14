package com.mypaybyday.resource;

import com.mypaybyday.ai.RagIngestionService;
import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/rag")
@Produces(MediaType.APPLICATION_JSON)
@Tag(name = "RAG", description = "Endpoints for managing the RAG system.")
public class RagResource {

    @Inject
    RagIngestionService ragIngestionService;

    @POST
    @Path("/ingest")
    @Operation(summary = "Ingest SQLite data into RAG", description = "Manually triggers the ingestion of all FinanceEvents into the vector store.")
    @APIResponse(responseCode = "200", description = "Ingestion triggered successfully")
    public Response ingest() {
        ragIngestionService.ingestData();
        return Response.ok("{\"message\": \"Ingestion completed\"}").build();
    }
}
