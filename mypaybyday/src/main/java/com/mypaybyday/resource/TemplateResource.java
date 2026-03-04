package com.mypaybyday.resource;

import com.mypaybyday.entity.Template;
import com.mypaybyday.repository.TemplateRepository;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/templates")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TemplateResource {

    @Inject
    TemplateRepository templateRepository;

    @GET
    public Response getAll() {
        return Response.ok(templateRepository.listAll()).build();
    }

    @GET
    @Path("/{id}")
    public Response getById(@PathParam("id") Long id) {
        Template template = templateRepository.findById(id);
        if (template == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(template).build();
    }

    @POST
    @Transactional
    public Response create(Template template) {
        if (template.lineItems != null) {
            template.lineItems.forEach(item -> item.template = template);
        }
        templateRepository.persist(template);
        return Response.status(Response.Status.CREATED).entity(template).build();
    }

    @PUT
    @Path("/{id}")
    @Transactional
    public Response update(@PathParam("id") Long id, Template templateDetails) {
        Template template = templateRepository.findById(id);
        if (template == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        template.name = templateDetails.name;
        template.description = templateDetails.description;

        template.lineItems.clear();
        if (templateDetails.lineItems != null) {
            templateDetails.lineItems.forEach(item -> {
                item.template = template;
                template.lineItems.add(item);
            });
        }

        return Response.ok(template).build();
    }

    @DELETE
    @Path("/{id}")
    @Transactional
    public Response delete(@PathParam("id") Long id) {
        Template template = templateRepository.findById(id);
        if (template == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        templateRepository.delete(template);
        return Response.noContent().build();
    }
}
