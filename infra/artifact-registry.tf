# If you already pushed a backend image manually before this resource existed (some earlier
# version of this file assumed that was always true here — confirmed via `gcloud artifacts
# repositories describe` that it wasn't, for this project), Terraform will try and fail to create
# a duplicate; import the existing one first instead:
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
