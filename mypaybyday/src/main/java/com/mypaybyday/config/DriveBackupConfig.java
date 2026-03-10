package com.mypaybyday.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.util.Optional;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
@ConfigMapping(prefix = "backup.drive")
public interface DriveBackupConfig {

    @WithDefault("false")
    boolean enabled();

    Optional<String> clientId();

    Optional<String> clientSecret();

    Optional<String> refreshToken();

    Optional<String> folderId();
}
