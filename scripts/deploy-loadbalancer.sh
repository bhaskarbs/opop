#!/usr/bin/env bash
# Switches frontend_mode to "load-balancer" (see infra/variables.tf) and does the full
# apply -> build -> deploy sequence in one command — no flags to remember. enable_redis and
# enable_elasticsearch keep whatever they're currently set to in infra/deploy.tfvars (see
# scripts/lib/deploy-tfvars.sh), untouched by this script. Costs roughly $18/month more than
# scripts/deploy-firebase.sh (the load balancer's flat forwarding-rule charge) — worth it once
# you need Cloud Armor, a move to GKE, or routing rules Firebase Hosting's rewrites can't
# express (see infra/README.md's "moving to the load balancer" section).
#
# Companion to scripts/deploy-firebase.sh (the other frontend mode) and
# scripts/enable-redis.sh / disable-redis.sh / enable-elasticsearch.sh / disable-elasticsearch.sh
# (the two other, independent toggles) — every scripts/*.sh here is one action, no arguments.
#
# Requires: terraform, gcloud CLI (authenticated — `gcloud auth application-default login`), and
# infra/terraform.tfvars already set up (see infra/README.md) — same one-time setup as any other
# deploy, not automated here since it needs an interactive login only you can do.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "frontend_mode" '"load-balancer"'

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

BACKEND_URL="$(cd "$REPO_ROOT/infra" && terraform output -raw backend_url)"
FRONTEND_BUCKET="$(cd "$REPO_ROOT/infra" && terraform output -raw frontend_bucket)"
echo "==> Backend URL: $BACKEND_URL"
echo "==> Frontend bucket: $FRONTEND_BUCKET"

echo "==> Building frontend"
(cd "$REPO_ROOT" && VITE_API_BASE_URL="$BACKEND_URL" npm run build --workspace=frontend)

echo "==> Syncing dist/ to gs://$FRONTEND_BUCKET"
gsutil -m rsync -r -d "$REPO_ROOT/frontend/dist" "gs://$FRONTEND_BUCKET"

echo ""
echo "Done. Frontend URL:"
(cd "$REPO_ROOT/infra" && terraform output frontend_url)
remind_to_commit_deploy_tfvars
