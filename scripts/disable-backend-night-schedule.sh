#!/usr/bin/env bash
# Turns off the nightly Cloud Scheduler jobs (see infra/scheduler.tf) — the backend goes back to
# staying at whatever backend_min_instances is set to, 24/7, with no nightly scale-down. Doesn't
# touch any other toggle's current setting (see scripts/lib/deploy-tfvars.sh). Companion to
# scripts/enable-backend-night-schedule.sh.
#
# Note: if the backend happens to be scaled to 0 at the moment you run this (i.e. it's currently
# within the 11PM-7AM IST window), the terraform apply below immediately scales it back up to
# backend_min_instances anyway — Terraform reconciles the *whole* live state against deploy.tfvars
# on every apply, not just the one setting this script changes, so it corrects that drift as a
# side effect regardless of the hour.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_backend_night_schedule" "false"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
