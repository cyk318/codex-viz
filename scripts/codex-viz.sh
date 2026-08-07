#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="${CODEX_VIZ_PID_FILE:-$ROOT_DIR/.codex-viz.pid}"
PORT_FILE="${CODEX_VIZ_PORT_FILE:-$ROOT_DIR/.codex-viz.port}"
LOG_FILE="${CODEX_VIZ_LOG_FILE:-$ROOT_DIR/.codex-viz.log}"
DEFAULT_PORT=3456

stored_port=""
if [[ -f "$PORT_FILE" ]]; then
  stored_port="$(cat "$PORT_FILE" 2>/dev/null || true)"
fi
PORT_VALUE="${PORT:-${stored_port:-$DEFAULT_PORT}}"

usage() {
  cat <<'EOF'
用法: ./codex-viz.sh <start|restart|stop|status>

命令:
  start    后台启动 Codex Viz
  restart  重启 Codex Viz
  stop     停止 Codex Viz
  status   查看运行状态

环境变量:
  PORT                  服务端口，默认 3456
  OPEN_BROWSER          设为 0 时启动后不打开浏览器
  CODEX_SESSIONS_DIR    Codex sessions 目录
  CODEX_HOME            Codex home 目录
  USD_TO_CNY_RATE       美元兑人民币换算汇率
EOF
}

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    cat "$PID_FILE" 2>/dev/null || true
  fi
}

is_running() {
  local pid="${1:-}"
  local process_command
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  kill -0 "$pid" 2>/dev/null || return 1
  process_command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$process_command" == *"bun server.ts"* ]]
}

cleanup_stale_files() {
  rm -f "$PID_FILE" "$PORT_FILE"
}

require_commands() {
  local missing=0
  for command_name in bun bunx nohup; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "缺少必要命令: $command_name" >&2
      missing=1
    fi
  done
  if [[ "$missing" -ne 0 ]]; then
    echo "请先安装 Bun: https://bun.sh" >&2
    exit 1
  fi
}

print_running() {
  local pid="$1"
  local port="$2"
  echo "Codex Viz 正在运行"
  echo "地址: http://localhost:$port"
  echo "PID: $pid"
  echo "日志: $LOG_FILE"
}

start_service() {
  local pid
  pid="$(read_pid)"
  if is_running "$pid"; then
    print_running "$pid" "$PORT_VALUE"
    return 0
  fi

  cleanup_stale_files
  require_commands
  cd "$ROOT_DIR"

  echo "正在生成样式..."
  bunx tailwindcss -i ./src/tailwind.input.css -o ./src/generated.css >/dev/null

  {
    echo
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 启动 Codex Viz，端口 $PORT_VALUE"
  } >> "$LOG_FILE"

  OPEN_BROWSER=0 PORT="$PORT_VALUE" nohup bun server.ts >> "$LOG_FILE" 2>&1 &
  pid="$!"
  echo "$pid" > "$PID_FILE"
  echo "$PORT_VALUE" > "$PORT_FILE"

  # 等待进程完成初始化，避免把立即退出误报为启动成功。
  for _ in {1..20}; do
    if ! is_running "$pid"; then
      echo "Codex Viz 启动失败，最近日志：" >&2
      tail -n 20 "$LOG_FILE" >&2 || true
      cleanup_stale_files
      return 1
    fi
    sleep 0.1
  done

  print_running "$pid" "$PORT_VALUE"

  if [[ "${OPEN_BROWSER:-1}" != "0" ]]; then
    if command -v open >/dev/null 2>&1; then
      open "http://localhost:$PORT_VALUE" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://localhost:$PORT_VALUE" >/dev/null 2>&1 || true
    fi
  fi
}

stop_service() {
  local pid
  pid="$(read_pid)"
  if ! is_running "$pid"; then
    echo "Codex Viz 未运行。"
    cleanup_stale_files
    return 0
  fi

  kill "$pid"
  for _ in {1..50}; do
    if ! is_running "$pid"; then
      cleanup_stale_files
      echo "Codex Viz 已停止，PID: $pid"
      return 0
    fi
    sleep 0.1
  done

  echo "Codex Viz 未能在 5 秒内停止，PID: $pid" >&2
  echo "请查看日志: $LOG_FILE" >&2
  return 1
}

status_service() {
  local pid
  pid="$(read_pid)"
  if is_running "$pid"; then
    print_running "$pid" "$PORT_VALUE"
  else
    cleanup_stale_files
    echo "Codex Viz 未运行。"
  fi
}

action="${1:-}"
case "$action" in
  start)
    start_service
    ;;
  restart)
    stop_service
    start_service
    ;;
  stop)
    stop_service
    ;;
  status)
    status_service
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
