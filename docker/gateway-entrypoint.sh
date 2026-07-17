#!/bin/sh
set -e

# Match nginx's upload limit to the backend's configured max file size (default 10MB).
MAX_SIZE="${MYPAYBYDAY_FILES_MAX_SIZE:-10485760}"
sed -i "s/__MYPAYBYDAY_FILES_MAX_SIZE__/${MAX_SIZE}/g" /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
