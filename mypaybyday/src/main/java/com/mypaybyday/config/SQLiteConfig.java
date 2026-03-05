package com.mypaybyday.config;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@ApplicationScoped
public class SQLiteConfig {

    @Inject
    DataSource dataSource;

    void onStart(@Observes StartupEvent event) {
        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute("PRAGMA journal_mode=WAL");
            stmt.execute("PRAGMA busy_timeout=30000");
        } catch (Exception e) {
            throw new RuntimeException("Failed to configure SQLite pragmas", e);
        }
    }
}
