#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$ROOT_DIR/.codex-viz.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Codex Viz 没有后台运行。"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "已停止 Codex Viz，PID: $PID"
else
  echo "Codex Viz 进程不存在，清理 PID 文件。"
fi

rm -f "$PID_FILE"
