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

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.CreatePaymentPlanItemDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.dto.PaymentPlanItemDto;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.service.PaymentPlanService;
import io.quarkus.logging.Log;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponseSchema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.jboss.resteasy.reactive.RestResponse;

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
	@APIResponse(responseCode = "200", description = "List of payment plans retrieved successfully")
	public RestResponse<List<PaymentPlanDto>> listAll() {
		return RestResponse.ok(paymentPlanService.listAll());
	}

	@GET
	@Path("/{id}")
	@Operation(summary = "Get a payment plan by ID", description = "Retrieves details of a specific payment plan including pre-generated items.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan found"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<PaymentPlanDto> findById(@PathParam("id") Long id) throws BusinessException {
		return RestResponse.ok(paymentPlanService.findById(id));
	}

	@POST
	@Operation(summary = "Create a new payment plan", description = "Creates a new payment plan and pre-generates its scheduled items.")
	@APIResponseSchema(value = PaymentPlanDto.class, responseCode = "201", responseDescription = "Payment plan created successfully")
	@APIResponse(responseCode = "400", description = "Invalid payment plan data")
	public RestResponse<PaymentPlanDto> create(CreatePaymentPlanDto dto) throws BusinessException {
		try {
			return RestResponse.status(RestResponse.Status.CREATED, paymentPlanService.create(dto));
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			Log.error("Error creating payment plan", e);
			throw new RuntimeException(e);
		}
	}

	@POST
	@Path("/{id}/cancel")
	@Operation(summary = "Cancel a payment plan", description = "Marks a payment plan as cancelled.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan cancelled successfully"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<PaymentPlanDto> cancel(@PathParam("id") Long id) throws BusinessException {
		return RestResponse.ok(paymentPlanService.cancel(id));
	}

	@DELETE
	@Path("/{id}")
	@Operation(summary = "Delete a payment plan", description = "Deletes a payment plan. GROUP plans can be deleted directly; other kinds require status CANCELLED first.")
	@APIResponses({
		@APIResponse(responseCode = "204", description = "Payment plan deleted successfully"),
		@APIResponse(responseCode = "400", description = "Payment plan is not cancelled"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<Void> delete(@PathParam("id") Long id) throws BusinessException {
		paymentPlanService.delete(id);
		return RestResponse.noContent();
	}

	@PUT
	@Path("/{id}")
	@Operation(summary = "Update a payment plan", description = "Updates details of an existing payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Payment plan updated successfully"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<PaymentPlanDto> update(@PathParam("id") Long id, CreatePaymentPlanDto dto) throws BusinessException {
		return RestResponse.ok(paymentPlanService.update(id, dto));
	}

	@GET
	@Path("/{id}/items")
	@Operation(summary = "List the items of a payment plan", description = "Retrieves every scheduled item / cuota of a payment plan, ordered by installment number.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Items retrieved successfully"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<List<PaymentPlanItemDto>> listItems(@PathParam("id") Long id) throws BusinessException {
		return RestResponse.ok(paymentPlanService.listItems(id));
	}

	@GET
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Get a payment plan item by ID", description = "Retrieves a single scheduled item / cuota of a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Item found"),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public RestResponse<PaymentPlanItemDto> findItemById(@PathParam("id") Long id, @PathParam("itemId") Long itemId) throws BusinessException {
		return RestResponse.ok(paymentPlanService.findItemById(id, itemId));
	}

	@POST
	@Path("/{id}/items")
	@Operation(summary = "Create a payment plan item", description = "Adds a scheduled item / cuota to a payment plan. The installment number is assigned automatically when omitted.")
	@APIResponseSchema(value = PaymentPlanItemDto.class, responseCode = "201", responseDescription = "Item created successfully")
	@APIResponses({
		@APIResponse(responseCode = "400", description = "Invalid item data"),
		@APIResponse(responseCode = "404", description = "Payment plan not found")
	})
	public RestResponse<PaymentPlanItemDto> createItem(@PathParam("id") Long id, CreatePaymentPlanItemDto dto) throws BusinessException {
		return RestResponse.status(RestResponse.Status.CREATED, paymentPlanService.createItem(id, dto));
	}

	@PUT
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Update a payment plan item", description = "Updates a scheduled item / cuota of a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "200", description = "Item updated successfully"),
		@APIResponse(responseCode = "400", description = "Invalid item data"),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public RestResponse<PaymentPlanItemDto> updateItem(@PathParam("id") Long id, @PathParam("itemId") Long itemId, CreatePaymentPlanItemDto dto)
			throws BusinessException {
		return RestResponse.ok(paymentPlanService.updateItem(id, itemId, dto));
	}

	@DELETE
	@Path("/{id}/items/{itemId}")
	@Operation(summary = "Delete a payment plan item", description = "Removes a scheduled item / cuota from a payment plan.")
	@APIResponses({
		@APIResponse(responseCode = "204", description = "Item deleted successfully"),
		@APIResponse(responseCode = "404", description = "Payment plan or item not found")
	})
	public RestResponse<Void> deleteItem(@PathParam("id") Long id, @PathParam("itemId") Long itemId) throws BusinessException {
		paymentPlanService.deleteItem(id, itemId);
		return RestResponse.noContent();
	}
}
