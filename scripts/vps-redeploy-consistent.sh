#!/usr/bin/env bash
set -euo pipefail

# Strong-consistency redeploy for gomoku-fusion-v2.
# Usage:
#   bash scripts/vps-redeploy-consistent.sh [repo_dir] [pm2_name] [port] [public_base_url]
# Example:
#   bash scripts/vps-redeploy-consistent.sh /opt/gomoku-fusion-v2 gomoku-fusion-v2 3010 https://yanyan-gomoku.duckdns.org

REPO_DIR="${1:-/opt/gomoku-fusion-v2}"
APP_NAME="${2:-gomoku-fusion-v2}"
PORT="${3:-3010}"
PUBLIC_BASE="${4:-https://yanyan-gomoku.duckdns.org}"

echo "========================================"
echo "Gomoku Strong-Consistency Redeploy"
echo "Repo: ${REPO_DIR}"
echo "App:  ${APP_NAME}"
echo "Port: ${PORT}"
echo "URL:  ${PUBLIC_BASE}"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================"

cd "${REPO_DIR}"

echo "[1/9] Sync latest code..."
git checkout main
git pull --ff-only origin main

echo "[2/9] Show current commit..."
git rev-parse --short HEAD

echo "[3/9] Stop old process to avoid mixed runtime..."
pm2 delete "${APP_NAME}" || true

echo "[4/9] Clean old Next build artifacts..."
rm -rf .next

echo "[5/9] Install dependencies..."
npm ci --legacy-peer-deps

echo "[6/9] Build production bundle..."
npm run build

echo "[7/9] Start process on target port..."
PORT="${PORT}" pm2 start npm --name "${APP_NAME}" -- run start:multiplayer
pm2 save

echo "[8/9] Reload nginx..."
sudo nginx -t
sudo systemctl restart nginx

echo "[9/9] Run health check..."
bash scripts/vps-health-check.sh "${APP_NAME}" "${PORT}" "${PUBLIC_BASE}"

echo "----------------------------------------"
echo "Redeploy completed."
