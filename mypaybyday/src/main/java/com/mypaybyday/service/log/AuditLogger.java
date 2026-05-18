package com.mypaybyday.service.log;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import org.jboss.logging.Logger;
import org.jboss.logging.MDC;

@ApplicationScoped
public class AuditLogger {

	private static final Logger AUDIT = Logger.getLogger("audit");

	@Inject
	RequestContextHolder requestContextHolder;

	public void audit(String action, String entityType, Long entityId, String details) {
		RequestContext ctx = requestContextHolder.current();
		MDC.put("category", "AUDIT");
		MDC.put("action", action);
		if (entityType != null) MDC.put("entityType", entityType);
		if (entityId != null) MDC.put("entityId", entityId.toString());
		if (ctx.method() != null) MDC.put("method", ctx.method());
		if (ctx.path() != null) MDC.put("path", ctx.path());
		if (ctx.correlationId() != null) MDC.put("cid", ctx.correlationId());
		try {
			AUDIT.infof("%s%s%s", action,
					entityType != null ? " [" + entityType + (entityId != null ? "#" + entityId : "") + "]" : "",
					details != null && !details.isBlank() ? " — " + details : "");
		} finally {
			MDC.remove("category");
			MDC.remove("action");
			MDC.remove("entityType");
			MDC.remove("entityId");
			MDC.remove("method");
			MDC.remove("path");
			MDC.remove("cid");
		}
	}
}
