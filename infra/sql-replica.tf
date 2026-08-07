# Only created when enable_sql_read_replica=true (see variables.tf) — a standard same-region
# Cloud SQL read replica of sql.tf's primary. No replica_configuration block: that's only
# needed for cross-region/external-master replication, neither of which applies here. No
# backup_configuration either — backups run against the primary (the actual source of truth);
# a replica is always rebuildable from it, so it doesn't need its own backup history.
#
# deletion_protection is hardcoded false (not tied to var.sql_deletion_protection, which guards
# the primary's real data) — a replica holds no data that doesn't already exist on the primary,
# so there's nothing irreplaceable to protect here, and hardcoding it means
# scripts/downgrade-sql-replica.sh never hits a deletion-protection error.
resource "google_sql_database_instance" "replica" {
  count = var.enable_sql_read_replica ? 1 : 0

  name                 = "openopportunity-db-replica"
  region               = var.region
  database_version     = "POSTGRES_16"
  master_instance_name = google_sql_database_instance.main.name

  settings {
    tier              = var.sql_tier # always matches the primary — see variables.tf's sql_tier
    edition           = "ENTERPRISE" # covers both shared-core and dedicated-core tiers, see sql.tf
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = false

  depends_on = [google_project_service.required]
}
