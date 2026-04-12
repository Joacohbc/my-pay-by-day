package com.mypaybyday.config;

import java.sql.Connection;
import java.sql.Statement;

import javax.sql.DataSource;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

import io.quarkus.runtime.StartupEvent;

@ApplicationScoped
public class SQLiteConfig {

	private final DataSource dataSource;

	public SQLiteConfig(DataSource dataSource) {
		this.dataSource = dataSource;
	}

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
