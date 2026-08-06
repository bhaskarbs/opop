#!/usr/bin/env bash
# Turns on Memorystore for Redis (see infra/redis.tf) — ~$36/month once applied, no free tier —
# without touching frontend_mode or enable_elasticsearch's current settings (see
# scripts/lib/deploy-tfvars.sh). Companion to scripts/disable-redis.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_redis" "true"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
