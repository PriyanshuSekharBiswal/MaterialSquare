#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p 'Staff email (optional): ' STAFF_EMAIL
read -r -p 'Staff name: ' STAFF_NAME
read -r -p 'Staff mobile number: ' STAFF_PHONE
read -r -s -p 'Staff password (at least 12 characters): ' STAFF_PASSWORD
printf '\n'
export STAFF_EMAIL STAFF_NAME STAFF_PASSWORD STAFF_PHONE
trap 'unset STAFF_PASSWORD' EXIT
docker compose --env-file .env.production -f compose.production.yaml exec -T -e STAFF_EMAIL -e STAFF_NAME -e STAFF_PASSWORD -e STAFF_PHONE api node scripts/create-staff.cjs
