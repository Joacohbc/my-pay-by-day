# Chatbot (Node.js AI service) — standalone service image for the docker-compose split.
# Build context is the repo root.

FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /chatbot
COPY chatbot/package.json chatbot/pnpm-lock.yaml chatbot/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY chatbot/ .
RUN pnpm build && pnpm prune --prod

FROM node:22-slim
WORKDIR /app/chatbot
RUN mkdir -p /data && chown node:node /data
COPY --from=build --chown=node:node /chatbot/dist         ./dist
COPY --from=build --chown=node:node /chatbot/node_modules ./node_modules
COPY --from=build --chown=node:node /chatbot/package.json ./package.json

VOLUME ["/data"]
EXPOSE 3001

ENV CHATBOT_PORT=3001
ENV CHATBOT_DB_PATH=/data/chatbot.db
ENV BACKEND_URL=http://backend:8080
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.CHATBOT_PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

USER node
CMD ["node", "dist/server.js"]
