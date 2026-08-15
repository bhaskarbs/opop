# Outbound mail via Resend's SMTP relay (see run.tf's MAIL_HOST/MAIL_USERNAME/MAIL_PASSWORD env
# vars) — unconditional, not gated behind a toggle var; see variables.tf's resend_api_key comment
# for why. Mirrors elasticsearch.tf's secret/IAM-binding pattern for a user-supplied (not
# Terraform-generated) credential.
resource "google_secret_manager_secret" "resend_api_key" {
  secret_id = "openopportunity-resend-api-key"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "resend_api_key" {
  secret      = google_secret_manager_secret.resend_api_key.id
  secret_data = var.resend_api_key
}

resource "google_secret_manager_secret_iam_member" "backend_resend_api_key_access" {
  secret_id = google_secret_manager_secret.resend_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}
