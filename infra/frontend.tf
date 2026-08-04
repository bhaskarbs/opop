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

  # No custom domain yet (see the file header comment), so "*" is the only host there is to
  # match — this isn't narrowing anything down, just the required shape for attaching a
  # path_matcher at all.
  host_rule {
    hosts        = ["*"]
    path_matcher = "job-pages"
  }

  # Everything other than the paths below still falls through to the SPA bucket (including
  # /en/jobs and /hi/jobs themselves — the search page, not a single job — and every other
  # client-routed path), same as before this path_matcher existed.
  path_matcher {
    name            = "job-pages"
    default_service = google_compute_backend_bucket.frontend.self_link

    # See com.openopportunity.seo.JobSeoController — /{lang}/jobs/{jobId} is the one route the
    # backend server-renders instead of the SPA shell — plus /sitemap.xml and /robots.txt
    # (SitemapController/RobotsController), which need to be reachable at this same public
    # domain for a crawler to ever find them. "en"/"hi" are hardcoded to match
    # SUPPORTED_LANGUAGES in frontend/src/i18n/index.ts; add a path here if that list grows.
    path_rule {
      paths   = ["/en/jobs/*", "/hi/jobs/*", "/sitemap.xml", "/robots.txt"]
      service = google_compute_backend_service.job_seo.self_link
    }
  }
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
