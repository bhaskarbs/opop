resource "google_cloud_run_v2_service" "backend" {
  name     = "openopportunity-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # Unlike the database, this service is stateless — destroying/recreating it loses
  # nothing, so the provider's default protection just adds friction here.
  deletion_protection = false

  template {
    service_account = google_service_account.backend_run.email

    scaling {
      # Scale-to-zero — this is a low/no-traffic deploy, so idle cost matters more
      # than cold-start latency. Raise min_instance_count once that trade-off flips.
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 8080
      }

      # Same JDBC URL shape used locally (see application.properties), just pointed
      # at the Unix socket the cloudsql volume mount below exposes instead of
      # localhost:5432 — Flyway runs on startup exactly as it does against Docker
      # Postgres locally, no separate migration step.
      env {
        name  = "SPRING_DATASOURCE_URL"
        value = "jdbc:postgresql:///${google_sql_database.app.name}?cloudSqlInstance=${google_sql_database_instance.main.connection_name}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
      }
      env {
        name  = "SPRING_DATASOURCE_USERNAME"
        value = google_sql_user.app.name
      }
      env {
        name = "SPRING_DATASOURCE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["db-password"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "APP_JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["jwt-secret"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "APP_ADMIN_SEED_EMAIL"
        value = var.admin_seed_email
      }
      env {
        name = "APP_ADMIN_SEED_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app["admin-seed-password"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "APP_SECURITY_COOKIE_SECURE"
        value = "true"
      }
      env {
        # Frontend (bare IP, this apply) and backend (*.run.app) are different sites,
        # so the refresh cookie needs SameSite=None here — see the comment next to
        # app.security.cookie-same-site in application.properties for why Lax (the
        # local-dev default) silently breaks cross-site.
        name  = "APP_SECURITY_COOKIE_SAME_SITE"
        value = "None"
      }
      env {
        name  = "APP_CORS_ALLOWED_ORIGINS"
        value = local.frontend_origin
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }

  depends_on = [
    google_project_iam_member.backend_cloudsql_client,
    google_secret_manager_secret_iam_member.backend_secret_access,
  ]
}

# Public — the frontend calls this API directly from the browser, matching the local
# setup (no auth in front of the whole service, individual endpoints enforce their own
# auth via Spring Security as they do locally).
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
