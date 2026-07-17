# Chatbot (Node.js AI service) — standalone service image for the docker-compose split.
# Build context is the chatbot/ directory.

FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /chatbot
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-slim
WORKDIR /app/chatbot
COPY --from=build /chatbot/dist         ./dist
COPY --from=build /chatbot/node_modules ./node_modules
COPY --from=build /chatbot/package.json ./package.json

VOLUME ["/data"]
EXPOSE 3001

ENV CHATBOT_PORT=3001
ENV CHATBOT_DB_PATH=/data/chatbot.db
ENV BACKEND_URL=http://backend:8080
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1

CMD ["node", "dist/server.js"]
