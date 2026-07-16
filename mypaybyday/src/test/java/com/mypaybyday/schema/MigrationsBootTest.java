package com.mypaybyday.schema;

import jakarta.inject.Inject;

import io.quarkus.test.junit.QuarkusTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Boots the application against an empty database so Flyway applies every versioned
 * migration ({@code V1__baseline}, {@code V2__add_color}, ...) in order, then asserts
 * the applied history matches the versioned scripts. Guards against a malformed or
 * out-of-order migration reaching production.
 */
@QuarkusTest
class MigrationsBootTest {

    @Inject
    Flyway flyway;

    @Test
    void allMigrationsApplyCleanlyInOrder() {
        assertNotNull(flyway.info().current(), "No migration was applied on boot");
        assertDoesNotThrow(flyway::validate, "Applied migrations diverge from the versioned scripts");
    }
}
