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

	/** Only the two scheduled kinds repeat on a cadence; a group happens once and a custom plan is hand-built. */
	public boolean requiresFrequency() {
		return this == RECURRING || this == INSTALLMENT;
	}

	/** A background job can only generate what has a cadence to generate it on. */
	public boolean supportsAutomation() {
		return requiresFrequency();
	}

	/** The cuota count is what makes an installment plan finite, and it is what bounds its schedule. */
	public boolean requiresTotalInstallments() {
		return this == INSTALLMENT;
	}

	/** A custom plan has no cadence to derive its end from, so the user states the window explicitly. */
	public boolean requiresExplicitEndDate() {
		return this == CUSTOM;
	}

	/** These kinds carry an amount per cycle; a custom plan and a group only total up what is linked to them. */
	public boolean carriesCycleAmount() {
		return requiresFrequency();
	}

	/**
	 * Items of these kinds exist only to hold a link, so losing the link deletes them. A cuota or a
	 * subscription cycle keeps its slot in the schedule and goes back to pending instead.
	 */
	public boolean hasLinkOnlyItems() {
		return this == CUSTOM || this == GROUP;
	}
}
