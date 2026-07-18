# Frontend (React + Vite SPA) served by nginx — standalone service image.
# Build context is the repo root. env.js is generated at container
# startup by entrypoint.sh so the API base URL is not baked into the bundle.

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 frontend/entrypoint.sh /entrypoint.sh

EXPOSE 80 8081
ENV VITE_API_BASE_URL=/api

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8081/stub_status || exit 1

ENTRYPOINT ["/entrypoint.sh"]
