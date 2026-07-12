#!/bin/sh
set -e

# Generate /env.js so the React app can read env vars at runtime.
sanitize() {
  printf '%s' "$1" | tr -d '\n\r' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

printf 'window.__env__ = { VITE_API_BASE_URL: "%s" };\n' \
  "$(sanitize "${VITE_API_BASE_URL:-/api}")" \
  > /usr/share/nginx/html/env.js

# Configure NGINX max body size to match the backend setting (default 10MB = 10485760 bytes)
MAX_SIZE="${MYPAYBYDAY_FILES_MAX_SIZE:-10485760}"
sed -i "s/__MYPAYBYDAY_FILES_MAX_SIZE__/${MAX_SIZE}/g" /etc/nginx/conf.d/default.conf

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
