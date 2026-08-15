# Only looked up when var.backend_image is blank — i.e. every manual apply that isn't explicitly
# trying to change the deployed code (see variables.tf's backend_image). Confirmed the real bug
# this fixes: terraform.tfvars's backend_image is gitignored/per-machine and only ever updated by
# hand, so it silently went stale the moment CI deployed a newer image — a plain local
# `terraform apply` for something unrelated (e.g. a SQL tier change) would have rolled the
# backend back to whatever old tag happened to still be sitting in terraform.tfvars. On a
# genuinely first-ever apply (no service exists yet) this is never evaluated, since bootstrapping
# requires passing a real image explicitly (see infra/README.md's "First run") — backend_image is
# never blank at that point, so count stays 0.
data "google_cloud_run_v2_service" "current" {
  count    = var.backend_image == "" ? 1 : 0
  name     = "openopportunity-backend"
  location = var.region
}

locals {
  backend_image = var.backend_image != "" ? var.backend_image : data.google_cloud_run_v2_service.current[0].template[0].containers[0].image
}

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
      # Scale-to-zero — this is a low/no-traffic deploy, so idle cost matters more than
      # cold-start latency. Raise this (a bigger decision than max_instance_count below — it's
      # what actually costs money 24/7, not just a ceiling) once that trade-off flips; not
      # something scale-up/down-backend.sh touch, on purpose.
      min_instance_count = 0
      # See variables.tf — scripts/scale-up-backend.sh / scale-down-backend.sh set this.
      max_instance_count = var.backend_max_instances
    }

    containers {
      image = local.backend_image

      # Cloud Run's own default (512Mi) when this block is omitted turned out too small for a
      # real first boot — confirmed against actual Cloud Run logs, not assumed: the first-ever
      # revision was OOM-killed mid-startup ("Memory limit of 512 MiB exceeded with 518 MiB
      # used"), well before Flyway even finished its 54 migrations. JPA + Flyway + the
      # Elasticsearch client libraries (loaded at boot even when app.search.provider=postgres —
      # see build.gradle's comment) push a cold JVM over 512Mi before the app is even serving
      # traffic. 1Gi leaves real headroom rather than min-maxing right against another OOM.
      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

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
        value = local.cors_allowed_origins
      }

      # See mail.tf — Resend's SMTP relay. "resend" is Resend's own literal SMTP username (not
      # an email address); the real credential is the API key, held in Secret Manager like every
      # other sensitive value here. app.community.contact-email (APP_COMMUNITY_CONTACT_EMAIL) is
      # left unset deliberately — no separate inbox for that yet, same "blank means disabled"
      # convention as everywhere else in this app.
      env {
        name  = "MAIL_HOST"
        value = "smtp.resend.com"
      }
      env {
        name  = "MAIL_PORT"
        value = "587"
      }
      env {
        name  = "MAIL_USERNAME"
        value = "resend"
      }
      env {
        name = "MAIL_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.resend_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "APP_MAIL_FROM"
        value = "customersupport@openopportunity.in"
      }

      # See uploads.tf — unlike Redis/Elasticsearch/the read replica, this isn't behind a
      # toggle: without it the backend silently falls back to app.storage.provider=local
      # (Cloud Run's ephemeral per-instance disk), which loses uploads on every
      # redeploy/restart. Names match application.properties' own ${STORAGE_PROVIDER:...}/
      # ${STORAGE_GCS_BUCKET:...} placeholders exactly, same "not Spring Boot's relaxed-binding
      # names" reasoning as CACHE_PROVIDER/SEARCH_PROVIDER above.
      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
      }
      env {
        name  = "STORAGE_GCS_BUCKET"
        value = google_storage_bucket.uploads.name
      }

      # See redis.tf — omitted entirely (not just left at its local-first default) when
      # enable_redis=false, since CACHE_PROVIDER's own default (caffeine, see
      # application.properties) already means "no Redis needed" with zero env vars set. Env var
      # names here match application.properties' own ${CACHE_PROVIDER:...}/${REDIS_HOST:...}
      # placeholders exactly — not Spring Boot's native relaxed-binding names (there is no
      # SPRING_DATA_REDIS_HOST equivalent read anywhere here, on purpose, same as
      # SEARCH_PROVIDER/ELASTICSEARCH_* below).
      dynamic "env" {
        for_each = var.enable_redis ? [1] : []
        content {
          name  = "CACHE_PROVIDER"
          value = "redis"
        }
      }
      dynamic "env" {
        for_each = var.enable_redis ? [1] : []
        content {
          name  = "REDIS_HOST"
          value = google_redis_instance.cache[0].host
        }
      }
      dynamic "env" {
        for_each = var.enable_redis ? [1] : []
        content {
          name  = "REDIS_PORT"
          value = tostring(google_redis_instance.cache[0].port)
        }
      }

      # See elasticsearch.tf — same "omit rather than set to the default" reasoning as Redis
      # above (app.search.provider=postgres is the local-first default), and same "match
      # application.properties' own placeholder names exactly" reasoning too.
      dynamic "env" {
        for_each = var.enable_elasticsearch ? [1] : []
        content {
          name  = "SEARCH_PROVIDER"
          value = "elasticsearch"
        }
      }
      dynamic "env" {
        for_each = var.enable_elasticsearch ? [1] : []
        content {
          name  = "ELASTICSEARCH_URIS"
          value = ec_deployment.search[0].elasticsearch.https_endpoint
        }
      }
      dynamic "env" {
        for_each = var.enable_elasticsearch ? [1] : []
        content {
          name  = "ELASTICSEARCH_USERNAME"
          value = ec_deployment.search[0].elasticsearch_username
        }
      }
      dynamic "env" {
        for_each = var.enable_elasticsearch ? [1] : []
        content {
          name = "ELASTICSEARCH_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.elasticsearch_password[0].secret_id
              version = "latest"
            }
          }
        }
      }

      # See sql-replica.tf — same "omit rather than set to the default" reasoning as Redis/
      # Elasticsearch above, and same application.properties-placeholder-exact naming too
      # (${READ_REPLICA_ENABLED:...} etc., not Spring Boot's relaxed-binding names). Reuses the
      # SAME db-password secret as SPRING_DATASOURCE_PASSWORD above — a Cloud SQL read replica
      # shares its primary's users/passwords via replication, so there's no separate replica
      # credential to manage.
      dynamic "env" {
        for_each = var.enable_sql_read_replica ? [1] : []
        content {
          name  = "READ_REPLICA_ENABLED"
          value = "true"
        }
      }
      dynamic "env" {
        for_each = var.enable_sql_read_replica ? [1] : []
        content {
          name  = "READ_REPLICA_URL"
          value = "jdbc:postgresql:///${google_sql_database.app.name}?cloudSqlInstance=${google_sql_database_instance.replica[0].connection_name}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
        }
      }
      dynamic "env" {
        for_each = var.enable_sql_read_replica ? [1] : []
        content {
          name  = "READ_REPLICA_USERNAME"
          value = google_sql_user.app.name
        }
      }
      dynamic "env" {
        for_each = var.enable_sql_read_replica ? [1] : []
        content {
          name = "READ_REPLICA_PASSWORD"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app["db-password"].secret_id
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        # Cloud Run's cloudsql volume happily exposes more than one instance's socket at once —
        # each gets its own path under /cloudsql/<connection_name>, which is exactly what the
        # primary-vs-replica JDBC URLs above each reference. try() (not a bare index) on the
        # replica's connection_name for the same reason as every other count-gated reference in
        # this codebase: the "false" branch of a ternary still gets the "true" branch's [0]
        # index eagerly evaluated, which errors when that resource's count is 0 — confirmed
        # empirically (see frontend.tf's identical reasoning) rather than assumed.
        instances = var.enable_sql_read_replica ? [
          google_sql_database_instance.main.connection_name,
          try(google_sql_database_instance.replica[0].connection_name, ""),
        ] : [google_sql_database_instance.main.connection_name]
      }
    }

    # Direct VPC Egress (not the older Serverless VPC Access connector — see redis.tf) so the
    # backend can reach Memorystore's private IP. Only attached when enable_redis=true; Cloud
    # SQL doesn't need this (it connects over the separate cloudsql Unix-socket volume mount
    # above, not a VPC route), and nothing else in this app needs VPC-internal access.
    dynamic "vpc_access" {
      for_each = var.enable_redis ? [1] : []
      content {
        network_interfaces {
          network    = "default"
          subnetwork = "default"
        }
        # Only routes traffic to RFC 1918 ranges (i.e. Memorystore) through the VPC — public
        # internet egress (the Anthropic API, SMTP, etc.) stays on Cloud Run's normal direct
        # path rather than being forced through the VPC too.
        egress = "PRIVATE_RANGES_ONLY"
      }
    }
  }

  depends_on = [
    google_project_iam_member.backend_cloudsql_client,
    google_secret_manager_secret_iam_member.backend_secret_access,
    google_secret_manager_secret_iam_member.backend_elasticsearch_password_access,
    google_secret_manager_secret_iam_member.backend_resend_api_key_access,
    google_storage_bucket_iam_member.uploads_backend_access,
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
