# Dedicated runtime identity for the backend, scoped to only what it needs — not the
# Cloud Run default compute service account, which is project-editor-broad.
resource "google_service_account" "backend_run" {
  account_id   = "openopportunity-backend"
  display_name = "OpenOpportunity backend (Cloud Run)"
}

resource "google_project_iam_member" "backend_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend_run.email}"
}

resource "google_secret_manager_secret_iam_member" "backend_secret_access" {
  for_each  = google_secret_manager_secret.app
  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}
