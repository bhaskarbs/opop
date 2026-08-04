# Backs app.security.rate-limit.store=redis (see RedisRateLimiter/RedisRateLimitConfig) —
# without this, each Cloud Run instance in run.tf's up-to-2-instance scaling tracks its own
# rate-limit counters and the effective limit multiplies by however many instances happen to be
# running. Basic tier (single node, no replica) matches this deploy's "cheapest available, not
# the real-scale setup" posture elsewhere in infra/ (see sql.tf) — add a replica (STANDARD_HA)
# before any real traffic arrives.
resource "google_redis_instance" "rate_limit" {
  name           = "openopportunity-rate-limit"
  region         = var.region
  tier           = "BASIC"
  memory_size_gb = 1
  redis_version  = "REDIS_7_0"

  # Memorystore is VPC-internal only (no public IP option) — authorized_network ties it to the
  # project's auto-created default network, the same one the connector below attaches to.
  authorized_network = "default"

  depends_on = [google_project_service.required]
}

# Cloud Run is serverless and isn't attached to a VPC by default (unlike Cloud SQL, which run.tf
# reaches through the Cloud SQL Auth Proxy over the Cloud SQL Admin API rather than VPC routing),
# so it needs this connector as the on-ramp to reach Memorystore's VPC-internal IP at all.
resource "google_vpc_access_connector" "redis" {
  name          = "openopportunity-redis"
  region        = var.region
  network       = "default"
  ip_cidr_range = "10.8.0.0/28"

  depends_on = [google_project_service.required]
}
