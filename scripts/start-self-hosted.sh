#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -s "$ROOT_DIR/secrets/.htpasswd" ]]; then
  echo "Private login is not configured."
  echo "Run: ./scripts/setup-self-hosted-auth.sh"
  exit 1
fi

if [[ ! -f "$ROOT_DIR/.env" ]] || ! grep -q '^HABITFLOW_HOST=' "$ROOT_DIR/.env"; then
  echo "HTTPS hostname/IP is not configured."
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

host="$(sed -n 's/^HABITFLOW_HOST=//p' .env | tail -n 1)"
docker compose up -d --build

echo
echo "HabitFlow is running behind HTTPS and a private server login."
echo "Open: https://${host}:8443"
echo "The browser will require trust of the private Caddy root CA before WebCrypto/PWA features work."

if docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt "$ROOT_DIR/secrets/habitflow-root-ca.crt" >/dev/null 2>&1; then
  chmod 644 "$ROOT_DIR/secrets/habitflow-root-ca.crt"
  echo "Private CA certificate exported to: secrets/habitflow-root-ca.crt"
  echo "Install this certificate as a CA certificate on each of your own devices."
else
  echo "CA certificate is not ready yet. After Caddy starts, export it with:"
  echo "docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./secrets/habitflow-root-ca.crt"
fi

echo
echo "Do not configure router port forwarding. For remote use, connect through a private VPN."
echo "Your personal data remains in each browser's encrypted IndexedDB vault, not in this Docker container."
