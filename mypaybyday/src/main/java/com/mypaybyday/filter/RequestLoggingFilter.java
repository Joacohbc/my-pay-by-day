package com.mypaybyday.filter;

import java.time.Instant;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;

import org.jboss.logging.Logger;

/**
 * JAX-RS filter that logs every request/response with: timestamp, HTTP method, path, the request
 * origin (which client sent it — {@code X-Source}, the client IP from {@code X-Forwarded-For}, the
 * {@code Origin} header and the User-Agent), response status, response size, and elapsed time.
 */
@Provider
public class RequestLoggingFilter implements ContainerRequestFilter, ContainerResponseFilter {

	private static final Logger LOG = Logger.getLogger(RequestLoggingFilter.class);

	private static final String PROP_METHOD = "log.method";
	private static final String PROP_PATH   = "log.path";
	private static final String PROP_ORIGIN = "log.origin";
	private static final String PROP_SOURCE = "log.source";
	private static final String PROP_IP     = "log.ip";
	private static final String PROP_UA     = "log.ua";
	private static final String PROP_TS     = "log.ts";

	@Override
	public void filter(ContainerRequestContext req) {
		req.setProperty(PROP_METHOD, req.getMethod());
		req.setProperty(PROP_PATH,   req.getUriInfo().getRequestUri().getPath());
		req.setProperty(PROP_ORIGIN, req.getHeaderString("Origin"));
		req.setProperty(PROP_SOURCE, req.getHeaderString("X-Source"));
		req.setProperty(PROP_IP,     req.getHeaderString("X-Forwarded-For"));
		req.setProperty(PROP_UA,     req.getHeaderString("User-Agent"));
		req.setProperty(PROP_TS,     System.currentTimeMillis());
	}

	@Override
	public void filter(ContainerRequestContext req, ContainerResponseContext res) {
		String method  = (String) req.getProperty(PROP_METHOD);
		String path    = (String) req.getProperty(PROP_PATH);
		String origin  = (String) req.getProperty(PROP_ORIGIN);
		String source  = (String) req.getProperty(PROP_SOURCE);
		String ip      = (String) req.getProperty(PROP_IP);
		String ua      = (String) req.getProperty(PROP_UA);
		Long   started = (Long)   req.getProperty(PROP_TS);

		long elapsedMs = started != null ? System.currentTimeMillis() - started : -1;

		Object entity = res.getEntity();
		String size   = entity != null ? entity.toString().length() + "B" : "-";

		LOG.infof("[%s] %s %s | source=%s | ip=%s | origin=%s | status=%d | size=%s | ua=%s | time=%dms",
				Instant.now(),
				method,
				path,
				source != null ? source : "-",
				ip != null ? ip : "-",
				origin != null ? origin : "-",
				res.getStatus(),
				size,
				ua != null ? ua : "-",
				elapsedMs);
	}
}
