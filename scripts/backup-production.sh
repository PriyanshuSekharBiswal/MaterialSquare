#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
mkdir -p backups
backup_file="backups/material-square-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
trap 'rm -f "$backup_file.partial"' EXIT
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres pg_dump -U material_square -d material_square --no-owner --no-acl | gzip > "$backup_file.partial"
gzip -t "$backup_file.partial"
mv "$backup_file.partial" "$backup_file"
printf 'Backup created: %s\n' "$backup_file"
