output "enabled_apis" {
  description = "APIs Terraform has enabled on the project — a quick sanity check that apply worked."
  value       = [for api in google_project_service.required : api.service]
}
