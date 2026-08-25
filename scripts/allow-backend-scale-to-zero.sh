#!/usr/bin/env bash
# Sets backend_min_instances = 0 (see run.tf/variables.tf) — Cloud Run scales the backend down to
# zero instances again during idle periods instead of keeping one warm 24/7, trading the real,
# continuous cost that keep-backend-warm.sh turns on for occasional cold-start latency on the
# first request after a quiet period. Doesn't touch any other toggle's current setting (see
# scripts/lib/deploy-tfvars.sh). Companion to scripts/keep-backend-warm.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "backend_min_instances" "0"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
