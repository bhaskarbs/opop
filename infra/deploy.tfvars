# The live, currently-applied state of every scale/cost toggle (see variables.tf:
# frontend_mode, enable_redis, enable_elasticsearch, load_balancer_domain,
# firebase_custom_domain, sql_tier, enable_sql_read_replica, backend_max_instances,
# backend_min_instances, enable_backend_night_schedule, seo_crawling_enabled) — tracked in
# git (unlike terraform.tfvars) because .github/workflows/deploy.yml reads this exact file on
# every push to main, so it needs to reflect reality for CI to apply the right thing.
# scripts/deploy-firebase.sh, deploy-loadbalancer.sh, enable-redis.sh, disable-redis.sh,
# enable-elasticsearch.sh, disable-elasticsearch.sh, set-loadbalancer-domain.sh,
# set-firebase-domain.sh, upgrade/downgrade-sql-replica.sh, scale-up/down-backend.sh,
# keep-backend-warm.sh/allow-backend-scale-to-zero.sh,
# enable/disable-backend-night-schedule.sh, and enable/disable-seo-crawling.sh all update this
# file locally AND apply immediately — commit + push the change afterward so CI's next run
# doesn't reapply a stale value and undo what you just did.
#
# enable_backend_night_schedule's nightly scale-down/scale-up (see scheduler.tf) deliberately
# does NOT go through this file at all, unlike every other toggle here — see
# variables.tf's own comment on that variable for why a twice-daily deploy.tfvars edit would
# fight with CI's terraform apply on every push to main.
#
# alert_notification_email deliberately does NOT live here, unlike everything else on this list
# — this repo is public, and unlike GCP_PROJECT_ID/GCP_REGION (also not secret, but harmless to
# expose), a personal email address genuinely shouldn't sit in permanent public commit history.
# It's passed to CI as the ALERT_NOTIFICATION_EMAIL repo variable instead (see ci.yml and
# infra/README.md's CI/CD section) — set once via `gh variable set`, never committed.
frontend_mode                 = "firebase"
enable_redis                  = false
enable_elasticsearch          = false
load_balancer_domain          = ""
firebase_custom_domain        = "www.openopportunity.in"
sql_tier                      = "db-f1-micro"
enable_sql_read_replica       = false
backend_max_instances         = 2
backend_min_instances         = 1
enable_backend_night_schedule = true
seo_crawling_enabled          = false
