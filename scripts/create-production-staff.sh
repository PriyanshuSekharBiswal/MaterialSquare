#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL="${PRODUCTION_DATABASE_URL:?Set PRODUCTION_DATABASE_URL to the client production database connection string}"
read -r -p 'Staff email (optional): ' STAFF_EMAIL
read -r -p 'Staff name: ' STAFF_NAME
read -r -p 'Staff mobile number: ' STAFF_PHONE
read -r -s -p 'Staff password (at least 8 characters): ' STAFF_PASSWORD
printf '\n'
export STAFF_EMAIL STAFF_NAME STAFF_PASSWORD STAFF_PHONE
trap 'unset STAFF_PASSWORD' EXIT
node scripts/create-staff.cjs
