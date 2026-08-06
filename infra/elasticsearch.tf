# Only created when enable_elasticsearch=true (see variables.tf) — a real Elastic Cloud
# deployment (not a GCP resource; a separate vendor/bill — see the `ec` provider in
# providers.tf), matching what docs/OpenOpportunity_Architecture.docx names for this phase.
# Elasticsearch only, no Kibana — this app doesn't use it, and every extra component in an
# Elastic Cloud deployment adds to the bill. ~$16-40/month depending on
# elastic_deployment_template_id/size — verify the exact template id is valid for your account
# before the first apply (see that variable's description).

data "ec_stack" "latest" {
  count = var.enable_elasticsearch ? 1 : 0

  version_regex = "latest"
  region        = "gcp-${var.region}"
}

resource "ec_deployment" "search" {
  count = var.enable_elasticsearch ? 1 : 0

  name                   = "openopportunity"
  region                 = "gcp-${var.region}"
  version                = data.ec_stack.latest[0].version
  deployment_template_id = var.elastic_deployment_template_id

  elasticsearch = {
    hot = {
      autoscaling = {}
    }
  }
}

# elasticsearch_password (and _username) are only ever returned by the provider at creation
# time — pushed into Secret Manager immediately so the real credential lives somewhere access-
# controlled and auditable, not just in Terraform state (see ec_deployment's own docs: state
# holds it in plaintext, same category of risk as any other secret this project keeps out of
# state where it can — e.g. random_password.db in secrets.tf).
resource "google_secret_manager_secret" "elasticsearch_password" {
  count = var.enable_elasticsearch ? 1 : 0

  secret_id = "openopportunity-elasticsearch-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "elasticsearch_password" {
  count = var.enable_elasticsearch ? 1 : 0

  secret      = google_secret_manager_secret.elasticsearch_password[0].id
  secret_data = ec_deployment.search[0].elasticsearch_password
}

resource "google_secret_manager_secret_iam_member" "backend_elasticsearch_password_access" {
  count = var.enable_elasticsearch ? 1 : 0

  secret_id = google_secret_manager_secret.elasticsearch_password[0].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_run.email}"
}
