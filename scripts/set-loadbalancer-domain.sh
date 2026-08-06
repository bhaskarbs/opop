#!/usr/bin/env bash
# Sets load_balancer_domain (see infra/variables.tf) and applies — provisions a Google-managed
# SSL cert for the domain and switches frontend_mode=load-balancer's HTTP proxy to redirect to
# HTTPS instead of serving content directly (see infra/frontend.tf). Doesn't touch
# frontend_mode/enable_redis/enable_elasticsearch's current settings (see
# scripts/lib/deploy-tfvars.sh). Only meaningful once frontend_mode=load-balancer is already
# active (scripts/deploy-loadbalancer.sh) — setting a domain while frontend_mode=firebase is
# active provisions nothing (see local.has_custom_domain in frontend.tf) until you switch.
#
# Usage: ./set-loadbalancer-domain.sh openopportunity.com
#        ./set-loadbalancer-domain.sh ""   # clears it — back to bare-IP HTTP-only
#
# The cert can't actually finish provisioning until your domain's DNS points at the reserved
# IP this prints — that's a step at your domain registrar/DNS provider, outside anything
# Terraform manages here (see infra/README.md).
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <domain>   (e.g. openopportunity.com, or \"\" to clear it)" >&2
  exit 1
fi
DOMAIN="$1"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "load_balancer_domain" "\"$DOMAIN\""

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

if [ -n "$DOMAIN" ]; then
  echo ""
  echo "==> DNS record needed:"
  (cd "$REPO_ROOT/infra" && terraform output load_balancer_dns_instructions)
  echo ""
  echo "The managed SSL cert stays in PROVISIONING until that DNS record exists and propagates —"
  echo "check status with:"
  echo "  gcloud compute ssl-certificates describe openopportunity-frontend --global --format='value(managed.status)'"
fi
