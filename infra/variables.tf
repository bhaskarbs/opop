variable "project_id" {
  description = "GCP project id to deploy into (created in the one-time setup in docs/DEVELOPMENT_ROADMAP.md)."
  type        = string
}

variable "region" {
  description = "Primary GCP region for all resources."
  type        = string
  default     = "us-central1"
}

variable "backend_image" {
  description = <<-EOT
    Full Artifact Registry image reference for the backend, e.g.
    us-central1-docker.pkg.dev/<project_id>/openopportunity/backend:<tag>.
    Must already be pushed before the first `terraform apply` — see infra/README.md
    for the one-time manual build+push. .github/workflows/deploy.yml overrides this
    on every push to main with the image it just built (tagged with the commit SHA),
    so the value here only matters for a manual apply.
  EOT
  type        = string
}

# See cicd.tf — which GitHub repo is trusted to authenticate as the CI/CD service account via
# Workload Identity Federation. "owner/repo" format. Deliberately narrow (one specific repo, not
# just "anyone in this GitHub org") — see cicd.tf's attribute_condition.
variable "github_repository" {
  description = "GitHub repository allowed to deploy via Workload Identity Federation, as \"owner/repo\"."
  type        = string
  default     = "bhaskarbs/opop"
}

variable "admin_seed_email" {
  description = "Email for the one bootstrap admin account seeded on backend startup."
  type        = string
  default     = "admin@openopportunity.com"
}

variable "sql_deletion_protection" {
  description = "Set false only when you actually intend to let `terraform destroy` drop the database."
  type        = bool
  default     = true
}

# Backend (Cloud Run + Cloud SQL + IAM/secrets) is identical either way — this only switches how
# the frontend build gets served. "firebase" (the default: cheapest, see infra/README.md's cost
# comparison) creates a Firebase Hosting site instead of any of the load-balancer resources below
# — deploy its content with `firebase deploy`, not `gsutil rsync`. "load-balancer" creates the
# original Cloud Storage + Cloud CDN + global HTTP(S) load balancer setup (frontend.tf/job-seo.tf)
# instead — worth switching to once you need Cloud Armor, a move to GKE, or routing rules Firebase
# Hosting's rewrites can't express (see infra/README.md's "moving to the load balancer" section).
# `scripts/deploy-firebase.sh` / `scripts/deploy-loadbalancer.sh` each pass the matching value of
# this variable automatically, so switching modes is one command, not a remembered flag.
variable "frontend_mode" {
  description = "How the frontend build is served: \"firebase\" (Firebase Hosting, cheapest) or \"load-balancer\" (Cloud Storage + Cloud CDN + global HTTP(S) load balancer)."
  type        = string
  default     = "firebase"

  validation {
    condition     = contains(["firebase", "load-balancer"], var.frontend_mode)
    error_message = "frontend_mode must be \"firebase\" or \"load-balancer\"."
  }
}

# Only used in frontend_mode=load-balancer (see frontend.tf) — blank (the default) keeps today's
# bare-IP, HTTP-only behavior exactly as before this variable existed, so adding it doesn't force
# a domain on anyone still on the plain-IP setup. Setting this to a real domain provisions a
# Google-managed SSL cert for it and switches HTTP to redirect to HTTPS instead of serving
# content directly (see google_compute_managed_ssl_certificate.frontend and
# google_compute_url_map.frontend_redirect) — you still have to point the domain's DNS at the
# reserved IP yourself first (see infra/README.md); Terraform can't do that part for you unless
# the domain's DNS zone is also managed in Cloud DNS, which this project doesn't assume.
variable "load_balancer_domain" {
  description = "Custom domain to serve frontend_mode=load-balancer over HTTPS on, e.g. \"openopportunity.com\". Blank (default) keeps the bare-IP HTTP-only setup."
  type        = string
  default     = ""
}

# Only used in frontend_mode=firebase (see frontend.tf's cors_allowed_origins). Unlike
# load_balancer_domain, this doesn't provision anything — Firebase Hosting's custom domains are
# added and cert-managed entirely in the Firebase console (see infra/README.md), outside
# anything Terraform touches. This variable exists purely so the backend's CORS allowlist knows
# about a custom domain you've added there, since Terraform has no other way to find out about
# it. Firebase always serves both its default domains regardless of this setting — see
# cors_allowed_origins for why both are included unconditionally.
variable "firebase_custom_domain" {
  description = "Custom domain added to Firebase Hosting via the Firebase console, e.g. \"openopportunity.com\" — only affects the backend's CORS allowlist. Blank (default) if you haven't added one."
  type        = string
  default     = ""
}

# Scale-up toggles — see redis.tf/elasticsearch.tf. Both default to false: the backend already
# runs correctly without either (app.cache.provider=caffeine, app.search.provider=postgres are
# its own local-first defaults — see application.properties), so a plain `terraform apply` never
# provisions either of these real, non-trivial recurring costs by accident.
variable "enable_redis" {
  description = "Provision Memorystore for Redis (BASIC tier, 1GB) and switch the backend to app.cache.provider=redis. ~$36/month when true, reached via Cloud Run's Direct VPC Egress (no VPC connector, no extra fixed cost for that part)."
  type        = bool
  default     = false
}

variable "enable_elasticsearch" {
  description = "Provision an Elastic Cloud deployment and switch the backend to app.search.provider=elasticsearch. Requires elastic_cloud_api_key. ~$16-40/month when true, depending on elastic_deployment_template_id/size — a separate bill from GCP (see infra/README.md)."
  type        = bool
  default     = false
}

variable "elastic_cloud_api_key" {
  description = "Elastic Cloud API key (https://cloud.elastic.co -> your deployment -> Manage -> API Keys). Only required when enable_elasticsearch=true; leave blank otherwise. Set via TF_VAR_elastic_cloud_api_key or terraform.tfvars (gitignored) — never commit this."
  type        = string
  default     = ""
  sensitive   = true
}

variable "elastic_deployment_template_id" {
  description = <<-EOT
    Elastic Cloud hardware profile for GCP (only used when enable_elasticsearch=true).
    "gcp-general-purpose" is the standard low-cost starting point, but exact available
    template ids vary by account/region — verify in the Elastic Cloud console (Create
    deployment -> Google Cloud -> your region) before the first apply and adjust if
    the plan fails with an "unknown template" error.
  EOT
  type        = string
  default     = "gcp-general-purpose"
}

# Cloud SQL sizes max_connections off available memory, not something you set directly —
# confirmed empirically (SHOW max_connections;), not assumed: db-f1-micro caps at 25,
# db-g1-small at 50; Google doesn't publish an exact formula for dedicated-core db-custom-*
# tiers beyond "it scales with memory", so check the real value after upgrading rather than
# trust a number here. This is normally the actual ceiling on concurrent load long before raw
# CPU/throughput is (see infra/README.md's performance notes) — HikariCP's default pool
# (10 connections/instance) times backend_max_instances can eat most of db-f1-micro's 25 on its
# own, before anything else (a read replica, a human psql session, admin tooling) needs one.
variable "sql_tier" {
  description = "Cloud SQL machine type for both the primary (sql.tf) and, if enabled, the read replica (sql-replica.tf) — they always match, since a replica weaker than its primary just becomes its own bottleneck. \"db-f1-micro\" (default, shared-core, 25 max_connections) is the cheapest tier and this project's local-first starting point. \"db-g1-small\" (shared-core, 50 max_connections) is the next step up at modest extra cost. Beyond that, dedicated-core \"db-custom-<vCPUs>-<MB>\" tiers (e.g. \"db-custom-2-7680\") scale further but cost meaningfully more — verify pricing for your region before applying."
  type        = string
  default     = "db-f1-micro"
}

# See sql-replica.tf — the same read/write split already built and tested locally (see
# app.datasource.read-replica.* in application.properties, ReadReplicaDataSourceConfig,
# ReadOnlyRoutingAspect), now against a real Cloud SQL read replica instead of a local Docker
# standby. Off by default: db-f1-micro (var.sql_tier's default) has no free tier, so this is a
# real ~$9-11/month cost the moment it's enabled, on top of the primary — same tier/cost as
# sql.tf's primary instance, whatever var.sql_tier currently is (read replicas share the
# primary's users/passwords via replication, so no new Secret Manager entry is needed either).
variable "enable_sql_read_replica" {
  description = "Provision a Cloud SQL read replica (same tier as the primary, see sql_tier) and switch the backend to routing @Transactional(readOnly = true) reads to it. ~$9-11/month at the default sql_tier when true."
  type        = bool
  default     = false
}

# See run.tf's scaling block — the ceiling on how many backend instances Cloud Run can scale out
# to under load (min_instance_count stays hardcoded at 0/scale-to-zero, a separate, bigger cost
# decision — see run.tf's own comment — not something scale-up/down-backend.sh touch). Default
# (2) matches what this value was hardcoded to before this variable existed, so introducing it
# changes nothing until you actually run one of those scripts. Cloud Run only ever runs as many
# instances as real traffic needs, up to this ceiling — raising it doesn't cost anything by
# itself; it just raises how far Cloud Run's own pay-per-use billing is allowed to scale out.
variable "backend_max_instances" {
  description = "Ceiling on concurrent Cloud Run backend instances (max_instance_count). Traffic-driven within [0, this] — raising it costs nothing on its own, only actual usage does."
  type        = number
  default     = 2

  validation {
    condition     = var.backend_max_instances >= 1
    error_message = "backend_max_instances must be at least 1 — 0 would make the backend completely unreachable."
  }
}

# See monitoring.tf — blank (default) creates no alerting at all, so a plain `terraform apply`
# never starts emailing anyone. Deliberately notification-only, not automation: enabling/disabling
# Redis/Elasticsearch/the SQL read replica has real cost and (for Elasticsearch/the replica) data
# consequences, so a human deciding whether to actually run the relevant scripts/*.sh after
# reading an alert is the intended workflow — see infra/README.md's "Load monitoring" section for
# why this doesn't auto-run anything itself.
variable "alert_notification_email" {
  description = "Email address to notify when backend/database load crosses a threshold (see monitoring.tf). Blank (default) skips creating any alerting."
  type        = string
  default     = ""
}
