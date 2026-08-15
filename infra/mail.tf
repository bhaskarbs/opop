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

  # CI's terraform apply never has TF_VAR_resend_api_key set (this is a manually-set, one-time
  # local secret — see variables.tf's comment), so var.resend_api_key evaluates to "" on every
  # CI run. Without this, CI sees that as real drift from whatever value was last set locally
  # and "corrects" it back to blank on every single push to main — destroying the real key and
  # taking the backend's outbound mail (and, worse, the whole Cloud Run service, since a
  # destroyed secret version breaks new-instance cold starts even on an otherwise-healthy
  # revision) down with it. Confirmed as the actual cause of a real production outage on
  # 2026-08-15, not a hypothetical: three consecutive CI deploys each destroyed the version the
  # last one (or a local apply) had just fixed. ignore_changes makes this field local-apply-only,
  # matching the documented workflow, and stops CI from ever touching it again.
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "backend_resend_api_key_access" {
  secret_id = google_secret_manager_secret.resend_api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}
