provider "google" {
  project = var.project_id
  region  = var.region
}

# See versions.tf — only firebase.tf's resources use this.
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# See versions.tf — only elasticsearch.tf's ec_deployment resource uses this. Blank api_key is
# fine when enable_elasticsearch=false — a provider block never authenticates just from being
# declared, only when a resource from it is actually planned/applied (and that resource is
# itself gated by enable_elasticsearch, see elasticsearch.tf).
provider "ec" {
  apikey = var.elastic_cloud_api_key
}
