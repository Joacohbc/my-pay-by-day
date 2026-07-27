package com.mypaybyday.service;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

import com.mypaybyday.dto.CreatePaymentPlanDto;
import com.mypaybyday.dto.PaymentPlanDto;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
import com.mypaybyday.enums.RecurrenceFrequency;
import com.mypaybyday.exception.BusinessException;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class PaymentPlanServiceTest {

	@Inject
	PaymentPlanService paymentPlanService;

	@Test
	@Transactional
	void testDeletePaymentPlan_OnlyAllowedWhenCancelled() throws BusinessException {
		CreatePaymentPlanDto dto = new CreatePaymentPlanDto(
			"Gym Membership",
			"Monthly gym subscription",
			PaymentPlanType.RECURRING,
			null,
			null,
			new BigDecimal("50.00"),
			RecurrenceFrequency.MONTHLY,
			LocalDate.now(),
			true,
			true,
			true,
			PaymentPlanStatus.ACTIVE,
			null,
			null,
			null,
			null
		);

		PaymentPlanDto created = paymentPlanService.create(dto);
		assertNotNull(created.id());
		assertEquals(PaymentPlanStatus.ACTIVE, created.status());

		// 1. Attempting to delete an ACTIVE plan must fail with BusinessException
		BusinessException ex = assertThrows(
			BusinessException.class,
			() -> paymentPlanService.delete(created.id())
		);
		assertTrue(ex.getMessage().contains("cancelled payment plans"));

		// 2. Cancel the plan
		PaymentPlanDto cancelled = paymentPlanService.cancel(created.id());
		assertEquals(PaymentPlanStatus.CANCELLED, cancelled.status());

		// 3. Deleting the CANCELLED plan must succeed
		paymentPlanService.delete(created.id());

		// 4. Verify plan is gone
		assertThrows(BusinessException.class, () -> paymentPlanService.findById(created.id()));
	}
}
