# Routes the two job-page paths (see google_compute_url_map.frontend's path_matcher in
# frontend.tf) to the backend's server-rendered JobSeoController instead of the SPA bucket, so
# the public URL search engines actually crawl (the frontend's own domain, not the backend's
# *.run.app one) returns real HTML with JobPosting structured data — see
# com.openopportunity.seo.JobSeoService for what gets rendered.
resource "google_compute_region_network_endpoint_group" "backend_serverless" {
  name                  = "openopportunity-backend-serverless"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }

  depends_on = [google_project_service.required]
}

resource "google_compute_backend_service" "job_seo" {
  name                  = "openopportunity-job-seo"
  load_balancing_scheme = "EXTERNAL"

  # Deliberately no CDN — a job's status (approved/closed) can change at any time, and a stale
  # cached page continuing to show a closed listing (or a 404 outliving a job's approval) is
  # worse than the extra origin hits. See JobSeoService's javadoc for the same "always reads
  # current DB state, no regeneration step" reasoning.
  enable_cdn = false

  backend {
    group = google_compute_region_network_endpoint_group.backend_serverless.id
  }

  depends_on = [google_project_service.required]
}
