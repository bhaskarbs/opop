#!/usr/bin/env bash
# Takes an on-demand Cloud SQL backup right now — the manual trigger for a project that
# deliberately keeps automated backups off (see enable_automated_backups in infra/variables.tf).
# Doesn't touch any Terraform state or toggle; just calls the Cloud SQL Admin API directly, same
# as clicking "Create backup" in the console.
#
# Usage: ./backup-db-now.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTANCE="openopportunity-db"
PROJECT="$(cd "$REPO_ROOT/infra" && terraform output -raw sql_connection_name 2>/dev/null | cut -d: -f1)"

if [ -z "$PROJECT" ]; then
  echo "Couldn't determine the project id from terraform output — is infra/ applied?" >&2
  exit 1
fi

echo "==> Creating an on-demand backup of $INSTANCE in $PROJECT"
gcloud sql backups create --instance="$INSTANCE" --project="$PROJECT"

echo ""
echo "==> Recent backups:"
gcloud sql backups list --instance="$INSTANCE" --project="$PROJECT" \
  --format="table(id,windowStartTime,status,type)" --limit=5
