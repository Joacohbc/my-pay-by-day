package com.mypaybyday.resource;

import java.util.List;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.dto.PaymentPlanItemDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.PaymentPlanService;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/payment-plans")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Payment Plans", description = "Operations related to Payment Plans (Subscriptions & Installments)")
public class PaymentPlanResource {

	private final PaymentPlanService paymentPlanService;

	@Inject
	public PaymentPlanResource(PaymentPlanService paymentPlanService) {
		this.paymentPlanService = paymentPlanService;
	}

	@GET
	@Operation(summary = "List all payment plans", description = "Retrieves a list of all active, completed, or paused payment plans.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "List of payment plans retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanDto.class)))
	})
	public Response listAll() {
		List<PaymentPlanDto> plans = paymentPlanService.listAll();
		return Response.ok(plans).build();
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get a payment plan by ID", description = "Retrieves details of a specific payment plan including pre-generated items.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanDto.class))),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public Response findById(@PathParam("id") Long id) throws BusinessException {
		PaymentPlanDto plan = paymentPlanService.findById(id);
		return Response.ok(plan).build();
	}

	@POST
	@Operation(summary = "Create a new payment plan", description = "Creates a new payment plan and pre-generates its scheduled items.")
	@APIResponses({
		@APIResponse(responseCode = "201", description = "Payment plan created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanDto.class))),
		@APIResponse(responseCode = "400", description = "Invalid payment plan data")
	})
	public Response create(CreatePaymentPlanDto dto) throws BusinessException {
		try {
			PaymentPlanDto created = paymentPlanService.create(dto);
			return Response.status(Response.Status.CREATED).entity(created).build();
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			io.quarkus.logging.Log.error("Error creating payment plan", e);
			throw new RuntimeException(e);
		}
	}

	@POST
	@Path("/{id}/cancel")
	@Operation(summary = "Cancel a payment plan", description = "Marks a payment plan as cancelled.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan cancelled successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanDto.class))),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public Response cancel(@PathParam("id") Long id) throws BusinessException {
		PaymentPlanDto cancelled = paymentPlanService.cancel(id);
		return Response.ok(cancelled).build();
	}

	@PUT
	@Path("/{id}")
	@Operation(summary = "Update a payment plan", description = "Updates details of an existing payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan updated successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanDto.class))),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public Response update(@PathParam("id") Long id, CreatePaymentPlanDto dto) throws BusinessException {
		PaymentPlanDto updated = paymentPlanService.update(id, dto);
		return Response.ok(updated).build();
	}

	@GET
	@Path("/{id}/items")
	@Operation(summary = "List the items of a payment plan", description = "Retrieves every scheduled item / cuota of a payment plan, ordered by installment number.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Items retrieved successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanItemDto.class))),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public Response listItems(@PathParam("id") Long id) throws BusinessException {
		List<PaymentPlanItemDto> items = paymentPlanService.listItems(id);
		return Response.ok(items).build();
	}

	@GET
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Get a payment plan item by ID", description = "Retrieves a single scheduled item / cuota of a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Item found", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanItemDto.class))),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public Response findItemById(@PathParam("id") Long id, @PathParam("itemId") Long itemId) throws BusinessException {
		PaymentPlanItemDto item = paymentPlanService.findItemById(id, itemId);
		return Response.ok(item).build();
	}

	@POST
	@Path("/{id}/items")
	@Operation(summary = "Create a payment plan item", description = "Adds a scheduled item / cuota to a payment plan. The installment number is assigned automatically when omitted.")
	@APIResponses({
		@APIResponse(responseCode = "201", description = "Item created successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanItemDto.class))),
		@APIResponse(responseCode = "400", description = "Invalid item data"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public Response createItem(@PathParam("id") Long id, CreatePaymentPlanItemDto dto) throws BusinessException {
		PaymentPlanItemDto created = paymentPlanService.createItem(id, dto);
		return Response.status(Response.Status.CREATED).entity(created).build();
	}

	@PUT
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Update a payment plan item", description = "Updates a scheduled item / cuota of a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Item updated successfully", content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = PaymentPlanItemDto.class))),
		@APIResponse(responseCode = "400", description = "Invalid item data"),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public Response updateItem(@PathParam("id") Long id, @PathParam("itemId") Long itemId, CreatePaymentPlanItemDto dto)
			throws BusinessException {
		PaymentPlanItemDto updated = paymentPlanService.updateItem(id, itemId, dto);
		return Response.ok(updated).build();
	}

	@DELETE
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Delete a payment plan item", description = "Removes a scheduled item / cuota from a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "204", description = "Item deleted successfully"),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public Response deleteItem(@PathParam("id") Long id, @PathParam("itemId") Long itemId) throws BusinessException {
		paymentPlanService.deleteItem(id, itemId);
		return Response.noContent().build();
	}
}
