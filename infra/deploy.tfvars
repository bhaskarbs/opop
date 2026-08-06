# The live, currently-applied state of every scale/cost toggle (see variables.tf:
# frontend_mode, enable_redis, enable_elasticsearch, load_balancer_domain,
# enable_sql_read_replica, backend_max_instances) — tracked in git (unlike terraform.tfvars)
# because .github/workflows/deploy.yml reads this exact file on every push to main, so it needs
# to reflect reality for CI to apply the right thing. scripts/deploy-firebase.sh,
# deploy-loadbalancer.sh, enable-redis.sh, disable-redis.sh, enable-elasticsearch.sh,
# disable-elasticsearch.sh, set-loadbalancer-domain.sh, upgrade/downgrade-sql-replica.sh, and
# scale-up/down-backend.sh all update this file locally AND apply immediately — commit + push
# the change afterward so CI's next run doesn't reapply a stale value and undo what you just did.
frontend_mode           = "firebase"
enable_redis            = false
enable_elasticsearch    = false
load_balancer_domain    = ""
enable_sql_read_replica = false
backend_max_instances   = 2
