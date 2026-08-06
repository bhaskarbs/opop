#!/usr/bin/env bash
# Raises the ceiling on concurrent Cloud Run backend instances (max_instance_count, see
# run.tf/variables.tf's backend_max_instances) — Cloud Run still only runs as many as real
# traffic actually needs, up to this number, so raising it costs nothing by itself (unlike
# min_instance_count, which isn't exposed here on purpose — see run.tf's comment). Doesn't touch
# any other toggle's current setting (see scripts/lib/deploy-tfvars.sh). Companion to
# scripts/scale-down-backend.sh.
#
# Usage: ./scale-up-backend.sh <max-instances>   (e.g. ./scale-up-backend.sh 5)
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

if [ "$#" -ne 1 ] || ! [[ "$1" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 <max-instances>   (a positive whole number, e.g. 5)" >&2
  exit 1
fi
NEW_MAX="$1"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

CURRENT_MAX="$(get_deploy_tfvar "$REPO_ROOT" "backend_max_instances")"
if [ -z "$CURRENT_MAX" ]; then
  CURRENT_MAX=2 # variables.tf's default, if deploy.tfvars predates this variable existing
fi
if [ "$NEW_MAX" -le "$CURRENT_MAX" ]; then
  echo "$NEW_MAX isn't higher than the current backend_max_instances ($CURRENT_MAX) — use" >&2
  echo "scale-down-backend.sh instead if that's what you meant." >&2
  exit 1
fi

set_deploy_tfvar "$REPO_ROOT" "backend_max_instances" "$NEW_MAX"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
