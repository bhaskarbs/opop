terraform {
  required_version = ">= 1.7.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  # Bucket name is supplied at `terraform init` time via -backend-config, since a
  # backend block can't reference a variable. See README.md for the exact command.
  backend "gcs" {}
}
