package com.mypaybyday.resource;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.notNullValue;

@QuarkusTest
public class ConfigResourceTest {

    @Test
    public void testConfigEndpoint() {
        given()
          .when().get("/api/config")
          .then()
             .statusCode(200)
             .body("timezone", notNullValue());
    }
}
