package com.mypaybyday.validation;

import jakarta.enterprise.context.ApplicationScoped;

import com.mypaybyday.entity.PaymentPlanEntity;
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
		if (entity.startDate == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_START_DATE_REQUIRED);
		}
		if (entity.frequency == null) {
			throw messages.reject(MsgKey.PAYMENT_PLAN_FREQUENCY_REQUIRED);
		}
	}
}
