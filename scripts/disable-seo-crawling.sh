#!/usr/bin/env bash
# Blocks every search engine from crawling/indexing production (see application.properties'
# app.seo.crawling-enabled doc comment and com.openopportunity.seo.RobotsController/JobSeoService
# for what this actually flips: robots.txt Disallow: /, an empty sitemap.xml, and a noindex tag
# on every job page) — without touching any other deploy.tfvars toggle (see
# scripts/lib/deploy-tfvars.sh). Companion to scripts/enable-seo-crawling.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "seo_crawling_enabled" "false"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
