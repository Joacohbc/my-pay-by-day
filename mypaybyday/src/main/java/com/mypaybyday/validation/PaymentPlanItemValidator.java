package com.mypaybyday.validation;

import java.time.LocalDate;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.entity.PaymentPlanItemEntity;
import com.mypaybyday.enums.PaymentPlanStatus;
import com.mypaybyday.enums.PaymentPlanType;
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
		if (entity.event != null && entity.draft != null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_LINK_NOT_EXCLUSIVE);
		}
		validateInstallmentNumberIsUnique(entity);
		validateDateWithinPlanWindow(entity);
	}

	/**
	 * A cuota or a subscription cycle may be backdated freely — the user is often recording a
	 * payment that already happened — as long as it lands inside the window the plan covers.
	 */
	private void validateDateWithinPlanWindow(PaymentPlanItemEntity entity) throws BusinessException {
		PaymentPlanEntity plan = entity.paymentPlan;
		if (plan == null || plan.planType == PaymentPlanType.GROUP) {
			return;
		}

		if (plan.startDate != null && entity.expectedDate.isBefore(plan.startDate)) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_BEFORE_PLAN_START, entity.expectedDate, plan.startDate);
		}

		LocalDate scheduleEndDate = plan.scheduleEndDate();
		if (scheduleEndDate != null && entity.expectedDate.isAfter(scheduleEndDate)) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_AFTER_PLAN_END, entity.expectedDate, scheduleEndDate);
		}
	}

	/**
	 * A COMPLETED or CANCELLED plan is closed: its schedule is done, and the only action left is
	 * reopening it (back to ACTIVE) before it can accept new entries.
	 */
	public void validatePlanAcceptsNewItems(PaymentPlanEntity plan) throws BusinessException {
		if (plan.status == PaymentPlanStatus.COMPLETED || plan.status == PaymentPlanStatus.CANCELLED) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_PLAN_CLOSED, plan.status);
		}
	}

	/** An installment plan is finite by definition, so it can never hold more cuotas than it declares. */
	public void validateHasRoomForAnotherItem(PaymentPlanEntity plan) throws BusinessException {
		if (!plan.planType.requiresTotalInstallments() || plan.totalInstallments == null) {
			return;
		}
		if (plan.items.size() >= plan.totalInstallments) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_ITEM_LIMIT_REACHED, plan.totalInstallments);
		}
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
