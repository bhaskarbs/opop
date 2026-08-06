#!/usr/bin/env bash
# Turns off the Elastic Cloud deployment (see infra/elasticsearch.tf) and switches the backend
# back to app.search.provider=postgres, without touching frontend_mode or enable_redis's current
# settings (see scripts/lib/deploy-tfvars.sh). Companion to scripts/enable-elasticsearch.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "enable_elasticsearch" "false"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
