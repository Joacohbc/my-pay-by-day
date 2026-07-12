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
FROM node:22-slim AS chatbot-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /chatbot

COPY chatbot/package.json chatbot/pnpm-lock.yaml chatbot/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY chatbot/ .
RUN pnpm build && pnpm prune --prod

# ─────────────────────────────────────────────
# Stage 4: Runtime (nginx + Quarkus JVM + Node chatbot)
# ─────────────────────────────────────────────
FROM eclipse-temurin:21-jre-noble

# glibc base (Ubuntu) so MarkItDown installs in one line: its content sniffer magika
# depends on onnxruntime, which publishes only manylinux/glibc wheels (no musl/Alpine).
# `apt-get update` pulls Ubuntu's current security-patched nginx at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx supervisor python3 python3-pip ca-certificates && \
    pip install --no-cache-dir --break-system-packages 'markitdown[all]' && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ── MarkItDown document-to-markdown sidecar (docker/markitdown/server.py) ──
COPY docker/markitdown/server.py /app/markitdown/server.py

# ── Node.js runtime for the chatbot (glibc binary from the builder stage) ──
COPY --from=chatbot-builder /usr/local/bin/node /usr/local/bin/node

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

# ── Chatbot runtime config ──
ENV CHATBOT_PORT=3001
ENV CHATBOT_DB_PATH=/data/chatbot.db
ENV BACKEND_URL=http://127.0.0.1:8080
ENV OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
ENV MODEL_LARGE=minimax/minimax-m3
ENV MODEL_FAST=deepseek/deepseek-v4-flash
ENV NODE_NO_WARNINGS=1

# ── MarkItDown sidecar (internal only, reached by the backend over localhost) ──
ENV MARKITDOWN_PORT=8590
ENV MARKITDOWN_URL=http://127.0.0.1:8590

ENTRYPOINT ["/entrypoint.sh"]
