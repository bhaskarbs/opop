# Every API a later step (Cloud Run, Cloud SQL, Artifact Registry, Storage, Secret
# Manager) needs, enabled declaratively so `terraform apply` is the one place that
# turns services on/off — no separate `gcloud services enable` bookkeeping to track.
# Add to this list as later steps need more; nothing here provisions billable compute
# or storage on its own.
locals {
  required_apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "compute.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  # Don't turn services off on `terraform destroy` — disabling an API can silently
  # break unrelated things in the project; API enablement is cheap to leave alone.
  disable_on_destroy = false
}
