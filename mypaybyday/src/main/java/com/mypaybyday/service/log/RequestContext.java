package com.mypaybyday.service.log;

public record RequestContext(String path, String method, String correlationId) {
	public static final RequestContext EMPTY = new RequestContext(null, null, null);
}
