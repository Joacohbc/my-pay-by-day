package com.mypaybyday.service.log;

import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class RequestContextHolder {

	private RequestContext context = RequestContext.EMPTY;

	public void set(String path, String method, String correlationId) {
		this.context = new RequestContext(path, method, correlationId);
	}

	public RequestContext current() {
		return context;
	}
}
