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
    for the one-time manual build+push (Step 22 automates this via CI).
  EOT
  type        = string
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
