output "enabled_apis" {
  description = "APIs Terraform has enabled on the project — a quick sanity check that apply worked."
  value       = [for api in google_project_service.required : api.service]
}

output "backend_url" {
  description = "Public HTTPS URL of the deployed backend."
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Public URL of the deployed frontend — an HTTPS *.web.app URL in frontend_mode=firebase, https://<load_balancer_domain> once that's set and its managed cert is ACTIVE, or a bare HTTP IP in the meantime in frontend_mode=load-balancer."
  value       = local.frontend_origin
}

output "frontend_bucket" {
  description = "Cloud Storage bucket name to sync the frontend build into — only set in frontend_mode=load-balancer; use `firebase deploy` instead in frontend_mode=firebase (see scripts/deploy-firebase.sh)."
  value       = try(google_storage_bucket.frontend[0].name, null)
}

output "load_balancer_dns_instructions" {
  description = "What DNS record to create at your domain registrar/DNS provider so load_balancer_domain actually reaches this load balancer — only set once frontend_mode=load-balancer and load_balancer_domain are both set. Google can't issue the managed SSL cert until this record exists and has propagated; check status with: gcloud compute ssl-certificates describe openopportunity-frontend --global --format='value(managed.status)' (expect PROVISIONING, then ACTIVE)."
  value = local.has_custom_domain ? (
    "Create an A record: ${var.load_balancer_domain} -> ${try(google_compute_global_address.frontend[0].address, "<run terraform apply first>")}"
  ) : null
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

# Neither of these two is sensitive (they're identifiers, not credentials — the actual security
# boundary is cicd.tf's attribute_condition, not secrecy of these strings) — set them as GitHub
# Actions repository *variables* (not secrets), see infra/README.md's CI/CD section:
#   gh variable set WIF_PROVIDER --body "$(terraform output -raw cicd_workload_identity_provider)"
#   gh variable set DEPLOY_SA_EMAIL --body "$(terraform output -raw cicd_service_account_email)"
output "cicd_workload_identity_provider" {
  description = "Full resource name for google-github-actions/auth's workload_identity_provider input."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "cicd_service_account_email" {
  description = "Email for google-github-actions/auth's service_account input."
  value       = google_service_account.cicd.email
}

output "monitoring_dashboard_url" {
  description = "Console link to the always-on request/latency/CPU/memory dashboard (see dashboard.tf)."
  value       = "https://console.cloud.google.com/monitoring/dashboards/builder/${element(split("/", google_monitoring_dashboard.main.id), length(split("/", google_monitoring_dashboard.main.id)) - 1)}?project=${var.project_id}"
}
