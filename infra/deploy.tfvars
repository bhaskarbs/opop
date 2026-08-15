# The live, currently-applied state of every scale/cost toggle (see variables.tf:
# frontend_mode, enable_redis, enable_elasticsearch, load_balancer_domain,
# firebase_custom_domain, sql_tier, enable_sql_read_replica, backend_max_instances) — tracked in
# git (unlike terraform.tfvars) because .github/workflows/deploy.yml reads this exact file on
# every push to main, so it needs to reflect reality for CI to apply the right thing.
# scripts/deploy-firebase.sh, deploy-loadbalancer.sh, enable-redis.sh, disable-redis.sh,
# enable-elasticsearch.sh, disable-elasticsearch.sh, set-loadbalancer-domain.sh,
# set-firebase-domain.sh, upgrade/downgrade-sql-replica.sh, and scale-up/down-backend.sh all
# update this file locally AND apply immediately — commit + push the change afterward so CI's
# next run doesn't reapply a stale value and undo what you just did.
#
# alert_notification_email deliberately does NOT live here, unlike everything else on this list
# — this repo is public, and unlike GCP_PROJECT_ID/GCP_REGION (also not secret, but harmless to
# expose), a personal email address genuinely shouldn't sit in permanent public commit history.
# It's passed to CI as the ALERT_NOTIFICATION_EMAIL repo variable instead (see ci.yml and
# infra/README.md's CI/CD section) — set once via `gh variable set`, never committed.
frontend_mode           = "firebase"
enable_redis            = false
enable_elasticsearch    = false
load_balancer_domain    = ""
firebase_custom_domain = "www.openopportunity.in"
sql_tier                = "db-f1-micro"
enable_sql_read_replica = false
backend_max_instances   = 2
