package com.mypaybyday.architecture;

import java.lang.annotation.Annotation;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PATCH;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponses;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * A missing @APIResponse on an endpoint is not just missing documentation: smallrye-openapi
 * guesses a status code from the return type when no annotation is present, and that guess can
 * silently disagree with what the method actually returns (e.g. it inferred 201 for a
 * RestResponse<Void> that always returns 204). This rule fails the build before that drifts into
 * the generated OpenAPI spec and the chatbot's typed client.
 */
class ResourceOpenApiArchTest {

    private static final List<Class<? extends Annotation>> HTTP_METHOD_ANNOTATIONS =
            List.of(GET.class, POST.class, PUT.class, DELETE.class, PATCH.class);

    @Test
    void everyEndpointDeclaresOperationAndApiResponse() {
        JavaClasses resourceClasses = new ClassFileImporter().importPackages("com.mypaybyday.resource");

        List<String> violations = StreamSupport.stream(resourceClasses.spliterator(), false)
                .flatMap(javaClass -> javaClass.getMethods().stream())
                .filter(ResourceOpenApiArchTest::isJaxRsEndpoint)
                .filter(method -> !method.isAnnotatedWith(Operation.class)
                        || !(method.isAnnotatedWith(APIResponse.class) || method.isAnnotatedWith(APIResponses.class)))
                .map(JavaMethod::getFullName)
                .collect(Collectors.toList());

        if (!violations.isEmpty()) {
            fail("Every JAX-RS endpoint in com.mypaybyday.resource must declare @Operation and "
                    + "@APIResponse/@APIResponses (AGENTS.md: \"OpenAPI annotations on every endpoint\"). "
                    + "Missing on:\n  - " + String.join("\n  - ", violations));
        }
    }

    private static boolean isJaxRsEndpoint(JavaMethod method) {
        return HTTP_METHOD_ANNOTATIONS.stream().anyMatch(method::isAnnotatedWith);
    }
}
