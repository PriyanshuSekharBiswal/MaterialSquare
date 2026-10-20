#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -n "${PRODUCTION_DATABASE_URL:-}" ]]; then
  export DATABASE_URL="$PRODUCTION_DATABASE_URL"
elif [[ "${PRODUCTION_API_CONTAINER:-}" != "true" || -z "${DATABASE_URL:-}" ]]; then
  echo "Set PRODUCTION_DATABASE_URL on the host, or run inside the production API container." >&2
  exit 1
fi
if [[ -z "$DATABASE_URL" ]]; then
  echo "The production API container must have DATABASE_URL configured." >&2
  exit 1
fi
read -r -p 'Staff email (optional): ' STAFF_EMAIL
read -r -p 'Staff name: ' STAFF_NAME
read -r -p 'Staff mobile number: ' STAFF_PHONE
read -r -s -p 'Staff password (at least 12 characters): ' STAFF_PASSWORD
printf '\n'
export STAFF_EMAIL STAFF_NAME STAFF_PASSWORD STAFF_PHONE
trap 'unset STAFF_PASSWORD' EXIT
node scripts/create-staff.cjs
