package com.mypaybyday.service.duplicate;

public record DuplicateDetectionEvent(String type, Long id) {

	public static DuplicateDetectionEvent forEvent(Long id) {
		return new DuplicateDetectionEvent("EVENT", id);
	}

	public static DuplicateDetectionEvent forCategory(Long id) {
		return new DuplicateDetectionEvent("CATEGORY", id);
	}

	public static DuplicateDetectionEvent forTag(Long id) {
		return new DuplicateDetectionEvent("TAG", id);
	}
}
