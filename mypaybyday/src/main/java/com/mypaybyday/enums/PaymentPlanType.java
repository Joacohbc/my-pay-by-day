package com.mypaybyday.enums;

import java.util.List;

public enum PaymentPlanType {
	RECURRING(PaymentPlanStatus.ACTIVE, PaymentPlanStatus.PAUSED, PaymentPlanStatus.COMPLETED, PaymentPlanStatus.CANCELLED),
	INSTALLMENT(PaymentPlanStatus.ACTIVE, PaymentPlanStatus.PAUSED, PaymentPlanStatus.COMPLETED, PaymentPlanStatus.CANCELLED),
	CUSTOM(PaymentPlanStatus.ACTIVE, PaymentPlanStatus.COMPLETED, PaymentPlanStatus.CANCELLED),
	GROUP(PaymentPlanStatus.ACTIVE, PaymentPlanStatus.COMPLETED, PaymentPlanStatus.CANCELLED);

	private final List<PaymentPlanStatus> allowedStatuses;

	PaymentPlanType(PaymentPlanStatus... allowedStatuses) {
		this.allowedStatuses = List.of(allowedStatuses);
	}

	public List<PaymentPlanStatus> allowedStatuses() {
		return allowedStatuses;
	}

	public boolean allowsStatus(PaymentPlanStatus status) {
		return allowedStatuses.contains(status);
	}
}
