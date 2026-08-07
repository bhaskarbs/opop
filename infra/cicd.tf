# Workload Identity Federation for GitHub Actions (.github/workflows/deploy.yml) — no long-lived
# service account key ever gets generated, downloaded, or stored as a GitHub secret. Instead,
# GitHub's own OIDC token (which it mints fresh for every workflow run) is exchanged for a
# short-lived GCP access token, only for the specific repo named in var.github_repository. This
# is a one-time-ish resource: it exists so CI can authenticate at all, so it has to be created by
# a human's `terraform apply` (this one, using your own gcloud credentials) before CI can ever
# run its own — same bootstrapping order as the rest of this project's "one-time GCP setup, run
# in your own terminal first" resources.
#
# Uses google-beta like firebase.tf — Workload Identity Federation resources are beta-only in
# the Terraform provider.

resource "google_iam_workload_identity_pool" "github" {
  provider = google-beta

  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Trusts GitHub's OIDC tokens for CI/CD (see .github/workflows/deploy.yml)."

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  provider = google-beta

  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }

  # Narrow on purpose: only a workflow run in this exact repo can authenticate as
  # google_service_account.cicd below — not just anyone in the same GitHub org/user.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "cicd" {
  account_id   = "openopportunity-cicd"
  display_name = "OpenOpportunity CI/CD (GitHub Actions)"
}

# Lets a workflow run in var.github_repository impersonate the service account above — this,
# not narrow IAM scoping on the roles below, is the actual security boundary. The roles
# themselves are intentionally broad (near project-editor) because `terraform apply` here
# manages this many different service types (Cloud Run, Cloud SQL, Storage, Secret Manager,
# Compute load-balancer resources, IAM bindings, Memorystore, Monitoring, Firebase, Artifact
# Registry) — scoping each one down to its minimum viable permission set would mean tracking a
# much longer, more fragile list for marginal benefit over "only this one repo, only on push to
# main, with a short-lived token" already provides.
resource "google_service_account_iam_binding" "cicd_workload_identity" {
  service_account_id = google_service_account.cicd.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}",
  ]
}

locals {
  cicd_roles = [
    "roles/run.admin",
    "roles/artifactregistry.admin",
    "roles/cloudsql.admin",
    "roles/storage.admin",
    "roles/secretmanager.admin",
    "roles/compute.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountUser",
    # This CI service account's own apply has to be able to read/reconcile the very WIF pool and
    # provider it authenticates through (both defined in this same file) — without this, the
    # first real CI-run apply fails outright: "Permission 'iam.workloadIdentityPools.get' denied
    # ... (or it may not exist)" trying to refresh google_iam_workload_identity_pool.github.
    # Confirmed against a real failed run, not assumed — roles/iam.serviceAccountAdmin above
    # covers the service account itself but not the separate WIF pool/provider resources.
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/redis.admin",
    "roles/monitoring.admin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/firebase.admin",
  ]
}

resource "google_project_iam_member" "cicd" {
  for_each = toset(local.cicd_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cicd.email}"
}
