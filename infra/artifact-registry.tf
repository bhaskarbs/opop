# Already exists (created manually during the original one-time backend image push — see
# infra/README.md) — this resource just formalizes it declaratively so `.github/workflows/
# deploy.yml`'s `terraform apply` doesn't drift from what's actually there. Needs a one-time
# `terraform import` before the first apply after adding this resource, or Terraform will try
# (and fail) to create a repository that already exists:
#
#   terraform import google_artifact_registry_repository.backend \
#     projects/<project_id>/locations/<region>/repositories/openopportunity
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "openopportunity"
  format        = "DOCKER"
  description   = "Backend container images (see backend/Dockerfile)."

  depends_on = [google_project_service.required]
}
