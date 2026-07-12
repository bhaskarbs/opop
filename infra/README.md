# Infra (Terraform, GCP)

Minimal cloud footprint for OpenOpportunity: Cloud Run (backend) + Cloud SQL for Postgres + Cloud
Storage/CDN (frontend), built up one small step at a time — see "Phase 2 — Cloud infra" in
`../docs/DEVELOPMENT_ROADMAP.md` for the full step list. This step (19) only wires up the Terraform
plumbing and declares the APIs later steps need; it provisions no billable compute or data resources.

## Prerequisites

- A GCP project with billing linked, and the Terraform state bucket created — see the "One-time GCP
  setup" block at the top of the Phase 2 section in `../docs/DEVELOPMENT_ROADMAP.md`. Run that in your
  own terminal first if you haven't already (it needs an interactive `gcloud auth login` and a billing
  account decision, so it can't run from inside a Claude session).
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.7.
- [gcloud CLI](https://cloud.google.com/sdk/docs/install), already authenticated
  (`gcloud auth application-default login`) — the Google provider uses your user credentials locally.

## First run

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set project_id to the project you created in the one-time setup

terraform init -backend-config="bucket=openopportunity-tfstate"
terraform plan
terraform apply
```

`terraform apply` should report the `google_project_service.required` resources being created (one per
API) and no other changes. The `enabled_apis` output lists what got turned on — check it against
`gcloud services list --enabled` if you want a second source of truth.

## Frontend deploy (Step 21)

`terraform apply` provisions the bucket/CDN/load balancer but doesn't build or upload the frontend
itself — Step 22 automates that via CI, but until then it's a manual build+sync, same reasoning as the
manual backend image push in Step 20:

```bash
cd infra
terraform output backend_url    # use this as VITE_API_BASE_URL below
terraform output frontend_bucket

cd ../frontend
VITE_API_BASE_URL=<backend_url from above> npm run build --workspace=frontend
gsutil -m rsync -r -d dist gs://<frontend_bucket from above>
```

`-d` deletes stale objects in the bucket that are no longer in `dist/` (safe here — the bucket only ever
holds this build output). Then open `terraform output frontend_url` in a browser — it's a bare IP over
plain HTTP for now (no custom domain yet, so no managed SSL cert to attach to the load balancer).

## Day-to-day

```bash
terraform fmt -recursive   # format .tf files
terraform validate         # check syntax/types without touching GCP
terraform plan             # preview changes before applying
```

`terraform.tfvars` is gitignored (it holds your real project id) — `terraform.tfvars.example` is the
committed template. The state bucket name is passed via `-backend-config` rather than a variable because
Terraform backend blocks can't reference variables.
