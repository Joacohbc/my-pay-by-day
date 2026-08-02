package com.mypaybyday.validation;

import java.math.BigDecimal;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanEntity;
import com.mypaybyday.entity.TemplateEntity;
import com.mypaybyday.exception.BusinessException;
import com.mypaybyday.i18n.Messages;
import com.mypaybyday.i18n.MsgKey;

@ApplicationScoped
public class PaymentPlanValidator {

	private final Messages messages;
	private final RegexValidator regexValidator;

	public PaymentPlanValidator(Messages messages, RegexValidator regexValidator) {
		this.messages = messages;
		this.regexValidator = regexValidator;
	}

	public void validate(PaymentPlanEntity entity) throws BusinessException {
		if (entity.name == null || entity.name.isBlank()) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_NAME_REQUIRED);
		}
		regexValidator.validateNameAndDescription(entity.name, entity.description);

		validateWindow(entity);
		validateCadence(entity);
		validateAutomation(entity);

		if (entity.status != null && !entity.planType.allowsStatus(entity.status)) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_STATUS_NOT_ALLOWED_FOR_TYPE, entity.status, entity.planType);
		}
	}

	private void validateWindow(PaymentPlanEntity entity) throws BusinessException {
		if (entity.startDate == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_START_DATE_REQUIRED);
		}
		if (entity.planType.requiresExplicitEndDate() && entity.endDate == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_END_DATE_REQUIRED);
		}
		if (entity.endDate != null && entity.endDate.isBefore(entity.startDate)) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_END_DATE_BEFORE_START, entity.endDate, entity.startDate);
		}
	}

	private void validateCadence(PaymentPlanEntity entity) throws BusinessException {
		if (!entity.planType.requiresFrequency()) {
			return;
		}
		if (entity.frequency == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_FREQUENCY_REQUIRED);
		}
		if (!entity.frequency.isSchedulable()) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_FREQUENCY_NOT_SCHEDULABLE, entity.frequency);
		}
		boolean isCuotaCountMissing = entity.totalInstallments == null || entity.totalInstallments < 1;
		if (entity.planType.requiresTotalInstallments() && isCuotaCountMissing) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_TOTAL_INSTALLMENTS_REQUIRED);
		}
	}

	/**
	 * Origin node, destination node and amount exist only to build the event the scheduler
	 * generates, so a manual plan is never asked for them. The nodes ride on a Template, which is
	 * the object that already models "who pays whom" in this system, instead of being duplicated
	 * onto the plan.
	 */
	private void validateAutomation(PaymentPlanEntity entity) throws BusinessException {
		if (!entity.isAutomated) {
			return;
		}
		if (!entity.planType.supportsAutomation()) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_AUTOMATION_NOT_SUPPORTED, entity.planType);
		}

		TemplateEntity template = entity.template;
		if (template == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_TEMPLATE_REQUIRED_FOR_AUTOMATION);
		}
		if (template.originNode == null || template.destinationNode == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_TEMPLATE_NODES_REQUIRED, template.name);
		}

		boolean hasUsableCycleAmount = entity.installmentAmount != null
			&& entity.installmentAmount.compareTo(BigDecimal.ZERO) > 0;
		if (!hasUsableCycleAmount) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_AMOUNT_REQUIRED_FOR_AUTOMATION);
		}
	}
}
