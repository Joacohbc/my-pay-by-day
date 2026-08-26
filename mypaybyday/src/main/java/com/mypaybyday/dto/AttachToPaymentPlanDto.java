package com.mypaybyday.dto;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "DTO for attaching existing events and/or drafts to a payment plan in a single atomic call")
public record AttachToPaymentPlanDto(
	@Schema(description = "Events to attach. Each one fills a free entry, or a newly opened one when none is free.") List<Long> eventIds,
	@Schema(description = "Drafts to attach. Each one fills a free entry, or a newly opened one when none is free.") List<Long> draftIds,
	@Schema(description = "The specific entry to fill. Only valid when attaching exactly one member.") Long itemId
) {}
