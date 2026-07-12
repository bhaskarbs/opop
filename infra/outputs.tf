output "enabled_apis" {
  description = "APIs Terraform has enabled on the project — a quick sanity check that apply worked."
  value       = [for api in google_project_service.required : api.service]
}

output "backend_url" {
  description = "Public HTTPS URL of the deployed backend."
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Public HTTP URL of the deployed frontend (bare IP — no custom domain yet)."
  value       = local.frontend_origin
}

output "frontend_bucket" {
  description = "Cloud Storage bucket name to sync the frontend build into."
  value       = google_storage_bucket.frontend.name
}

output "sql_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance), useful for cloud-sql-proxy/psql access."
  value       = google_sql_database_instance.main.connection_name
}

output "admin_seed_password" {
  description = "Generated password for the bootstrap admin account (see APP_ADMIN_SEED_EMAIL). Retrieve with: terraform output -raw admin_seed_password"
  value       = random_password.admin_seed_password.result
  sensitive   = true
}
