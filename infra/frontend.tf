# No custom domain exists yet, so this is HTTP-only on the load balancer's bare
# anycast IP — a managed SSL cert needs a domain to validate against. Adding a domain
# later just means adding a target_https_proxy + managed cert in front of the same
# url_map/backend_bucket below, not redoing this layer.

resource "google_storage_bucket" "frontend" {
  name     = "${var.project_id}-frontend"
  location = var.region

  uniform_bucket_level_access = true
  # This bucket only ever holds a rebuildable static build, unlike the database —
  # let `terraform destroy` remove it even if it still has objects in it.
  force_destroy = true

  website {
    main_page_suffix = "index.html"
    # React Router does client-side routing, so a direct hit on e.g. /jobs/123 has to
    # come back with index.html (not a real 404) for the app to render that route —
    # this is the standard GCS trick for SPA hosting behind a backend bucket.
    not_found_page = "index.html"
  }

  depends_on = [google_project_service.required]
}

resource "google_storage_bucket_iam_member" "frontend_public_read" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "frontend" {
  name        = "openopportunity-frontend"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true
}

resource "google_compute_url_map" "frontend" {
  name            = "openopportunity-frontend"
  default_service = google_compute_backend_bucket.frontend.self_link
}

resource "google_compute_target_http_proxy" "frontend" {
  name    = "openopportunity-frontend"
  url_map = google_compute_url_map.frontend.self_link
}

resource "google_compute_global_address" "frontend" {
  name = "openopportunity-frontend-ip"
}

resource "google_compute_global_forwarding_rule" "frontend" {
  name                  = "openopportunity-frontend"
  target                = google_compute_target_http_proxy.frontend.self_link
  port_range            = "80"
  ip_address            = google_compute_global_address.frontend.address
  load_balancing_scheme = "EXTERNAL"
}

locals {
  # Computed straight from the reserved IP rather than taken as a variable — no
  # manual step needed after the first apply, unlike backend_image.
  frontend_origin = "http://${google_compute_global_address.frontend.address}"
}
