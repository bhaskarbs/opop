# Only created when alert_notification_email is set (see variables.tf) — notifies a human when
# load crosses a threshold; never runs anything itself. Deliberately not automation: turning
# Redis/Elasticsearch/the SQL read replica on or off has real recurring cost either way, and
# turning Elasticsearch/the replica off actually destroys provisioned infrastructure (a fresh
# Elasticsearch deployment or a replica that has to fully re-sync from scratch next time) — an
# unattended policy that flips those on/off automatically risks flapping (rapidly toggling near
# a threshold) and real cost/data churn with nobody ever looking at it. A human reading an alert
# and deciding whether to run the suggested script is the actual workflow — see
# infra/README.md's "Load monitoring" section.
#
# Threshold/duration values below are reasonable starting points, not tuned against this app's
# real traffic (which doesn't exist yet) — revisit them once it does; that's normal for any new
# alerting setup, not a gap specific to this one.

locals {
  monitoring_enabled = var.alert_notification_email != ""
}

resource "google_monitoring_notification_channel" "email" {
  count = local.monitoring_enabled ? 1 : 0

  display_name = "OpenOpportunity alerts"
  type         = "email"
  labels = {
    email_address = var.alert_notification_email
  }

  depends_on = [google_project_service.required]
}

resource "google_monitoring_alert_policy" "backend_cpu_high" {
  count = local.monitoring_enabled ? 1 : 0

  display_name = "OpenOpportunity: backend CPU high"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run backend CPU utilization > 80% for 5m"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/container/cpu/utilizations\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  documentation {
    content   = <<-EOT
      Backend CPU has been over 80% for 5+ minutes — the app is under real load. Consider:
      - `./scripts/scale-up-backend.sh <n>` to raise the instance ceiling if it's currently
        pinned at backend_max_instances (check with `terraform output` or the Cloud Run console).
      - `./scripts/enable-redis.sh` if admin report load looks like the driver (repeated
        expensive queries the in-process Caffeine cache isn't sharing across instances).
      - `./scripts/upgrade-sql-replica.sh` if this correlates with the "database CPU high"
        alert too — see that one.
    EOT
    mime_type = "text/markdown"
  }

  notification_channels = [google_monitoring_notification_channel.email[0].name]

  depends_on = [google_project_service.required]
}

resource "google_monitoring_alert_policy" "backend_cpu_low" {
  count = local.monitoring_enabled ? 1 : 0

  display_name = "OpenOpportunity: backend CPU sustained low"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run backend CPU utilization < 10% for 30m"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"openopportunity-backend\" AND metric.type = \"run.googleapis.com/container/cpu/utilizations\""
      comparison      = "COMPARISON_LT"
      threshold_value = 0.1
      duration        = "1800s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  documentation {
    content   = <<-EOT
      Backend CPU has been under 10% for 30+ minutes — a cost-optimization nudge, not an
      incident. If you've scaled up recently and traffic has settled back down, consider:
      - `./scripts/scale-down-backend.sh <n>` to lower the instance ceiling.
      - `./scripts/disable-redis.sh` / `./scripts/disable-elasticsearch.sh` /
        `./scripts/downgrade-sql-replica.sh` if any of those were enabled for a load spike
        that's now over.
    EOT
    mime_type = "text/markdown"
  }

  notification_channels = [google_monitoring_notification_channel.email[0].name]

  depends_on = [google_project_service.required]
}

resource "google_monitoring_alert_policy" "database_cpu_high" {
  count = local.monitoring_enabled ? 1 : 0

  display_name = "OpenOpportunity: database CPU high"
  combiner     = "OR"

  conditions {
    display_name = "Cloud SQL primary CPU utilization > 80% for 5m"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND resource.labels.database_id = \"${var.project_id}:openopportunity-db\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  documentation {
    content   = <<-EOT
      The primary Cloud SQL instance's CPU has been over 80% for 5+ minutes. Consider:
      - `./scripts/upgrade-sql-replica.sh` to move read traffic off the primary — this only
        helps if reads (not writes) are the driver; check Cloud SQL's own query insights first.
      - If writes are the driver, a replica won't help — that needs a bigger primary tier
        (not something any current script handles; a manual sql.tf change).
    EOT
    mime_type = "text/markdown"
  }

  notification_channels = [google_monitoring_notification_channel.email[0].name]

  depends_on = [google_project_service.required]
}
