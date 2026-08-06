#!/usr/bin/env bash
# Sets firebase_custom_domain (see infra/variables.tf) and applies — this only updates the
# backend's CORS allowlist (infra/frontend.tf's cors_allowed_origins) to trust the domain.
# Unlike scripts/set-loadbalancer-domain.sh, this provisions nothing itself: adding the domain
# to Firebase Hosting (and its SSL cert, and the DNS records Firebase asks you to create) is a
# one-time action in the Firebase console — see infra/README.md. Run this after you've already
# added the domain there, not instead of it.
#
# Also doesn't touch Google Sign-In: the OAuth Client ID's Authorized JavaScript origins is a
# separate allowlist (Cloud Console > APIs & Services > Credentials, not Terraform-managed) that
# needs the same domain added to it by hand, or "Continue with Google" will fail with
# origin_mismatch on the new domain — see infra/README.md.
#
# Usage: ./set-firebase-domain.sh openopportunity.com
#        ./set-firebase-domain.sh ""   # clears it — CORS reverts to just the two Firebase defaults
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <domain>   (e.g. openopportunity.com, or \"\" to clear it)" >&2
  exit 1
fi
DOMAIN="$1"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "firebase_custom_domain" "\"$DOMAIN\""

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")

if [ -n "$DOMAIN" ]; then
  echo ""
  echo "Reminder — this only updated backend CORS. Still needed, if you haven't already:"
  echo "  1. Add $DOMAIN to Firebase Hosting in the Firebase console (if not done already)."
  echo "  2. Add https://$DOMAIN to the Google OAuth Client ID's Authorized JavaScript origins"
  echo "     at https://console.cloud.google.com/apis/credentials"
fi
remind_to_commit_deploy_tfvars
