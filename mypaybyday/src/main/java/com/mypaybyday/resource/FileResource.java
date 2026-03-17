package com.mypaybyday.resource;

import com.mypaybyday.dto.FileDTO;
import com.mypaybyday.entity.StoredFile;
import com.mypaybyday.service.FileService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

@Path("/api/files")
public class FileResource {

    @Inject
    FileService fileService;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadFile(@RestForm("file") FileUpload file) {
        FileDTO fileDTO = fileService.uploadFile(file);
        return Response.status(Response.Status.CREATED).entity(fileDTO).build();
    }

    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response downloadFile(@PathParam("id") Long id) {
        StoredFile storedFile = fileService.getFile(id);

        return Response.ok(storedFile.getData())
                .header("Content-Disposition", "attachment; filename=\"" + storedFile.getFileName() + "\"")
                .header("Content-Type", storedFile.getContentType())
                .build();
    }
}
