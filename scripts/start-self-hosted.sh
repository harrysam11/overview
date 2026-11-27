#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -s "$ROOT_DIR/secrets/.htpasswd" ]]; then
  echo "Private login is not configured."
  echo "Run: ./scripts/setup-self-hosted-auth.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but is not installed. Install Docker Engine and the Compose plugin manually, then retry."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required. Install it manually, then retry."
  exit 1
fi

docker compose up -d --build
echo
echo "HabitFlow is running behind HTTP Basic Auth on port 8080."
echo "Open http://localhost:8080 on the server, or http://<server-lan-ip>:8080 on your private home network."
echo "Do not configure router port forwarding. Use a private VPN for remote access."
