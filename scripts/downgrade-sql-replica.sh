#!/usr/bin/env bash
# Turns off the Cloud SQL read replica (see infra/sql-replica.tf) and switches the backend back
# to routing every read through the primary, without touching any other toggle's current setting
# (see scripts/lib/deploy-tfvars.sh). Companion to scripts/upgrade-sql-replica.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_sql_read_replica" "false"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

echo ""
echo "The replica instance (openopportunity-db-replica) has been deleted — it held no data that"
echo "doesn't already exist on the primary, so this is safe. Re-run"
echo "scripts/upgrade-sql-replica.sh anytime to recreate it (a fresh full sync from the primary,"
echo "not a resume of the old one)."
remind_to_commit_deploy_tfvars
