# ─────────────────────────────────────────────
# Stage 1: Build Frontend (React + Vite)
# ─────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ .
RUN pnpm build

# ─────────────────────────────────────────────
# Stage 2: Build Backend (Quarkus JVM)
# ─────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS backend-builder

WORKDIR /app

# Cache dependencies separately from source
COPY mypaybyday/pom.xml ./
RUN mvn dependency:go-offline -q

COPY mypaybyday/src ./src
COPY mypaybyday/mvnw ./
COPY mypaybyday/.mvn ./.mvn
RUN mvn package -DskipTests -q

# ─────────────────────────────────────────────
# Stage 3: Runtime (nginx + Quarkus JVM)
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

# Install nginx and supervisord
RUN apk add --no-cache nginx supervisor

# ── Frontend static files ──
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# ── Backend Quarkus app ──
COPY --from=backend-builder /app/target/quarkus-app/lib/     /deployments/lib/
COPY --from=backend-builder /app/target/quarkus-app/*.jar    /deployments/
COPY --from=backend-builder /app/target/quarkus-app/app/     /deployments/app/
COPY --from=backend-builder /app/target/quarkus-app/quarkus/ /deployments/quarkus/

# ── Configuration files ──
COPY docker/nginx-combined.conf          /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf             /etc/supervisor/conf.d/app.conf
COPY docker/entrypoint-combined.sh       /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Remove the default nginx site if present
RUN rm -f /etc/nginx/sites-enabled/default

# SQLite data volume
VOLUME ["/data"]

# nginx on 80, Quarkus on 8080 (internal only)
EXPOSE 80

ENV VITE_API_BASE_URL=/api
ENV QUARKUS_DATASOURCE_JDBC_URL=jdbc:sqlite:/data/mypaybyday.db
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

ENTRYPOINT ["/entrypoint.sh"]
