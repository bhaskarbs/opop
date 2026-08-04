# Backs com.openopportunity.storage.GcsFileStorageService (STORAGE_PROVIDER=gcs, wired in
# run.tf) — resumes, candidate photos/company logos, company certificates, and mock-interview
# recordings. Unlike the frontend bucket (frontend.tf), this one is never public: every file is
# served back through the backend's own authenticated endpoints (resume access gated by
# CandidateSearchService.requireEligibleToContactCandidates, etc.), so a publicly readable bucket
# would bypass all of that access control. Only the backend's own service account can read/write
# it (see the IAM binding below).
resource "google_storage_bucket" "uploads" {
  name     = "${var.project_id}-uploads"
  location = var.region

  uniform_bucket_level_access = true

  # Deliberately NOT force_destroy = true (unlike the frontend bucket, which only ever holds a
  # rebuildable static build) — this bucket holds irreplaceable user data (resumes, mock
  # interview recordings), so `terraform destroy` should refuse rather than silently delete it
  # while it still has objects in it. Same reasoning as sql_deletion_protection.
  force_destroy = false

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "backend_uploads_access" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.backend_run.email}"
}
