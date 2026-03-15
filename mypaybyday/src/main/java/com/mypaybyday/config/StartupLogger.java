package com.mypaybyday.config;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;


@ApplicationScoped
public class StartupLogger {

    private static final Logger LOG = Logger.getLogger(StartupLogger.class);

    @ConfigProperty(name = "quarkus.datasource.jdbc.url")
    String jdbcUrl;

    @ConfigProperty(name = "quarkus.datasource.jdbc.max-size")
    int jdbcMaxSize;

    @ConfigProperty(name = "quarkus.datasource.jdbc.min-size")
    int jdbcMinSize;

    @ConfigProperty(name = "db.field.encryption.key")
    String encryptionKey;

    @ConfigProperty(name = "quarkus.langchain4j.ollama.base-url")
    String ollamaUrl;

    @ConfigProperty(name = "quarkus.langchain4j.ollama.chat-model.model-id")
    String ollamaModel;

    @ConfigProperty(name = "mypaybyday.timezone")
    String timezone;


    void onStart(@Observes StartupEvent event) {
        LOG.info("\n" +
                "  __  __         _____             ____        _____              \n" +
                " |  \\/  |       |  __ \\           |  _ \\      |  __ \\             \n" +
                " | \\  / |_   _  | |__) |_ _ _   _ | |_) |_   _| |  | | __ _ _   _ \n" +
                " | |\\/| | | | | |  ___/ _` | | | ||  _ <| | | | |  | |/ _` | | | |\n" +
                " | |  | | |_| | | |  | (_| | |_| || |_) | |_| | |__| | (_| | |_| |\n" +
                " |_|  |_|\\__, | |_|   \\__,_|\\__, ||____/ \\__, |_____/ \\__,_|\\__, |\n" +
                "          __/ |              __/ |        __/ |              __/ |\n" +
                "         |___/              |___/        |___/              |___/ \n");

        LOG.info("=== Startup Configuration ===");
        LOG.infof("  SQLite URL        : %s", jdbcUrl);
        LOG.infof("  SQLite pool       : min=%d, max=%d", jdbcMinSize, jdbcMaxSize);
        LOG.infof("  Ollama URL        : %s", ollamaUrl);
        LOG.infof("  Ollama Model      : %s", ollamaModel);
        LOG.infof("  Encryption key set: %b", encryptionKey != null && !encryptionKey.isBlank());
        LOG.infof("  Timezone          : %s", timezone);
        LOG.infof("  Server Time       : %s", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        LOG.info("=============================");

    }
}
