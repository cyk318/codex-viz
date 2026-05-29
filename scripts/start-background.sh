#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.codex-viz.pid"
LOG_FILE="$ROOT_DIR/.codex-viz.log"
PORT_VALUE="${PORT:-3456}"

cd "$ROOT_DIR"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Codex Viz 已在运行: http://localhost:$PORT_VALUE"
    echo "PID: $OLD_PID"
    exit 0
  fi
fi

bunx tailwindcss -i ./src/tailwind.input.css -o ./src/generated.css >/dev/null

OPEN_BROWSER=0 PORT="$PORT_VALUE" nohup bun server.ts >>"$LOG_FILE" 2>&1 &
PID="$!"
echo "$PID" > "$PID_FILE"

echo "Codex Viz 已后台启动: http://localhost:$PORT_VALUE"
echo "PID: $PID"
echo "日志: $LOG_FILE"

if command -v open >/dev/null 2>&1; then
  open "http://localhost:$PORT_VALUE" >/dev/null 2>&1 || true
fi
