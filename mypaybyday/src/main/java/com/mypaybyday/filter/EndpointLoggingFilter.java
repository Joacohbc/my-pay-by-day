package com.mypaybyday.filter;

import java.lang.reflect.Method;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.ext.Provider;

import org.jboss.logging.Logger;

/**
 * Logs at DEBUG which resource method handles each request ({@code resource=Class.method}), giving
 * per-endpoint entry visibility across every resource without instrumenting the 16 resource classes.
 * Runs post-matching so {@link ResourceInfo} is populated.
 */
@Provider
public class EndpointLoggingFilter implements ContainerRequestFilter {

	private static final Logger LOG = Logger.getLogger(EndpointLoggingFilter.class);

	@Context
	ResourceInfo resourceInfo;

	@Override
	public void filter(ContainerRequestContext req) {
		if (!LOG.isDebugEnabled()) {
			return;
		}
		Class<?> resourceClass = resourceInfo.getResourceClass();
		Method resourceMethod = resourceInfo.getResourceMethod();
		if (resourceClass == null || resourceMethod == null) {
			return;
		}
		LOG.debugf("resource=%s.%s", resourceClass.getSimpleName(), resourceMethod.getName());
	}
}
