package com.mypaybyday.filter;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ContainerResponseContext;
import jakarta.ws.rs.container.ContainerResponseFilter;
import jakarta.ws.rs.ext.Provider;
import org.jboss.logging.Logger;

import java.time.Instant;

/**
 * JAX-RS filter that logs every request/response with:
 * timestamp, HTTP method, path, origin, response status, and response size.
 */
@Provider
public class RequestLoggingFilter implements ContainerRequestFilter, ContainerResponseFilter {

    private static final Logger LOG = Logger.getLogger(RequestLoggingFilter.class);

    private static final String PROP_METHOD = "log.method";
    private static final String PROP_PATH   = "log.path";
    private static final String PROP_ORIGIN = "log.origin";
    private static final String PROP_TS     = "log.ts";

    @Override
    public void filter(ContainerRequestContext req) {
        req.setProperty(PROP_METHOD, req.getMethod());
        req.setProperty(PROP_PATH,   req.getUriInfo().getRequestUri().getPath());
        req.setProperty(PROP_ORIGIN, req.getHeaderString("Origin"));
        req.setProperty(PROP_TS,     System.currentTimeMillis());
    }

    @Override
    public void filter(ContainerRequestContext req, ContainerResponseContext res) {
        String method  = (String) req.getProperty(PROP_METHOD);
        String path    = (String) req.getProperty(PROP_PATH);
        String origin  = (String) req.getProperty(PROP_ORIGIN);
        Long   started = (Long)   req.getProperty(PROP_TS);

        long elapsedMs = started != null ? System.currentTimeMillis() - started : -1;

        Object entity = res.getEntity();
        String size   = entity != null ? entity.toString().length() + "B" : "-";

        LOG.infof("[%s] %s %s | origin=%s | status=%d | size=%s | time=%dms",
                Instant.now(),
                method,
                path,
                origin != null ? origin : "-",
                res.getStatus(),
                size,
                elapsedMs);
    }
}
