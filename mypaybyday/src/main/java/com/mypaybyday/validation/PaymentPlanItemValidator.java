package com.mypaybyday.validation;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class PaymentPlanItemValidator {

	private final Messages messages;

	public PaymentPlanItemValidator(Messages messages) {
		this.messages = messages;
	}

	public void validate(PaymentPlanItemEntity entity) throws BusinessException {
		if (entity.expectedDate == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_EXPECTED_DATE_REQUIRED);
		}
		if (entity.installmentNumber == null || entity.installmentNumber < 1) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_NUMBER_INVALID);
		}
		if (entity.expectedAmount != null && entity.expectedAmount.compareTo(BigDecimal.ZERO) < 0) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_AMOUNT_INVALID);
		}
		if (entity.event != null && entity.draft != null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_LINK_NOT_EXCLUSIVE);
		}
		validateInstallmentNumberIsUnique(entity);
	}

	private void validateInstallmentNumberIsUnique(PaymentPlanItemEntity entity) throws BusinessException {
		if (entity.paymentPlan == null || entity.paymentPlan.items == null) {
			return;
		}

		boolean isNumberTaken = entity.paymentPlan.items.stream()
			.filter(sibling -> sibling != entity)
			.anyMatch(sibling -> entity.installmentNumber.equals(sibling.installmentNumber));

		if (isNumberTaken) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_NUMBER_DUPLICATED, entity.installmentNumber);
		}
	}
}
