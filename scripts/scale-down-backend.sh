#!/usr/bin/env bash
# Lowers the ceiling on concurrent Cloud Run backend instances (max_instance_count, see
# run.tf/variables.tf's backend_max_instances). Doesn't touch any other toggle's current setting
# (see scripts/lib/deploy-tfvars.sh). Companion to scripts/scale-up-backend.sh.
#
# Usage: ./scale-down-backend.sh <max-instances>   (e.g. ./scale-down-backend.sh 1)
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

if [ "$#" -ne 1 ] || ! [[ "$1" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <max-instances>   (a positive whole number, e.g. 1)" >&2
  exit 1
fi
NEW_MAX="$1"
if [ "$NEW_MAX" -lt 1 ]; then
  echo "backend_max_instances must be at least 1 — 0 would make the backend completely" >&2
  echo "unreachable (see variables.tf's validation)." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

CURRENT_MAX="$(get_deploy_tfvar "$REPO_ROOT" "backend_max_instances")"
if [ -z "$CURRENT_MAX" ]; then
  CURRENT_MAX=2 # variables.tf's default, if deploy.tfvars predates this variable existing
fi
if [ "$NEW_MAX" -ge "$CURRENT_MAX" ]; then
  echo "$NEW_MAX isn't lower than the current backend_max_instances ($CURRENT_MAX) — use" >&2
  echo "scale-up-backend.sh instead if that's what you meant." >&2
  exit 1
fi

set_deploy_tfvar "$REPO_ROOT" "backend_max_instances" "$NEW_MAX"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
