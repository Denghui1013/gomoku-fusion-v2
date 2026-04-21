#!/usr/bin/env bash
set -u

# VPS health check for gomoku deployment.
# Usage:
#   bash scripts/vps-health-check.sh [pm2_name] [port] [public_base_url]
# Example:
#   bash scripts/vps-health-check.sh gomoku-fusion-v2 3010 https://yanyan-gomoku.duckdns.org

APP_NAME="${1:-gomoku-fusion-v2}"
PORT="${2:-3010}"
PUBLIC_BASE="${3:-http://127.0.0.1}"

FAIL=0

ok() {
  echo "[OK] $1"
}

warn() {
  echo "[WARN] $1"
}

err() {
  echo "[ERR] $1"
  FAIL=1
}

fetch_code() {
  # shellcheck disable=SC2039
  curl -s -o /dev/null -w "%{http_code}" "$1" || true
}

is_good_code() {
  [[ "$1" == "200" || "$1" == "304" ]]
}

echo "========================================"
echo "Gomoku VPS Health Check"
echo "App:  ${APP_NAME}"
echo "Port: ${PORT}"
echo "URL:  ${PUBLIC_BASE}"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================"

if command -v pm2 >/dev/null 2>&1; then
  if pm2 status "${APP_NAME}" | grep -q "online"; then
    ok "PM2 process '${APP_NAME}' is online"
  else
    err "PM2 process '${APP_NAME}' is not online"
    pm2 status || true
  fi
else
  err "pm2 not found"
fi

if command -v ss >/dev/null 2>&1; then
  if ss -ltn | grep -q ":${PORT} "; then
    ok "Port ${PORT} is listening"
  else
    err "Port ${PORT} is NOT listening"
  fi
else
  warn "ss not found, skip port listening check"
fi

if command -v curl >/dev/null 2>&1; then
  LOCAL_MODE="http://127.0.0.1:${PORT}/mode"
  PUBLIC_MODE="${PUBLIC_BASE}/mode"

  LOCAL_CODE="$(fetch_code "${LOCAL_MODE}")"
  if is_good_code "${LOCAL_CODE}"; then
    ok "Local /mode returns ${LOCAL_CODE}"
  else
    err "Local /mode returns ${LOCAL_CODE:-N/A}"
  fi

  PUBLIC_CODE="$(fetch_code "${PUBLIC_MODE}")"
  if is_good_code "${PUBLIC_CODE}"; then
    ok "Public /mode returns ${PUBLIC_CODE}"
  else
    err "Public /mode returns ${PUBLIC_CODE:-N/A}"
  fi

  # Check chunk assets to catch "_next/static/chunks/*.js 500" early.
  MODE_HTML="$(curl -s "${LOCAL_MODE}" || true)"
  CHUNKS="$(printf "%s" "${MODE_HTML}" | grep -oE '/_next/static/[^"]+' | sort -u | head -n 8)"

  if [[ -z "${CHUNKS}" ]]; then
    warn "No chunk paths parsed from local /mode HTML"
  else
    ok "Parsed chunk paths from local /mode HTML"
    while IFS= read -r CHUNK_PATH; do
      [[ -z "${CHUNK_PATH}" ]] && continue

      LOCAL_CHUNK_URL="http://127.0.0.1:${PORT}${CHUNK_PATH}"
      PUBLIC_CHUNK_URL="${PUBLIC_BASE}${CHUNK_PATH}"

      LOCAL_CHUNK_CODE="$(fetch_code "${LOCAL_CHUNK_URL}")"
      if is_good_code "${LOCAL_CHUNK_CODE}"; then
        ok "Local chunk ${CHUNK_PATH} -> ${LOCAL_CHUNK_CODE}"
      else
        err "Local chunk ${CHUNK_PATH} -> ${LOCAL_CHUNK_CODE:-N/A}"
      fi

      PUBLIC_CHUNK_CODE="$(fetch_code "${PUBLIC_CHUNK_URL}")"
      if is_good_code "${PUBLIC_CHUNK_CODE}"; then
        ok "Public chunk ${CHUNK_PATH} -> ${PUBLIC_CHUNK_CODE}"
      else
        err "Public chunk ${CHUNK_PATH} -> ${PUBLIC_CHUNK_CODE:-N/A}"
      fi
    done <<< "${CHUNKS}"
  fi
else
  err "curl not found"
fi

if command -v nginx >/dev/null 2>&1; then
  if nginx -t >/dev/null 2>&1; then
    ok "Nginx config test passed"
  else
    err "Nginx config test failed"
    nginx -t || true
  fi

  if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active nginx >/dev/null 2>&1; then
      ok "Nginx service is active"
    else
      err "Nginx service is not active"
    fi
  else
    warn "systemctl not found, skip nginx service check"
  fi
else
  warn "nginx not found, skip nginx checks"
fi

echo "----------------------------------------"
if [[ "${FAIL}" -eq 0 ]]; then
  echo "RESULT: PASS"
  exit 0
else
  echo "RESULT: FAIL"
  echo "Tip: check 'pm2 logs ${APP_NAME} --lines 120' and nginx error logs."
  exit 1
fi
