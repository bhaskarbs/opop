#!/usr/bin/env bash
# Turns off Memorystore for Redis (see infra/redis.tf) and switches the backend back to
# app.cache.provider=caffeine, without touching frontend_mode or enable_elasticsearch's current
# settings (see scripts/lib/deploy-tfvars.sh). Companion to scripts/enable-redis.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_redis" "false"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
