# Only created when frontend_mode=firebase (the default — see variables.tf and
# infra/README.md's cost comparison). These two resources are the entire Terraform-managed
# "shell": enabling Firebase on the existing GCP project, and creating the Hosting site itself.
# The actual frontend build content, and the rewrites routing /en/jobs/* etc. to the backend's
# Cloud Run service, live in ../firebase.json and are deployed with `firebase deploy` (see
# scripts/deploy-firebase.sh) — Terraform doesn't manage Hosting content the way it manages
# infrastructure, same reasoning as gsutil (not Terraform) syncing the frontend build in
# load-balancer mode.

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
  count    = var.frontend_mode == "firebase" ? 1 : 0

  depends_on = [google_project_service.required]
}

resource "google_firebase_hosting_site" "default" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.project_id
  count    = var.frontend_mode == "firebase" ? 1 : 0

  depends_on = [google_firebase_project.default]
}
