resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "admin_seed_password" {
  length           = 20
  override_special = "!#%^*-_="
}

# Generated rather than user-supplied so a weak/reused password never becomes the
# bootstrap admin credential — retrieve it after apply with the admin_seed_password
# output (see outputs.tf) or change it later via APP_ADMIN_SEED_PASSWORD.
locals {
  secrets = {
    db-password         = random_password.db.result
    jwt-secret          = random_password.jwt_secret.result
    admin-seed-password = random_password.admin_seed_password.result
  }
}

resource "google_secret_manager_secret" "app" {
  for_each  = local.secrets
  secret_id = "openopportunity-${each.key}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

resource "google_secret_manager_secret_version" "app" {
  for_each    = local.secrets
  secret      = google_secret_manager_secret.app[each.key].id
  secret_data = each.value
}
