# var.sql_tier defaults to the cheapest available tier — this is a low/no-traffic deploy by
# default, not the multi-region AlloyDB setup the architecture doc describes for real scale.
# Bump sql_tier (see scripts/set-sql-tier.sh) before any real traffic arrives; revisit AlloyDB
# separately if you outgrow Cloud SQL entirely — see the "Hardening / scale-up" phase in
# docs/DEVELOPMENT_ROADMAP.md.
resource "google_sql_database_instance" "main" {
  name             = "openopportunity-db"
  region           = var.region
  database_version = "POSTGRES_16"

  settings {
    tier              = var.sql_tier
    edition           = "ENTERPRISE" # covers both shared-core (db-f1-micro/db-g1-small) and dedicated-core (db-custom-*) tiers
    availability_type = "ZONAL"

    ip_configuration {
      # No authorized network is opened for direct client TCP access. Cloud Run
      # reaches this instance through the Cloud SQL Auth Proxy tunnel mounted at
      # /cloudsql (see run.tf), which authenticates via IAM through the Cloud SQL
      # Admin API rather than a raw IP allowlist.
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = var.sql_deletion_protection

  depends_on = [google_project_service.required]
}

resource "google_sql_database" "app" {
  name     = "openopportunity"
  instance = google_sql_database_instance.main.name
}

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "google_sql_user" "app" {
  name     = "openopportunity"
  instance = google_sql_database_instance.main.name
  password = random_password.db.result
}
