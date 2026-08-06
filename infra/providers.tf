provider "google" {
  project = var.project_id
  region  = var.region
}

# See versions.tf — only firebase.tf's resources use this.
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# See versions.tf — only elasticsearch.tf's ec_deployment/ec_stack use this, both count-gated on
# enable_elasticsearch. Unlike google/google-beta above, the ec provider builds its API client
# (and rejects a blank apikey) at provider-configure time — before Terraform gets to deciding
# which resources have count=0 — confirmed empirically (an earlier version of this comment
# assumed otherwise; a real `terraform plan` with enable_elasticsearch=false and a blank
# elastic_cloud_api_key failed here). "unused" is never sent as a real credential anywhere: with
# enable_elasticsearch=false, no ec_stack/ec_deployment is planned, so the provider's client is
# constructed but never actually makes a call to Elastic's API.
provider "ec" {
  apikey = var.elastic_cloud_api_key != "" ? var.elastic_cloud_api_key : "unused"
}
