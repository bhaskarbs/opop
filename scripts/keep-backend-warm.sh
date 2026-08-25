#!/usr/bin/env bash
# Sets backend_min_instances = 1 (see run.tf/variables.tf) so Cloud Run keeps one backend
# instance warm 24/7 instead of scaling to zero when idle — eliminates the 10-30+ second
# cold-start latency (full container boot + Spring Boot init) on the first request after any
# quiet period, at a real, continuous cost (roughly $15-25/month at this service's current
# 1 vCPU / 1Gi, no free tier once min_instance_count > 0). Doesn't touch any other toggle's
# current setting (see scripts/lib/deploy-tfvars.sh). Companion to
# scripts/allow-backend-scale-to-zero.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "backend_min_instances" "1"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
