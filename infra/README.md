# Infra (Terraform, GCP)

Minimal cloud footprint for OpenOpportunity: Cloud Run (backend) + Cloud SQL for Postgres + a
private GCS bucket for uploads + one of two interchangeable frontend-serving setups + four
independent scale-up switches (Redis, Elasticsearch, a Cloud SQL read replica, the backend's
instance ceiling) — built up one small step at a time, see "Phase 2 — Cloud infra" in
`../docs/DEVELOPMENT_ROADMAP.md` for the full step list. Cloud Run/Cloud SQL/IAM/secrets are
identical regardless of which toggles are on.

## Uploads (resumes, photos, logos) — always on, not a toggle

`uploads.tf` creates a private GCS bucket (`<project_id>-uploads`) and `run.tf` points the backend
at it (`STORAGE_PROVIDER=gcs`, `STORAGE_GCS_BUCKET`) unconditionally. This isn't optional the way
Redis/Elasticsearch are: without it, `com.openopportunity.storage.GcsFileStorageService` falls
back to local disk inside the Cloud Run container, which is ephemeral (wiped on every
redeploy/restart) and per-instance (a file uploaded to one instance 404s from another whenever
`backend_max_instances > 1`). The bucket has no public-read binding and no website/CDN config —
every upload is served back through the backend's own authenticated endpoints
(`CandidatePhotoController`, `CompanyLogoController`, resume download), never a direct bucket URL,
so it's unaffected by which `frontend_mode` is active. `force_destroy` is left at its default
(`false`) — unlike the frontend build bucket, this holds real user documents, not something
`terraform destroy` should be able to wipe by accident.

## Outbound mail (Resend) — always on, not a toggle

`mail.tf` + `run.tf` point the backend's `com.openopportunity.mail.EmailService` (password resets,
job-match/job-alert notifications, community interest requests — every outgoing email in the app)
at [Resend](https://resend.com)'s SMTP relay, unconditionally, same "always on" reasoning as
Uploads above — there's no local-first stand-in for a real mail relay (see
`application.properties`' comment on `spring.mail.*`), so this isn't a scale-up toggle like
Redis/Elasticsearch.

One-time setup, outside Terraform:
1. Sign up at [resend.com](https://resend.com).
2. Dashboard → Domains → Add Domain → `openopportunity.in`. Resend gives you DNS records (a
   verification TXT, DKIM CNAMEs, optionally a DMARC TXT) — add them in whichever DNS provider
   manages `openopportunity.in` (Cloudflare, if you followed the custom-domain setup elsewhere in
   this project). Wait for Resend to show the domain as verified.
3. Dashboard → API Keys → Create API Key.
4. Set it for Terraform (never commit this):
   ```bash
   export TF_VAR_resend_api_key="<the key from step 3>"
   ```
   Do this in your own terminal, same reasoning as `elastic_cloud_api_key` above.

Then `terraform apply` — `MAIL_HOST`/`MAIL_USERNAME` are Resend's own fixed SMTP relay values
(`smtp.resend.com` / literal `resend`, not an email address), `MAIL_PASSWORD` is the API key held
in Secret Manager, and `APP_MAIL_FROM` is hardcoded to `customersupport@openopportunity.in` —
change that value directly in `run.tf` if the sending address ever needs to move.

`app.community.contact-email` (`APP_COMMUNITY_CONTACT_EMAIL`) is left unset here — no separate
inbox for community interest requests yet, same "blank means disabled" convention as everywhere
else in this app.

Local dev needs the matching env vars set directly (`bootRun` doesn't read Terraform state):
```bash
export MAIL_HOST=smtp.resend.com
export MAIL_PORT=587
export MAIL_USERNAME=resend
export MAIL_PASSWORD="<the same API key>"
export APP_MAIL_FROM=customersupport@openopportunity.in
```

## Observability: the monitoring dashboard

`dashboard.tf` creates one Cloud Monitoring dashboard, always on (free — dashboards cost nothing;
the metrics behind them are already collected for Cloud Run/Cloud SQL regardless of whether
anything reads them). Eight widgets: backend request count by response class (2xx/4xx/5xx),
request latency (p50/p95/p99), backend CPU/memory utilization, backend instance count, and Cloud
SQL CPU utilization/memory utilization/active connections. Find the link with:

```bash
cd infra && terraform output -raw monitoring_dashboard_url
```

This is a different tool for a different moment than the "Load monitoring" alerts below: the
dashboard is for looking — during/after an incident, or before deciding whether a scale-up toggle
is warranted — while the alert policies are for finding out something needs attention in the
first place, without anyone having to be looking at the dashboard at the time. The widget queries
(metric names, `aggregation`/`groupByFields` syntax) were confirmed by creating this exact JSON as
a real dashboard via `gcloud monitoring dashboards create` against the project and deleting it
straight after — not assumed from documentation alone.

## Every toggle is a script — never a `-var` flag to remember

All six settings below live together in one file, `infra/deploy.tfvars` — every `scripts/*.sh` in
this section only flips the one line it's responsible for and leaves the others exactly as they
were, then runs `terraform apply -var-file=deploy.tfvars`. You never type a `-var` flag or need to
remember what's currently on; run the script for the thing you want, it handles the rest.

Unlike `terraform.tfvars` (gitignored — holds your project id and other per-environment values),
`deploy.tfvars` is tracked in git: CI (see "CI/CD" below) checks out a fresh clone on every run and
has no other way to know which toggles are currently on. Each script reminds you to `git add
infra/deploy.tfvars && git commit && git push` after `terraform apply` succeeds — an uncommitted
local toggle change is invisible to CI and would get silently reverted on the next deploy.

| Script | Effect |
|---|---|
| `scripts/deploy-firebase.sh` | `frontend_mode = "firebase"`, then build + `firebase deploy` |
| `scripts/deploy-loadbalancer.sh` | `frontend_mode = "load-balancer"`, then build + `gsutil rsync` |
| `scripts/enable-redis.sh` / `disable-redis.sh` | `enable_redis = true` / `false` |
| `scripts/enable-elasticsearch.sh` / `disable-elasticsearch.sh` | `enable_elasticsearch = true` / `false` |
| `scripts/set-loadbalancer-domain.sh <domain>` | `load_balancer_domain = "<domain>"` (see below) |
| `scripts/set-firebase-domain.sh <domain>` | `firebase_custom_domain = "<domain>"` (see below) |
| `scripts/set-sql-tier.sh <tier>` | `sql_tier = "<tier>"` (see below) |
| `scripts/upgrade-sql-replica.sh` / `downgrade-sql-replica.sh` | `enable_sql_read_replica = true` / `false` |
| `scripts/scale-up-backend.sh <n>` / `scale-down-backend.sh <n>` | `backend_max_instances = <n>` (see below) |
| `scripts/keep-backend-warm.sh` / `allow-backend-scale-to-zero.sh` | `backend_min_instances = 1` / `0` (see below) |
| `scripts/enable-seo-crawling.sh` / `disable-seo-crawling.sh` | `seo_crawling_enabled = true` / `false` (see below) |

All seventeen live at the repo root's `scripts/` and just run (no arguments, except the ones that
explicitly take a value): `../scripts/enable-redis.sh`, `../scripts/scale-up-backend.sh 5`, etc.
`terraform apply` will still show you the real plan and ask to confirm before changing
anything — the scripts don't add `-auto-approve`.

## Frontend modes: `firebase` vs `load-balancer`

| | `firebase` (default) | `load-balancer` |
|---|---|---|
| What it creates | `firebase.tf` — a Firebase Hosting site | `frontend.tf` + `job-seo.tf` — Cloud Storage bucket + Cloud CDN + global HTTP load balancer |
| SEO job-page routing | `../firebase.json` rewrites `/en/jobs/*` etc. to Cloud Run | `frontend.tf`'s URL map routes the same paths to Cloud Run |
| Extra monthly cost | ~$0 (within Firebase Hosting's free tier at MVP traffic) | ~$18/month flat (the load balancer's forwarding-rule charge) |

**`../firebase.json`'s rewrites hardcode a `region`** (each `run.serviceId`/`run.region` pair) — unlike
`frontend.tf`'s URL map, which derives everything from `var.region` automatically, plain JSON has no
way to reference a Terraform variable. If you ever change `region` in `terraform.tfvars`, update
`firebase.json`'s four `region` values to match too, or Firebase Hosting's SEO-path routing will
silently point at a Cloud Run region your backend isn't actually in.

Start with `firebase` — it's cheaper and does everything `load-balancer` does for an app this size.
Move to `load-balancer` once you actually need something Firebase Hosting can't do: Cloud Armor
(WAF/DDoS — only attaches to GCP's own load balancer), a move to GKE (which sits behind GCP's own
Ingress/LB), or routing/caching rules more advanced than Firebase Hosting's rewrite config exposes.
Switching is just running the other script — Terraform destroys whichever mode's resources aren't
currently active (via each resource's `count`, see `variables.tf`) and creates the other's. Cloud
Run/Cloud SQL are untouched either way, so this never touches your data.

**Switching a live custom domain between modes is disruptive, though** — see the next section for
`load-balancer`'s side; `firebase`'s side is a custom domain added via the Firebase console
(outside anything this Terraform manages), which would need re-adding there if you switch back.
Neither mode carries a domain over to the other automatically.

### Custom domain + HTTPS on `load-balancer`

Blank by default (`load_balancer_domain = ""`) — `load-balancer` mode serves plain HTTP on a bare
IP with no domain, same as before this existed. Set a domain to provision a Google-managed SSL
cert for it and switch the HTTP listener from serving content directly to redirecting to HTTPS:

```bash
../scripts/set-loadbalancer-domain.sh openopportunity.com
```

This only provisions anything while `frontend_mode=load-balancer` is also active (`local.has_custom_domain`
in `frontend.tf` requires both) — running it while `frontend_mode=firebase` just records the setting
for later. After it applies, **you still have to point the domain's DNS at the reserved IP yourself**
— this project doesn't assume your domain's DNS zone is in Cloud DNS, so Terraform can't do that part.
The script prints the exact record to create; find it again anytime with:

```bash
terraform output load_balancer_dns_instructions
```

The managed cert sits in `PROVISIONING` until that DNS record exists and propagates (can take
minutes to a few hours), then Google auto-validates and flips it to `ACTIVE` — no action needed on
your side once DNS is correct. Check status with:

```bash
gcloud compute ssl-certificates describe openopportunity-frontend --global --format='value(managed.status)'
```

Clear it with `../scripts/set-loadbalancer-domain.sh ""` — back to bare-IP HTTP-only.

### Custom domain on `firebase`

Firebase Hosting's custom domains are entirely a Firebase-console feature — Terraform can't add
one, provision its cert, or tell you what DNS records to create; do that part at
[console.firebase.google.com](https://console.firebase.google.com) → Hosting → Add custom
domain. `firebase_custom_domain` exists for the one piece Firebase's console doesn't handle for
you: telling the *backend* that domain is allowed to call it. Firebase always keeps serving both
its own default domains (`<project_id>.web.app` and `<project_id>.firebaseapp.com`) regardless —
`cors_allowed_origins` in `frontend.tf` includes both of those unconditionally, plus this domain
once set:

```bash
../scripts/set-firebase-domain.sh openopportunity.com
```

This only touches `APP_CORS_ALLOWED_ORIGINS` — it doesn't add the domain to Firebase Hosting
itself (do that in the console first) or to Google Sign-In. Google Sign-In's Authorized
JavaScript origins is a *separate* allowlist entirely outside Terraform, at
[console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) →
your OAuth 2.0 Client ID → Authorized JavaScript origins — miss this step and "Continue with
Google" fails with `origin_mismatch` on the new domain even though the site itself loads fine.
Clear the CORS entry with `../scripts/set-firebase-domain.sh ""`.

## Scale-up toggles: Redis and Elasticsearch

Two more independent, opt-in switches — off by default, and each mirrors a local Docker-based
opt-in this app already has (see `app.search.provider`/`app.cache.provider` in
`application.properties`, and `docker-compose.yml`'s `search`/`cache` profiles). Neither is needed
until real traffic/data volume actually justifies it — a plain `terraform apply` never provisions
either by accident.

| | `enable_redis` | `enable_elasticsearch` |
|---|---|---|
| What it creates | `redis.tf` — Memorystore for Redis, BASIC tier, 1GB | `elasticsearch.tf` — a real Elastic Cloud deployment (`ec` provider — a separate vendor from GCP, see below) |
| Switches the backend to | `app.cache.provider=redis` | `app.search.provider=elasticsearch` |
| Extra monthly cost | ~$36/month (Memorystore has no free tier) | ~$16-40/month, on Elastic's own bill, not GCP's |
| How the backend reaches it | Cloud Run's Direct VPC Egress (`vpc_access.network_interfaces` in `run.tf`) — no VPC connector, so this adds no separate fixed cost of its own | Public HTTPS endpoint (Elastic Cloud deployments are internet-reachable by default, authenticated via username/password) |

Both work with either frontend mode — every toggle in this file is independent of every other.

**Elasticsearch needs a one-time Elastic Cloud account first** — this is a genuinely separate
vendor/bill from GCP, not something `gcloud`/the one-time GCP setup covers:

```bash
# Sign up at https://cloud.elastic.co if you haven't already, then create an API key:
# Elastic Cloud console -> your user menu -> Organization -> API Keys -> Create API key
export TF_VAR_elastic_cloud_api_key="<the key you just created>"
```

Do this in your own terminal, same reasoning as the GCP billing decision in the one-time setup
below — never commit this key (it's `sensitive = true` in `variables.tf`, and `TF_VAR_*` env vars
never touch `terraform.tfvars`/`deploy.tfvars`). `scripts/enable-elasticsearch.sh` checks it's set
before doing anything. Verify `elastic_deployment_template_id`'s default (`gcp-general-purpose`)
is actually a valid template for your account/region in the Elastic Cloud console before the first
apply — exact template ids vary; `terraform plan` will fail clearly with an "unknown template"
error if it isn't, not silently do the wrong thing.

## Scale-up toggle: Cloud SQL machine tier

`sql_tier` controls both the primary (`sql.tf`) and, if enabled, the read replica
(`sql-replica.tf`) below — they always match. This is the toggle that matters most once real
traffic arrives: a real load test against this project's own production backend (200 requests,
concurrency 20, zero failures, 59 req/s at sub-second p99 latency) found that Cloud Run itself
held up fine, but Cloud SQL's `db-f1-micro` default was already sitting at 22–28 of its 25 max
connections just from normal idle connection-pool-holding — before that load test even added any
traffic. That's the real ceiling on concurrent load in this setup, not backend compute.

```bash
../scripts/set-sql-tier.sh db-g1-small       # shared-core, 50 max_connections, modest cost increase
../scripts/set-sql-tier.sh db-custom-2-7680  # dedicated-core, scales further, costs meaningfully more
../scripts/set-sql-tier.sh db-f1-micro       # back to the cheapest default, 25 max_connections
```

Cloud SQL sizes `max_connections` off available memory automatically — there's no flag to set it
directly, and Google doesn't publish an exact formula for dedicated-core `db-custom-*` tiers
beyond "it scales with memory". Check the real value on the resized instance rather than assume:

```bash
cloud-sql-proxy --port 5433 $(cd infra && terraform output -raw sql_connection_name) &
psql -h 127.0.0.1 -p 5433 -U openopportunity -d openopportunity -c "SHOW max_connections;"
```

This is a real, in-place Cloud SQL machine-type change — expect a short restart/unavailability
window while it applies (same as resizing any managed database), and a real recurring cost change
if you're moving to a bigger tier; verify pricing for your region before applying.

## Scale-up toggle: Cloud SQL read replica

The same read/write split already built and tested locally (`app.datasource.read-replica.*` in
`application.properties`, `ReadReplicaDataSourceConfig`, `ReadOnlyRoutingAspect` — see
`docker-compose.yml`'s `read-replica` profile for the local equivalent), now against a real Cloud
SQL instance instead of a local Docker standby. `@Transactional(readOnly = true)` calls (already
used throughout the backend's read-only service methods) start routing to the replica the moment
this is enabled — no code change, no new image to build/push, just the `terraform apply`.

```bash
../scripts/upgrade-sql-replica.sh     # provisions the replica, ~$9-11/month, same tier as the primary
../scripts/downgrade-sql-replica.sh   # deletes it — always safe, it holds no data the primary doesn't have
```

Reuses the primary's existing database user/password (Cloud SQL replicas replicate users along
with data), so there's no new secret to manage. Reached the same way the primary is — the Cloud
SQL Auth Proxy socket mount already on the Cloud Run service, just with a second instance
connection added to it, not a new networking path like Redis needed. Same async-replication-lag
caveat as the local version: a write immediately followed by a read of the same row isn't
guaranteed to see it yet if that read lands on the replica.

## Scale-up toggle: backend instance ceiling

`backend_max_instances` (default 2, matching what this was hardcoded to before the variable
existed) is the ceiling on how many Cloud Run backend instances can run *concurrently* — not a
fixed count the way `docker-compose.yml`'s local load-balancer setup runs exactly two named
processes. Cloud Run auto-scales within `[0, backend_max_instances]` based on real traffic the
whole time; raising the ceiling doesn't spin anything up by itself and costs nothing on its own
(Cloud Run bills for actual usage, not headroom) — it just raises how far it's *allowed* to scale
out before requests start queuing/failing under load. `min_instance_count` (always-on instances,
a real 24/7 cost) stays fixed at 0/scale-to-zero — see `run.tf`'s comment for why that's a
separate, bigger decision this pair of scripts deliberately doesn't touch.

```bash
../scripts/scale-up-backend.sh 5     # raise the ceiling to 5
../scripts/scale-down-backend.sh 1   # lower it to 1
```

Both take the target number directly (not a relative step) and refuse a value that doesn't
actually move in the direction the script name promises — e.g. `scale-up-backend.sh 1` when
it's currently 5 errors instead of silently doing the opposite of what the name says.

## Toggle: keeping the backend warm (no cold starts)

`backend_min_instances` (default 0) is the floor on concurrent Cloud Run backend instances —
unlike `backend_max_instances` above (a ceiling, free until traffic actually uses it), this is a
real, continuous cost the moment it's above 0: Cloud Run keeps that many instances running with
CPU always allocated, 24/7, regardless of traffic. At this service's current 1 vCPU / 1Gi (see
`run.tf`'s `containers.resources`), keeping one instance warm runs roughly $15-25/month.

```bash
../scripts/keep-backend-warm.sh              # backend_min_instances = 1, no more cold starts
../scripts/allow-backend-scale-to-zero.sh    # backend_min_instances = 0, back to idle = free
```

The trade-off: at `min_instance_count = 0` (the default), the first request after any idle
period pays for a full cold start — new container boot + Spring Boot init (JPA, Flyway, Cloud SQL
connection) — typically 10-30+ seconds. `keep-backend-warm.sh` trades that latency for the 24/7
cost above.

## Toggle: search-engine crawling

`seo_crawling_enabled` (default `true`) controls whether search engines are allowed to
crawl/index the production site at all — see `application.properties`'
`app.seo.crawling-enabled` doc comment and `com.openopportunity.seo.RobotsController` /
`JobSeoService` / `SitemapService` for what actually changes: `false` makes `/robots.txt`
disallow every path for every user-agent, `/sitemap.xml` render empty instead of listing every
active job, and every server-rendered job page (`JobSeoController`) add a `noindex, nofollow`
signal (both a `<meta name="robots">` tag and an `X-Robots-Tag` response header) — the robots.txt
block and the noindex signal are deliberately redundant with each other, since Google's own
guidance is that a page a crawler never fetches (blocked by robots.txt) can still show up in
search results without a snippet if it's linked from elsewhere, while `noindex` alone doesn't
stop crawling. Together they cover both cases.

```bash
../scripts/disable-seo-crawling.sh   # block every search engine (robots.txt Disallow: /, noindex)
../scripts/enable-seo-crawling.sh    # allow crawling/indexing again
```

Useful before a soft launch, or for any non-production-like deployment that's reachable at a real
domain but shouldn't show up in search results yet.

## Load monitoring: alerts, not automation

Cloud Run's own instance count already scales continuously and automatically with real traffic
within whatever `backend_max_instances` currently allows — there's nothing to watch or trigger
for that specific part, it's inherent to the platform. What actually needs a human decision is
the other three scale-up toggles: enabling/disabling Redis, Elasticsearch, or the SQL read
replica all have real recurring cost either way, and disabling Elasticsearch or the read replica
actually destroys provisioned infrastructure (a fresh Elasticsearch deployment, or a replica that
has to fully re-sync from scratch next time it's enabled). An unattended policy that flips those
on/off by itself risks flapping near a threshold and real cost/data churn nobody ever looks at —
so this project deliberately stops at **notifying you**, not running anything automatically.

Set an email and apply to turn it on (blank/unset, the default, creates no alerting at all).
Locally, this goes in `terraform.tfvars` like any other per-environment value:

```bash
# terraform.tfvars:
alert_notification_email = "you@example.com"
```

For CI, this is the one exception to "everything CI needs lives in `deploy.tfvars`" — since this
repo is public, a personal email address shouldn't sit in permanent commit history the way
`frontend_mode`/`enable_redis`/etc. do. It's passed to CI as the `ALERT_NOTIFICATION_EMAIL` repo
variable instead (see the CI/CD section below) — set once, never committed. Forgetting this step
doesn't just mean no alerts: CI's `terraform apply` would see the email as blank and plan to
*destroy* the notification channel and all 3 alert policies, since `local.monitoring_enabled` in
`monitoring.tf` reacts to whatever CI actually passes it, same as a human forgetting `-var-file`.

Three alert policies get created (`monitoring.tf`), each emailing a specific runbook pointing at
which `scripts/*.sh` to consider:

| Alert | Fires when | Suggests |
|---|---|---|
| Backend CPU high | Cloud Run backend CPU > 80% for 5m | `scale-up-backend.sh`, `enable-redis.sh`, or `upgrade-sql-replica.sh` |
| Backend CPU sustained low | Cloud Run backend CPU < 10% for 30m | `scale-down-backend.sh` / disabling whichever extras were enabled for a spike that's now over |
| Database CPU high | Cloud SQL primary CPU > 80% for 5m | `upgrade-sql-replica.sh` (only helps if reads, not writes, are the driver — check Cloud SQL's query insights first) |

Thresholds/durations are reasonable starting points, not tuned against this app's real traffic
(which doesn't exist yet) — revisit them once it does, same as you would for any new alerting
setup. There's no dedicated Elasticsearch alert: Elastic Cloud's own metrics live in Elastic's
observability tooling, not GCP Cloud Monitoring, so nothing here can watch it directly — the
backend CPU alerts are the closest proxy available.

## Prerequisites

- A GCP project with billing linked, and the Terraform state bucket created — see the "One-time GCP
  setup" block at the top of the Phase 2 section in `../docs/DEVELOPMENT_ROADMAP.md`. Run that in your
  own terminal first if you haven't already (it needs an interactive `gcloud auth login` and a billing
  account decision, so it can't run from inside a Claude session).
- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.7.
- [gcloud CLI](https://cloud.google.com/sdk/docs/install), already authenticated
  (`gcloud auth application-default login`) — the Google provider uses your user credentials locally.
- For `frontend_mode=firebase` specifically: the [Firebase CLI](https://firebase.google.com/docs/cli)
  (`npm install -g firebase-tools`), then `firebase login`, then `cp ../.firebaserc.example ../.firebaserc`
  and set your real project id in it (gitignored, same reasoning as `terraform.tfvars`).
- For `frontend_mode=load-balancer` specifically: nothing extra beyond gcloud — `gsutil` ships with it.
- For `enable_elasticsearch` specifically: an Elastic Cloud API key (see above).

## First run

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set project_id to the project you created in the one-time setup
cp deploy.tfvars.example deploy.tfvars
# deploy.tfvars' defaults (frontend_mode=firebase, everything else off) are a fine starting point —
# scripts/*.sh will edit this file for you from here on, you don't need to hand-edit it further

terraform init -backend-config="bucket=openopportunity-tfstate"
terraform plan -var-file="deploy.tfvars"
terraform apply -var-file="deploy.tfvars"
```

On a genuinely first-ever apply against a fresh project, expect Terraform to want to create
everything in this directory — Cloud Run, Cloud SQL, IAM, the uploads bucket, the CI/CD identity
setup, the dashboard, and (one per API) `google_project_service.required` — that's normal, not a
sign something's wrong. The `enabled_apis` output lists what got turned on — check it against
`gcloud services list --enabled` if you want a second source of truth.

If the Artifact Registry repo (`openopportunity`) already exists from an earlier manual
`docker push`, import it before this apply instead of letting Terraform try to create a
duplicate (check first — `gcloud artifacts repositories describe openopportunity
--location=<region>` — don't assume; this repo's own history briefly assumed it always existed
when for at least one real project it didn't):

```bash
terraform import google_artifact_registry_repository.backend \
  projects/<project_id>/locations/<region>/repositories/openopportunity
```

## CI/CD

`.github/workflows/ci.yml`'s `deploy` job runs on every push to `main` (after the `backend`/
`frontend` test jobs pass): builds and pushes the backend image, `terraform apply`s whatever
`infra/deploy.tfvars` currently says, then builds and deploys the frontend to whichever mode is
active. It authenticates via **Workload Identity Federation** — no GCP service account key is
ever generated, downloaded, or stored as a GitHub secret; GitHub mints a short-lived OIDC token
per run, scoped to this one repo (`cicd.tf`'s `attribute_condition`).

### One-time setup (after you've already done the "First run" apply above)

The WIF pool/provider/CI service account (`cicd.tf`) get created by that same `terraform apply`
— they're regular resources in this same config, not a separate manual gcloud dance. What *is*
still manual: telling GitHub about the identifiers `terraform apply` just created, since GitHub
Actions has no way to read your Terraform state itself.

```bash
cd infra
gh variable set WIF_PROVIDER --body "$(terraform output -raw cicd_workload_identity_provider)"
gh variable set DEPLOY_SA_EMAIL --body "$(terraform output -raw cicd_service_account_email)"
gh variable set GCP_PROJECT_ID --body "<the project_id from your terraform.tfvars>"
gh variable set GCP_REGION --body "<the region from your terraform.tfvars, e.g. asia-south1>"
```

Neither `WIF_PROVIDER`/`DEPLOY_SA_EMAIL`/`GCP_PROJECT_ID`/`GCP_REGION` is sensitive (they're
identifiers, not credentials — the actual security boundary is the WIF `attribute_condition`
restricting *which repo* can authenticate at all) — set as repo **variables**, not secrets.

One more variable that's easy to miss and doesn't fail loudly if you do: `GOOGLE_CLIENT_ID`
(same Client ID as `frontend/.env`'s `VITE_GOOGLE_CLIENT_ID`). Skipping this doesn't break the
build or the deploy — it just makes `GoogleSignInButton` render nothing, so "Continue with
Google" silently disappears from every CI-built deploy with no error anywhere. Non-sensitive,
same reasoning as the PostHog key below — it's a public, embedded-in-the-bundle token by design:

```bash
gh variable set GOOGLE_CLIENT_ID --body "<same Client ID from frontend/.env>"
```

Two more optional variables, only relevant if you've set up PostHog (see `frontend/.env`'s own
comment on `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST` for where to get these) — also non-sensitive,
same reasoning as `GCP_PROJECT_ID` above: a PostHog project API key is a public, embedded-in-the-
bundle token by design, not a credential to protect:

```bash
gh variable set POSTHOG_KEY --body "<your PostHog project API key, phc_...>"
gh variable set POSTHOG_HOST --body "<only if not on PostHog's US cloud — see frontend/.env>"
```

One more variable, this one **not optional** if you want load-monitoring alerts to survive a CI
deploy: `ALERT_NOTIFICATION_EMAIL`. Unlike everything above, this genuinely is treated
differently on purpose — not because it's more sensitive in the credential sense, but because
this repo is public and a personal email address shouldn't sit in permanent commit history the
way `deploy.tfvars` does (see that file's own comment, and "Load monitoring" above). Still set as
a repo **variable**, not a secret — it's not that kind of sensitive, it's just not something to
commit:

```bash
gh variable set ALERT_NOTIFICATION_EMAIL --body "<same email from your terraform.tfvars>"
```

Skipping this one doesn't just mean silently no alerts — CI's `terraform apply` sees a blank
email exactly like `alert_notification_email=""`, and `monitoring.tf`'s alert policies and
notification channel are `count`-gated on it being set, so CI would plan to **destroy** them if
they already exist. Set this before your first real CI deploy after enabling load monitoring.

Two secrets you *do* need, both optional, only if you actually use the feature they back:

```bash
# Only if you ever set enable_elasticsearch=true in deploy.tfvars:
gh secret set ELASTIC_CLOUD_API_KEY --body "<same key from infra/README.md's Elasticsearch section>"

# Only as a fallback if the primary `firebase deploy` auth approach (ADC via WIF) turns out not
# to work for your account/setup — see ci.yml's comment on that step:
firebase login:ci   # opens a browser, prints a token
gh secret set FIREBASE_TOKEN --body "<the token just printed>"
```

### Why `deploy.tfvars` is tracked in git (unlike `terraform.tfvars`)

CI checks out a fresh clone on every run — it has no access to your laptop's local
`deploy.tfvars`. For `terraform apply` in CI to know which toggles should currently be on, that
state has to live somewhere CI can read it, which means version control. `scripts/*.sh` still
apply immediately from your terminal, same as before — they now also remind you to commit + push
`infra/deploy.tfvars` afterward (`scripts/lib/deploy-tfvars.sh`'s `remind_to_commit_deploy_tfvars`),
since an uncommitted local toggle change is invisible to CI and would get silently reverted the
next time it runs. `terraform.tfvars` (project id, backend image) stays gitignored — CI gets
those from the `GCP_PROJECT_ID`/`GCP_REGION` repo variables and the image it just built instead,
not from that file at all.

## Deploying the frontend build

`terraform apply` provisions the hosting shell (Firebase site, or bucket/CDN/load balancer) but
doesn't build or upload the frontend itself — Step 22 automates that via CI, but until then
`../scripts/deploy-firebase.sh` / `../scripts/deploy-loadbalancer.sh` do the full
apply → build → deploy sequence in one command (see the toggles table above). Manually, the same
steps are:

```bash
cd infra
terraform output backend_url    # use this as VITE_API_BASE_URL below
terraform output frontend_bucket # frontend_mode=load-balancer only

cd ../frontend
VITE_API_BASE_URL=<backend_url from above> npm run build --workspace=frontend

# frontend_mode=firebase:
cd .. && firebase deploy --only hosting

# frontend_mode=load-balancer:
gsutil -m rsync -r -d dist gs://<frontend_bucket from above>
```

`-d` on `gsutil rsync` deletes stale objects in the bucket that are no longer in `dist/` (safe here —
the bucket only ever holds this build output). `frontend_mode=load-balancer`'s `frontend_url` is a bare
IP over plain HTTP until `load_balancer_domain` is set (see above) — `frontend_mode=firebase` gets free
HTTPS on its `*.web.app` URL immediately, no domain needed.

## Day-to-day

```bash
terraform fmt -recursive               # format .tf files
terraform validate                     # check syntax/types without touching GCP
terraform plan -var-file="deploy.tfvars"   # preview changes before applying
```

`terraform.tfvars` (project id, backend image) and `deploy.tfvars` (the toggles above) are both
gitignored — `terraform.tfvars.example`/`deploy.tfvars.example` are the committed templates. The state
bucket name is passed via `-backend-config` rather than a variable because Terraform backend blocks
can't reference variables.
