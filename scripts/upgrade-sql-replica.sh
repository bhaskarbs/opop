#!/usr/bin/env bash
# Turns on a Cloud SQL read replica (see infra/sql-replica.tf) — ~$9-11/month once applied, same
# tier as the primary — without touching any other toggle's current setting (see
# scripts/lib/deploy-tfvars.sh). The backend automatically starts routing
# @Transactional(readOnly = true) reads to it (see ReadReplicaDataSourceConfig/
# ReadOnlyRoutingAspect) — no code change, no redeploy of the image needed, just this apply.
# Companion to scripts/downgrade-sql-replica.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_sql_read_replica" "true"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

echo ""
echo "Note: Terraform won't finish this apply until the new replica instance is actually up, so"
echo "Cloud Run won't be deployed pointing at a replica that doesn't exist yet. It can still take"
echo "a while after that to finish its initial full sync from the primary, though — reads may see"
echo "some replication lag (stale-but-not-wrong data) during that window. Writes are unaffected"
echo "throughout (they always go to the primary)."
