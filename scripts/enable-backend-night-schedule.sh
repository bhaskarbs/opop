#!/usr/bin/env bash
# Turns on the nightly Cloud Scheduler jobs (see infra/scheduler.tf) that scale the backend down
# to 0 instances 11PM-7AM IST and back up to backend_min_instances the rest of the day — only
# meaningful on top of backend_min_instances=1 (scripts/keep-backend-warm.sh); with
# backend_min_instances=0 the nightly scale-down is a no-op and the morning scale-up just fights
# your own standing choice. Doesn't touch any other toggle's current setting (see
# scripts/lib/deploy-tfvars.sh). Companion to scripts/disable-backend-night-schedule.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_backend_night_schedule" "true"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
