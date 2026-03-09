#!/bin/sh
# Generate /env.js at container startup so the React app can read
# environment variables at runtime (not baked into the bundle).
#
# Values are sanitized before embedding: backslashes and double-quotes are
# escaped, and newlines are stripped, to prevent JS injection if the env var
# contains unexpected characters.
sanitize() {
  printf '%s' "$1" | tr -d '\n\r' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

printf 'window.__env__ = { VITE_API_BASE_URL: "%s" };\n' \
  "$(sanitize "${VITE_API_BASE_URL:-/api}")" \
  > /usr/share/nginx/html/env.js

exec nginx -g "daemon off;"
