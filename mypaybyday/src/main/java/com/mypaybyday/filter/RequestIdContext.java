package com.mypaybyday.filter;

import jakarta.enterprise.context.RequestScoped;

/**
 * Holds the correlation ID resolved for the current request so services can read it when they need
 * to correlate downstream work (background jobs, external calls) with the originating request.
 */
@RequestScoped
public class RequestIdContext {

	private String requestId;

	public String getRequestId() {
		return requestId;
	}

	public void setRequestId(String requestId) {
		this.requestId = requestId;
	}
}
