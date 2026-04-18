#!/usr/bin/env bash
set -u

# One-click VPS health check for gomoku deployment.
# Usage:
#   bash scripts/vps-health-check.sh [pm2_name] [port] [public_base_url]
# Example:
#   bash scripts/vps-health-check.sh gomoku 3000 http://YOUR_DOMAIN_OR_IP

APP_NAME="${1:-gomoku}"
PORT="${2:-3000}"
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
  LOCAL_CODE="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/mode" || true)"
  if [[ "${LOCAL_CODE}" == "200" ]]; then
    ok "Local health endpoint /mode returns 200"
  else
    err "Local health endpoint /mode returns ${LOCAL_CODE:-N/A}"
  fi

  PUBLIC_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${PUBLIC_BASE}/mode" || true)"
  if [[ "${PUBLIC_CODE}" == "200" ]]; then
    ok "Public health endpoint ${PUBLIC_BASE}/mode returns 200"
  else
    warn "Public endpoint ${PUBLIC_BASE}/mode returns ${PUBLIC_CODE:-N/A}"
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
  echo "Tip: check 'pm2 logs ${APP_NAME} --lines 100' and nginx error logs."
  exit 1
fi

