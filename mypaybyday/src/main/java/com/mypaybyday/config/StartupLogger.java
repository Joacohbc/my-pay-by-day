package com.mypaybyday.config;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class StartupLogger {

    private static final Logger LOG = Logger.getLogger(StartupLogger.class);

    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    String jdbcUrl;

    @ConfigProperty(name = "quarkus.datasource.jdbc.max-size")
    int jdbcMaxSize;

    @ConfigProperty(name = "quarkus.datasource.jdbc.min-size")
    int jdbcMinSize;

    @ConfigProperty(name = "quarkus.http.cors.origins")
    String corsOrigins;

    @ConfigProperty(name = "db.field.encryption.key")
    String encryptionKey;

    void onStart(@Observes StartupEvent event) {
        LOG.info("=== Startup Configuration ===");
        LOG.infof("  SQLite URL        : %s", jdbcUrl);
        LOG.infof("  SQLite pool       : min=%d, max=%d", jdbcMinSize, jdbcMaxSize);
        LOG.infof("  CORS origins      : %s", corsOrigins);
        LOG.infof("  Encryption key set: %b", encryptionKey != null && !encryptionKey.isBlank());
        LOG.info("=============================");
    }
}
