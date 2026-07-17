# Frontend (React + Vite SPA) served by nginx — standalone service image.
# Build context is the frontend/ directory. env.js is generated at container
# startup by entrypoint.sh so the API base URL is not baked into the bundle.

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 8081
ENV VITE_API_BASE_URL=/api

ENTRYPOINT ["/entrypoint.sh"]
