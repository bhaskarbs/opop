#!/usr/bin/env bash
# Sets sql_tier (see infra/variables.tf) and applies — resizes the Cloud SQL primary, and the
# read replica too if enable_sql_read_replica=true (sql-replica.tf always matches the primary's
# tier). This is a real, in-place Cloud SQL machine-type change: expect a short restart/
# unavailability window while it applies, same as changing a machine type on any managed
# database, and a real recurring cost change if you're moving to a bigger tier.
#
# Usage: ./set-sql-tier.sh db-g1-small
#        ./set-sql-tier.sh db-custom-2-7680
#        ./set-sql-tier.sh db-f1-micro   # back to the cheapest default
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <tier>   (e.g. db-f1-micro, db-g1-small, db-custom-2-7680)" >&2
  exit 1
fi
TIER="$1"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "sql_tier" "\"$TIER\""

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

echo ""
echo "Cloud SQL sizes max_connections off available memory, not something this script can tell"
echo "you in advance — check the real value on the resized instance with:"
echo "  cloud-sql-proxy --port 5433 \$(cd \"$REPO_ROOT/infra\" && terraform output -raw sql_connection_name) &"
echo "  psql -h 127.0.0.1 -p 5433 -U openopportunity -d openopportunity -c 'SHOW max_connections;'"
remind_to_commit_deploy_tfvars
