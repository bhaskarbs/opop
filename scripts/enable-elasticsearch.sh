#!/usr/bin/env bash
# Turns on a real Elastic Cloud deployment (see infra/elasticsearch.tf) — ~$16-40/month on
# Elastic's own bill, once applied — without touching frontend_mode or enable_redis's current
# settings (see scripts/lib/deploy-tfvars.sh). Companion to scripts/disable-elasticsearch.sh.
#
# Requires: terraform, infra/terraform.tfvars already set up (see infra/README.md), and
# TF_VAR_elastic_cloud_api_key already exported — an Elastic Cloud account/API key is a separate
# one-time setup from GCP, not something this script can do for you.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

if [ -z "${TF_VAR_elastic_cloud_api_key:-}" ]; then
  echo "TF_VAR_elastic_cloud_api_key isn't set — see infra/README.md's Elastic Cloud setup." >&2
  exit 1
fi

set_deploy_tfvar "$REPO_ROOT" "enable_elasticsearch" "true"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
