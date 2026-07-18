# API gateway (nginx reverse proxy) — standalone service image.
# Build context is the repo root.

FROM nginx:alpine

COPY docker/gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/gateway/entrypoint.sh /entrypoint.sh

EXPOSE 80 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8081/stub_status || exit 1

ENTRYPOINT ["/entrypoint.sh"]
