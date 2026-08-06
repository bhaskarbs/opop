# Only created when enable_redis=true (see variables.tf) — Memorystore for Redis, BASIC tier
# (no HA/replica — cheapest option, matches this project's "single instance" minimal-cost
# posture elsewhere, e.g. sql.tf's db-f1-micro), smallest size (1GB). No free tier; this is a
# real ~$36/month fixed cost the moment it's enabled, on top of Cloud SQL.
#
# Memorystore instances are VPC-internal only (no public IP) — reached here via Cloud Run's
# Direct VPC Egress (the `vpc_access.network_interfaces` block on the Cloud Run service in
# run.tf), not the older Serverless VPC Access connector, since Direct VPC Egress scales to zero
# with the rest of Cloud Run instead of adding its own ~$15-20/month fixed cost for a couple of
# always-on connector VMs. Uses the project's default VPC network/subnet — this app has never
# needed a custom VPC, and one isn't worth the added complexity just for this.
resource "google_redis_instance" "cache" {
  count = var.enable_redis ? 1 : 0

  name           = "openopportunity-cache"
  tier           = "BASIC"
  memory_size_gb = 1
  region         = var.region

  depends_on = [google_project_service.required]
}
