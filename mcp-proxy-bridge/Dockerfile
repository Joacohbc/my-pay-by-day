FROM node:18-alpine

WORKDIR /usr/src/app

USER node

COPY --chown=node:node package*.json ./
RUN npm install

COPY --chown=node:node server.js ./

EXPOSE 3000

CMD ["npm", "start"]
