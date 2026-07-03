#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

LIBS_DIR=".libs"
PORT="${PORT:-8590}"

if [ ! -d "$LIBS_DIR" ] || ! PYTHONPATH="$LIBS_DIR" python3 -c "import openpyxl" >/dev/null 2>&1; then
  echo "Installing markitdown[all] into $LIBS_DIR ..."
  pip3 install --upgrade --target="$LIBS_DIR" 'markitdown[all]'
fi

echo "Starting markitdown server on :$PORT"
PYTHONPATH="$LIBS_DIR" PORT="$PORT" exec python3 server.py
