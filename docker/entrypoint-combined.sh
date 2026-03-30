#!/bin/sh
set -e

# Generate /env.js so the React app can read env vars at runtime.
sanitize() {
  printf '%s' "$1" | tr -d '\n\r' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

printf 'window.__env__ = { VITE_API_BASE_URL: "%s" };\n' \
  "$(sanitize "${VITE_API_BASE_URL:-/api}")" \
  > /usr/share/nginx/html/env.js

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
