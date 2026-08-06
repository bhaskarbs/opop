terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    # Only for firebase.tf's resources (google_firebase_project/google_firebase_hosting_site) —
    # Firebase's Terraform support is beta-only regardless of frontend_mode, so this is declared
    # unconditionally even though it's unused in load-balancer mode.
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    # Only for elasticsearch.tf's ec_deployment resource (enable_elasticsearch=true) — a
    # third-party (Elastic, not Google) provider, since Elastic Cloud isn't a GCP service itself.
    ec = {
      source  = "elastic/ec"
      version = "~> 0.11"
    }
  }

  # Bucket name is supplied at `terraform init` time via -backend-config, since a
  # backend block can't reference a variable. See README.md for the exact command.
  backend "gcs" {}
}
