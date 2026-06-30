# ─────────────────────────────────────────────
# Stage 1: Build Frontend (React + Vite)
# ─────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
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
# Stage 3: Build Chatbot (Node.js AI service)
# ─────────────────────────────────────────────
FROM node:22-alpine AS chatbot-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /chatbot

COPY chatbot/package.json chatbot/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY chatbot/ .
RUN pnpm build && pnpm prune --prod

# ─────────────────────────────────────────────
# Stage 4: Runtime (nginx + Quarkus JVM + Node chatbot)
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

# Install nginx and supervisord.
# `apk upgrade` pulls Alpine's latest security backports before installing, so
# nginx ships with the fix for CVE-2026-42945 (heap overflow in
# ngx_http_rewrite_module, "NGINX Rift", patched upstream in 1.30.1/1.31.0).
# Alpine backports the fix onto its own packaged version, so we rely on fresh
# package indexes (the CI build uses no-cache) rather than pinning a version.
RUN apk upgrade --no-cache && \
    apk add --no-cache nginx supervisor nodejs

# ── Frontend static files ──
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# ── Chatbot (Node.js AI service) ──
COPY --from=chatbot-builder /chatbot/dist          /app/chatbot/dist
COPY --from=chatbot-builder /chatbot/node_modules  /app/chatbot/node_modules
COPY --from=chatbot-builder /chatbot/package.json  /app/chatbot/package.json

# ── Backend Quarkus app ──
COPY --from=backend-builder /app/target/quarkus-app/lib/     /deployments/lib/
COPY --from=backend-builder /app/target/quarkus-app/*.jar    /deployments/
COPY --from=backend-builder /app/target/quarkus-app/app/     /deployments/app/
COPY --from=backend-builder /app/target/quarkus-app/quarkus/ /deployments/quarkus/

# ── Configuration files ──
COPY docker/nginx-combined.conf          /etc/nginx/http.d/default.conf
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

# ── Chatbot runtime config ──
ENV CHATBOT_PORT=3001
ENV CHATBOT_DB_PATH=/data/chatbot.db
ENV BACKEND_URL=http://127.0.0.1:8080
ENV OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ENV MODEL_LARGE=google/gemini-flash-3.5
ENV MODEL_FAST=google/gemini-flash-lite
ENV NODE_NO_WARNINGS=1

ENTRYPOINT ["/entrypoint.sh"]
