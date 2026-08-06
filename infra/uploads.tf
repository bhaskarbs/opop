# Private bucket for user-uploaded files (resumes, candidate photos, company logos — see
# com.openopportunity.storage.GcsFileStorageService). Always created, unlike the frontend bucket
# in frontend.tf — this isn't a toggle, it's what makes uploads durable at all: without it the
# backend falls back to app.storage.provider=local (Cloud Run's own ephemeral, per-instance
# container disk), which loses every upload on redeploy/restart and is inconsistent across
# instances whenever backend_max_instances > 1. No website/CDN config here on purpose — unlike
# frontend.tf's bucket, files here are never served directly; every read goes through the
# backend's own authenticated endpoints (CandidatePhotoController, CompanyLogoController, resume
# download), which is also why there's no public-read IAM binding like frontend_public_read.
resource "google_storage_bucket" "uploads" {
  name     = "${var.project_id}-uploads"
  location = var.region

  uniform_bucket_level_access = true

  # Real user documents, not a rebuildable build artifact like the frontend bucket — leave
  # force_destroy at its default (false) so `terraform destroy` refuses to silently delete
  # resumes/photos out from under anyone, same reasoning as sql.tf's deletion_protection.
}

# GcsFileStorageService both reads/writes objects and calls storage.get(bucket) on startup (a
# Buckets.get call, not covered by storage.objectAdmin alone) — storage.admin is scoped to just
# this one bucket, not the project, so the blast radius of the backend's runtime identity having
# it is limited to this bucket alone.
resource "google_storage_bucket_iam_member" "uploads_backend_access" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.backend_run.email}"
}
