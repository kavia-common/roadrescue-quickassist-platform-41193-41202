#!/usr/bin/env bash
set -euo pipefail

# RoadRescue – QuickAssist: run all frontends
# - user website:      http://localhost:3000
# - mechanic portal:   http://localhost:3001
# - admin panel:       http://localhost:3002
#
# This script is intended for local development.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

USER_APP="$ROOT_DIR/frontend_user_website"
MECH_APP="$ROOT_DIR/../roadrescue-quickassist-platform-41193-41204/frontend_mechanic_portal"
ADMIN_APP="$ROOT_DIR/../roadrescue-quickassist-platform-41193-41203/frontend_admin_panel"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required (Node.js). Please install Node.js and npm first."
  exit 1
fi

pids=()

cleanup() {
  # Kill all children if still running (Ctrl+C, errors, etc.)
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done

  # Give processes a moment to exit gracefully, then hard kill
  sleep 0.5 || true
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup INT TERM EXIT

echo "Starting all frontends..."
echo "  [user]     PORT=3000  ($USER_APP)"
echo "  [mechanic] PORT=3001  ($MECH_APP)"
echo "  [admin]    PORT=3002  ($ADMIN_APP)"
echo ""

# Start each app with PORT override. `sed` prefixes logs per app.
# Note: CRA prints its own port info; this prefixing makes mixed logs readable.
(
  cd "$USER_APP"
  PORT=3000 npm start 2>&1 | sed -u 's/^/[user] /'
) &
pids+=("$!")

(
  cd "$MECH_APP"
  PORT=3001 npm start 2>&1 | sed -u 's/^/[mechanic] /'
) &
pids+=("$!")

(
  cd "$ADMIN_APP"
  PORT=3002 npm start 2>&1 | sed -u 's/^/[admin] /'
) &
pids+=("$!")

# Exit if any child exits non-zero.
# `wait -n` is Bash 4.3+; fall back to waiting all if unavailable.
if wait -n "${pids[@]}" 2>/dev/null; then
  echo "One app exited. Shutting down the others..."
  exit 0
else
  echo "An app exited with an error. Shutting down the others..."
  exit 1
fi
