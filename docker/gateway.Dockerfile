# API gateway (nginx reverse proxy) — standalone service image.
# Build context is the docker/ directory.

FROM nginx:alpine
COPY gateway.conf /etc/nginx/conf.d/default.conf
COPY gateway-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 8081
ENTRYPOINT ["/entrypoint.sh"]
