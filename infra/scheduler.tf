# Only created when enable_backend_night_schedule=true (see variables.tf for the full
# reasoning). Two Cloud Scheduler jobs call the Cloud Run Admin API's PATCH endpoint directly
# with an OAuth token — no Cloud Function/Cloud Run job needed as a go-between, since Cloud
# Scheduler's http_target can authenticate straight to a Google API. updateMask scopes each
# PATCH to just template.scaling.minInstanceCount, leaving every other field (image, env vars,
# resources, ...) untouched.
#
# Confirmed working against the real Cloud Run Admin API (PATCH .../services/openopportunity-backend
# ?updateMask=template.scaling.minInstanceCount, body {"template":{"scaling":{"minInstanceCount":N}}})
# before wiring this up — it accepts partial updates exactly as scoped.
#
# Each PATCH creates a new Cloud Run revision even when the value is unchanged (Cloud Run's own
# behavior, not something this config controls) — two extra revisions/day, which Cloud Run keeps
# around but doesn't bill for on their own.

resource "google_service_account" "backend_scheduler" {
  count = var.enable_backend_night_schedule ? 1 : 0

  account_id   = "openopportunity-sched"
  display_name = "OpenOpportunity backend night-scaling scheduler"
}

# roles/run.developer (not roles/run.admin) — enough to update a service's config, not to touch
# IAM policies or anything else in the project. Project-level (google_project_iam_member), NOT a
# resource-level google_cloud_run_v2_service_iam_member binding scoped to just this service —
# tried that first and it doesn't work: confirmed the hard way that Cloud Run's per-service IAM
# policy only ever enforces invoker-related permissions (roles/run.invoker and similar); it
# silently accepts a setIamPolicy call for a management role like run.developer, but the Admin
# API never actually checks that binding for services.patch/update calls, so every PATCH kept
# 403ing regardless of how long the binding had had to propagate. A project-level grant is the
# only way management permissions like this are actually enforced. The wider blast radius is
# real but currently moot — this project has exactly one Cloud Run service.
resource "google_project_iam_member" "scheduler_backend_developer" {
  count = var.enable_backend_night_schedule ? 1 : 0

  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.backend_scheduler[0].email}"
}

# A separate, easy-to-miss grant from the one above: giving backend_scheduler permission to
# update the Cloud Run service isn't enough on its own — at execution time, Cloud Scheduler's
# own Google-managed service agent (cloud-scheduler.iam.gserviceaccount.com, project-number
# scoped) is what actually mints the OAuth token used for the http_target call, and it needs
# permission to impersonate backend_scheduler in order to do that. Confirmed the hard way: job
# creation succeeds either way, but every execution silently 403s (PERMISSION_DENIED on the
# Cloud Run Admin API call itself, logged in Cloud Scheduler's own execution log) until this
# binding exists.
data "google_project" "current" {}

resource "google_service_account_iam_member" "cloud_scheduler_can_impersonate_backend_scheduler" {
  count = var.enable_backend_night_schedule ? 1 : 0

  service_account_id = google_service_account.backend_scheduler[0].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}

# A third, also easy-to-miss grant: even with roles/run.developer (permission to update the
# service) and the token-minting grant above (permission to actually get an OAuth token),
# updating a Cloud Run service's template still separately requires the caller to be able to
# act as the service's own runtime identity (iam.serviceAccounts.actAs on backend_run, from
# iam.tf) — standard Cloud Run behavior, the same requirement `gcloud run deploy`/Terraform
# itself needs to run as backend_run's runtime identity, enforced on every services.patch call
# regardless of whether that particular call's updateMask even touches the service account
# field. Confirmed via `gcloud policy-troubleshoot iam` (access: NOT_GRANTED) after the first
# two grants alone still left every scheduled PATCH 403ing.
resource "google_service_account_iam_member" "scheduler_can_act_as_backend_run" {
  count = var.enable_backend_night_schedule ? 1 : 0

  service_account_id = google_service_account.backend_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.backend_scheduler[0].email}"
}

locals {
  backend_admin_api_url = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/${var.region}/services/${google_cloud_run_v2_service.backend.name}?updateMask=template.scaling.minInstanceCount"
}

resource "google_cloud_scheduler_job" "backend_scale_down_nightly" {
  count = var.enable_backend_night_schedule ? 1 : 0

  name      = "openopportunity-backend-scale-down-nightly"
  schedule  = "0 23 * * *"
  time_zone = "Asia/Kolkata"

  http_target {
    http_method = "PATCH"
    uri         = local.backend_admin_api_url
    headers     = { "Content-Type" = "application/json" }
    body        = base64encode(jsonencode({ template = { scaling = { minInstanceCount = 0 } } }))

    oauth_token {
      service_account_email = google_service_account.backend_scheduler[0].email
    }
  }

  depends_on = [google_project_service.required]
}

# Restores backend_min_instances (not a hardcoded 1) — if that's ever raised above 1, the
# morning job should put it back to whatever it actually is, not silently cap it at 1.
resource "google_cloud_scheduler_job" "backend_scale_up_morning" {
  count = var.enable_backend_night_schedule ? 1 : 0

  name      = "openopportunity-backend-scale-up-morning"
  schedule  = "0 7 * * *"
  time_zone = "Asia/Kolkata"

  http_target {
    http_method = "PATCH"
    uri         = local.backend_admin_api_url
    headers     = { "Content-Type" = "application/json" }
    body        = base64encode(jsonencode({ template = { scaling = { minInstanceCount = var.backend_min_instances } } }))

    oauth_token {
      service_account_email = google_service_account.backend_scheduler[0].email
    }
  }

  depends_on = [google_project_service.required]
}
