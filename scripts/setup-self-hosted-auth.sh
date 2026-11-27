#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="$ROOT_DIR/secrets"
AUTH_FILE="$SECRETS_DIR/.htpasswd"

if ! command -v openssl >/dev/null 2>&1; then
  echo "OpenSSL is required to generate the private access credential." >&2
  exit 1
fi

umask 077
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

read -r -p "Private login username [habitflow]: " username
username="${username:-habitflow}"
if [[ ! "$username" =~ ^[A-Za-z0-9._-]{3,32}$ ]]; then
  echo "Username must be 3-32 characters: letters, numbers, dot, underscore or hyphen." >&2
  exit 1
fi

while true; do
  IFS= read -r -s -p "Choose a strong server access password (16+ characters): " password
  printf '\n'
  if (( ${#password} < 16 )); then
    echo "Use at least 16 characters."
    continue
  fi
  IFS= read -r -s -p "Confirm password: " confirmation
  printf '\n'
  if [[ "$password" == "$confirmation" ]]; then
    break
  fi
  echo "Passwords do not match. Try again."
done

hash="$(printf '%s' "$password" | openssl passwd -6 -stdin)"
unset password confirmation
tmp_file="$(mktemp "$SECRETS_DIR/.htpasswd.XXXXXX")"
printf '%s:%s\n' "$username" "$hash" > "$tmp_file"
chmod 600 "$tmp_file"
mv -f "$tmp_file" "$AUTH_FILE"

echo
echo "Private server login created at: $AUTH_FILE"
echo "This file contains a SHA-512 crypt password hash. Keep it private and do not commit it."

detected_host="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}' || true)"
if [[ -z "$detected_host" ]]; then
  detected_host="$(hostname -I 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i !~ /^127\\./ && $i !~ /^172\\./ && index($i, ":") == 0) {print $i; exit}}' || true)"
fi
detected_host="${detected_host:-localhost}"
read -r -p "LAN IP or hostname for HTTPS [$detected_host]: " host
host="${host:-$detected_host}"
if [[ ! "$host" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "Use an IPv4 address or DNS hostname without scheme, path, or port." >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  if grep -q '^HABITFLOW_HOST=' "$ROOT_DIR/.env"; then
    sed -i "s/^HABITFLOW_HOST=.*/HABITFLOW_HOST=$host/" "$ROOT_DIR/.env"
  else
    printf '\nHABITFLOW_HOST=%s\n' "$host" >> "$ROOT_DIR/.env"
  fi
else
  printf 'HABITFLOW_HOST=%s\n' "$host" > "$ROOT_DIR/.env"
fi
chmod 600 "$ROOT_DIR/.env"

echo "HTTPS host saved in .env: $host"
echo "Next: run ./scripts/start-self-hosted.sh"
