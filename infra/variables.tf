variable "project_id" {
  description = "GCP project id to deploy into (created in the one-time setup in docs/DEVELOPMENT_ROADMAP.md)."
  type        = string
}

variable "region" {
  description = "Primary GCP region for all resources."
  type        = string
  default     = "us-central1"
}
