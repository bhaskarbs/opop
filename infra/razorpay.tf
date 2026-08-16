# Live Razorpay checkout (see run.tf's RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET/RAZORPAY_WEBHOOK_SECRET
# env vars). The secret *containers* and IAM bindings below are unconditional — harmless to
# create ahead of time. The secret *versions* are NOT: Secret Manager's API flatly rejects an
# empty payload ("Error 400: Field [payload] is required"), so unlike mail.tf's resend_api_key
# (always applied with a real value already in hand), these can't just be created blank and
# filled in later — confirmed by hitting that exact error while bootstrapping this file. count
# gates each version (and its corresponding secret_key_ref env var in run.tf) on a real value
# actually being set, same idiom as enable_redis/enable_elasticsearch's dynamic "env" blocks
# elsewhere in run.tf, here because the API requires it rather than for cost/toggle reasons.
# key-id itself isn't genuinely secret (it's the publishable key handed to the frontend), so it's
# a plain env var in run.tf instead of a third Secret Manager secret — no such constraint there.
resource "google_secret_manager_secret" "razorpay_key_secret" {
  secret_id = "openopportunity-razorpay-key-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "razorpay_key_secret" {
  count = var.razorpay_key_secret != "" ? 1 : 0

  secret      = google_secret_manager_secret.razorpay_key_secret.id
  secret_data = var.razorpay_key_secret

  # Once a real value exists, protect it from CI's terraform apply (which never has
  # TF_VAR_razorpay_key_secret set) resetting it back to blank — see mail.tf's resend_api_key
  # comment for the full incident writeup this is guarding against. Doesn't help until count=1
  # for the first time (a real value must be supplied once, locally), but prevents every apply
  # after that from undoing it.
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "backend_razorpay_key_secret_access" {
  secret_id = google_secret_manager_secret.razorpay_key_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}

resource "google_secret_manager_secret" "razorpay_webhook_secret" {
  secret_id = "openopportunity-razorpay-webhook-secret"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "razorpay_webhook_secret" {
  count = var.razorpay_webhook_secret != "" ? 1 : 0

  secret      = google_secret_manager_secret.razorpay_webhook_secret.id
  secret_data = var.razorpay_webhook_secret

  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret_iam_member" "backend_razorpay_webhook_secret_access" {
  secret_id = google_secret_manager_secret.razorpay_webhook_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}
