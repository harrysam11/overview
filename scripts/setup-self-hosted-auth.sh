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

hash="$(printf '%s' "$password" | openssl passwd -apr1 -stdin)"
unset password confirmation
tmp_file="$(mktemp "$SECRETS_DIR/.htpasswd.XXXXXX")"
printf '%s:%s\n' "$username" "$hash" > "$tmp_file"
chmod 600 "$tmp_file"
mv -f "$tmp_file" "$AUTH_FILE"

echo
echo "Private server login created at: $AUTH_FILE"
echo "This file contains a one-way password hash. Keep it private and do not commit it."
echo "Next: run ./scripts/start-self-hosted.sh"
