package com.mypaybyday.filter;

import java.util.UUID;

import jakarta.inject.Inject;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import com.mypaybyday.service.log.RequestContextHolder;

import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

@Provider
public class RequestLoggingFilter implements ContainerRequestFilter, ContainerResponseFilter {

	private static final Logger LOG = Logger.getLogger(RequestLoggingFilter.class);

	private static final String PROP_METHOD = "log.method";
	private static final String PROP_PATH   = "log.path";
	private static final String PROP_ORIGIN = "log.origin";
	private static final String PROP_TS     = "log.ts";
	private static final String PROP_CORR   = "log.correlationId";

	@Inject
	RequestContextHolder requestContextHolder;

	@Override
	public void filter(ContainerRequestContext req) {
		String correlationId = UUID.randomUUID().toString();
		String method = req.getMethod();
		String path   = req.getUriInfo().getRequestUri().getPath();

		req.setProperty(PROP_METHOD, method);
		req.setProperty(PROP_PATH,   path);
		req.setProperty(PROP_ORIGIN, req.getHeaderString("Origin"));
		req.setProperty(PROP_TS,     System.currentTimeMillis());
		req.setProperty(PROP_CORR,   correlationId);

		requestContextHolder.set(path, method, correlationId);

		MDC.put("cid", correlationId);
		MDC.put("method", method);
		MDC.put("path", path);
	}

	@Override
	public void filter(ContainerRequestContext req, ContainerResponseContext res) {
		String method  = (String) req.getProperty(PROP_METHOD);
		String path    = (String) req.getProperty(PROP_PATH);
		String origin  = (String) req.getProperty(PROP_ORIGIN);
		String corr    = (String) req.getProperty(PROP_CORR);
		Long   started = (Long)   req.getProperty(PROP_TS);

		long elapsedMs = started != null ? System.currentTimeMillis() - started : -1;

		Object entity = res.getEntity();
		String size   = entity != null ? entity.toString().length() + "B" : "-";

		MDC.put("category", "REQUEST");
		MDC.put("status", String.valueOf(res.getStatus()));
		MDC.put("durationMs", String.valueOf(elapsedMs));
		MDC.put("origin", origin != null ? origin : "-");
		MDC.put("responseSize", size);
		try {
			LOG.infof("%s %s | status=%d | time=%dms | cid=%s",
					method, path, res.getStatus(), elapsedMs, corr != null ? corr : "-");
		} finally {
			MDC.remove("category");
			MDC.remove("status");
			MDC.remove("durationMs");
			MDC.remove("origin");
			MDC.remove("responseSize");
			MDC.remove("cid");
			MDC.remove("method");
			MDC.remove("path");
		}
	}
}
