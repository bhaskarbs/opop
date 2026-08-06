# Only created when frontend_mode=load-balancer (see variables.tf) — the default,
# frontend_mode=firebase, uses firebase.tf + ../firebase.json instead, at a fraction of the
# cost (see infra/README.md's comparison). HTTP-only on the load balancer's bare anycast IP
# unless load_balancer_domain is set (see below), in which case HTTP redirects to HTTPS on a
# Google-managed cert for that domain instead.

resource "google_storage_bucket" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

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
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  bucket = google_storage_bucket.frontend[0].name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_compute_backend_bucket" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  name        = "openopportunity-frontend"
  bucket_name = google_storage_bucket.frontend[0].name
  enable_cdn  = true
}

resource "google_compute_url_map" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  name            = "openopportunity-frontend"
  default_service = google_compute_backend_bucket.frontend[0].self_link

  # "*" matches any Host header, custom domain or bare IP alike — this isn't narrowing anything
  # down, just the required shape for attaching a path_matcher at all. Serves content the same
  # way whether reached via HTTP (no domain set) or HTTPS (domain set, see
  # google_compute_target_https_proxy.frontend below) — this map doesn't care which.
  host_rule {
    hosts        = ["*"]
    path_matcher = "job-pages"
  }

  # Everything other than the paths below still falls through to the SPA bucket (including
  # /en/jobs and /hi/jobs themselves — the search page, not a single job — and every other
  # client-routed path), same as before this path_matcher existed.
  path_matcher {
    name            = "job-pages"
    default_service = google_compute_backend_bucket.frontend[0].self_link

    # See com.openopportunity.seo.JobSeoController — /{lang}/jobs/{jobId} is the one route the
    # backend server-renders instead of the SPA shell — plus /sitemap.xml and /robots.txt
    # (SitemapController/RobotsController), which need to be reachable at this same public
    # domain for a crawler to ever find them. "en"/"hi" are hardcoded to match
    # SUPPORTED_LANGUAGES in frontend/src/i18n/index.ts; add a path here if that list grows.
    # (In frontend_mode=firebase, the same routing is expressed as ../firebase.json rewrites.)
    path_rule {
      paths   = ["/en/jobs/*", "/hi/jobs/*", "/sitemap.xml", "/robots.txt"]
      service = google_compute_backend_service.job_seo[0].self_link
    }
  }
}

resource "google_compute_target_http_proxy" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  name = "openopportunity-frontend"
  # No domain (default): HTTP serves the real content directly, same as before
  # load_balancer_domain existed — a bare IP has nothing to provision a trusted cert against, so
  # this is the only sensible option there. Domain set: HTTP's only job becomes redirecting to
  # HTTPS (see google_compute_url_map.frontend_redirect and google_compute_target_https_proxy
  # below) — serving real content over plain HTTP once a real domain/cert exists would just be
  # an unnecessary downgrade path. try() (not a bare index) because this ternary's "true" branch
  # still gets evaluated even when local.has_custom_domain is false, when frontend_redirect's
  # count is 0 — confirmed empirically (see the identical reasoning on local.frontend_origin
  # below) rather than assumed.
  url_map = local.has_custom_domain ? try(google_compute_url_map.frontend_redirect[0].self_link, "") : google_compute_url_map.frontend[0].self_link
}

resource "google_compute_global_address" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  name = "openopportunity-frontend-ip"
}

resource "google_compute_global_forwarding_rule" "frontend" {
  count = var.frontend_mode == "load-balancer" ? 1 : 0

  name                  = "openopportunity-frontend"
  target                = google_compute_target_http_proxy.frontend[0].self_link
  port_range            = "80"
  ip_address            = google_compute_global_address.frontend[0].address
  load_balancing_scheme = "EXTERNAL"
}

# Everything below is only created when load_balancer_domain is actually set (see
# local.has_custom_domain) — a strict subset of frontend_mode=load-balancer.

resource "google_compute_managed_ssl_certificate" "frontend" {
  count = local.has_custom_domain ? 1 : 0

  name = "openopportunity-frontend"

  managed {
    domains = ["${var.load_balancer_domain}."]
  }
}

# Pure redirect, no backend service — the actual content-serving url_map (google_compute_url_map.
# frontend above) is unaffected and unaware this exists; it's only ever referenced by the HTTPS
# proxy below and, once a domain is set, by the HTTP proxy above (redirecting instead of serving).
resource "google_compute_url_map" "frontend_redirect" {
  count = local.has_custom_domain ? 1 : 0

  name = "openopportunity-frontend-redirect"

  default_url_redirect {
    https_redirect         = true
    strip_query            = false
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
  }
}

resource "google_compute_target_https_proxy" "frontend" {
  count = local.has_custom_domain ? 1 : 0

  name             = "openopportunity-frontend"
  url_map          = google_compute_url_map.frontend[0].self_link
  ssl_certificates = [google_compute_managed_ssl_certificate.frontend[0].self_link]
}

resource "google_compute_global_forwarding_rule" "frontend_https" {
  count = local.has_custom_domain ? 1 : 0

  name   = "openopportunity-frontend-https"
  target = google_compute_target_https_proxy.frontend[0].self_link
  # Port 443, sharing the SAME reserved IP as the port-80 (redirect) forwarding rule above —
  # standard "one IP, HTTP redirects to HTTPS on it" shape.
  port_range            = "443"
  ip_address            = google_compute_global_address.frontend[0].address
  load_balancing_scheme = "EXTERNAL"
}

locals {
  has_custom_domain = var.frontend_mode == "load-balancer" && var.load_balancer_domain != ""

  # Computed straight from whichever mode/domain is active, rather than taken as a variable — no
  # manual step needed after the first apply, unlike backend_image. try() (not a plain ternary)
  # around the [0] index because a plain ternary still eagerly evaluates
  # google_compute_global_address.frontend[0] even on branches that don't use it, which errors
  # when that resource's count is 0 (firebase mode) — confirmed empirically with an isolated
  # throwaway Terraform config (the null provider, no real cloud credentials involved) before
  # relying on this pattern here.
  frontend_origin = (
    var.frontend_mode == "firebase" ? "https://${var.project_id}.web.app" :
    local.has_custom_domain ? "https://${var.load_balancer_domain}" :
    "http://${try(google_compute_global_address.frontend[0].address, "")}"
  )

  # What run.tf actually sends as APP_CORS_ALLOWED_ORIGINS — distinct from frontend_origin (the
  # single "here's the primary URL" value used for the frontend_url output) because CORS has to
  # allow every origin the frontend might really be served from, not just one. In firebase mode
  # that's always both of Firebase Hosting's default domains at once (Firebase doesn't let you
  # disable .firebaseapp.com even if you never link to it) plus var.firebase_custom_domain if
  # you've added one via the Firebase console. Before this, frontend_origin (just .web.app) was
  # reused directly as the CORS value too — caught as a real gap while adding custom-domain
  # support, not by an actual failure yet, since nothing had linked a custom domain or hit
  # .firebaseapp.com in practice. See a separate, already-hit issue with the same
  # symptom-shape: Google Sign-In's Authorized JavaScript origins is a completely different
  # allowlist (Cloud Console credentials, not this Terraform) that needs the same domains added
  # to it by hand — fixing this doesn't fix that; see infra/README.md. load-balancer mode is
  # unaffected: it only ever serves from the one origin frontend_origin already computes.
  cors_allowed_origins = var.frontend_mode == "firebase" ? join(",", compact([
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
    var.firebase_custom_domain != "" ? "https://${var.firebase_custom_domain}" : "",
  ])) : local.frontend_origin
}
