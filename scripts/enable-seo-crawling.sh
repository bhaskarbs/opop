#!/usr/bin/env bash
# Lets search engines crawl/index production again (see application.properties'
# app.seo.crawling-enabled doc comment and com.openopportunity.seo.RobotsController/JobSeoService
# for what this actually flips: robots.txt Allow: /, a populated sitemap.xml, and no noindex tag
# on job pages) — without touching any other deploy.tfvars toggle (see
# scripts/lib/deploy-tfvars.sh). Companion to scripts/disable-seo-crawling.sh.
#
# Requires: terraform and infra/terraform.tfvars already set up (see infra/README.md).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/deploy-tfvars.sh
source "$REPO_ROOT/scripts/lib/deploy-tfvars.sh"

set_deploy_tfvar "$REPO_ROOT" "seo_crawling_enabled" "true"

echo "==> terraform apply"
(cd "$REPO_ROOT/infra" && terraform apply -var-file="deploy.tfvars")
remind_to_commit_deploy_tfvars
