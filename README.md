# OpenOpportunity

A two-sided job marketplace (candidates + employers) with an internal admin/moderation console.

- **Full technical architecture:** [`docs/OpenOpportunity_Architecture.docx`](docs/OpenOpportunity_Architecture.docx)
- **Step-by-step build plan:** [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md)
- **Design mockups & style guide:** [`OpenOpportunity job portal/`](<OpenOpportunity job portal/>)

## Target stack (per architecture doc)

- **Frontend:** React 18 + Vite (TypeScript), React Router, TanStack Query, Zustand, React Hook Form + Zod
- **Backend:** Java 21 + Spring Boot 3 microservices
- **Database:** PostgreSQL (AlloyDB in production; plain Postgres via Docker locally)
- **Cloud:** Google Cloud Platform (GKE, Cloud Storage/CDN, Memorystore, Elastic Cloud) — introduced in later phases

## How we're building this

We're going local-first: every early step runs entirely on this machine (Vite dev server, Spring Boot on localhost, Postgres in Docker). Cloud infrastructure (GCP/Terraform/Kafka/Elastic) is deferred to a later phase once the app works end-to-end locally.

Each development step lives on its own branch and becomes a pull request. See `docs/DEVELOPMENT_ROADMAP.md` for the full numbered list of steps and the exact prompt to give Claude for each one.

## Running the frontend

The repo root is an npm workspaces project (`frontend/`, with `backend/` to be added later). From the repo root:

```bash
npm install                # installs all workspace dependencies
cp frontend/.env.example frontend/.env
npm run dev --workspace=frontend       # starts the Vite dev server (http://localhost:5173)
```

Other useful commands, run from the repo root:

```bash
npm run build --workspace=frontend         # type-check and produce a production build
npm run lint --workspace=frontend          # ESLint
npm run format --workspace=frontend        # Prettier (writes)
npm run format:check --workspace=frontend  # Prettier (check only)
```

Requires Node 20+. An `.nvmrc` is checked in at the repo root — run `nvm use` before installing if you use `nvm`.

## Running the backend

Requires Java 21 and Docker (for local Postgres). From the repo root:

```bash
docker compose up -d                  # starts Postgres 16 on localhost:5432
cd backend
./gradlew bootRun                     # starts the API on http://localhost:8080
```

The `postgres` container is preconfigured with database/user/password all set to `openopportunity`
(see `docker-compose.yml`). Flyway runs its migrations automatically on startup — there's nothing
extra to do.

Health check:

```bash
curl http://localhost:8080/actuator/health   # {"status":"UP"}
```

Other useful commands, run from `backend/` (Postgres must be running for these, since Flyway/JPA
need a live connection):

```bash
./gradlew build   # compiles and runs tests
./gradlew test    # runs tests only
```

If port 5432 is already taken by another local Postgres install, either stop that instance or
change the host-side port in `docker-compose.yml` and `backend/src/main/resources/application.properties`
to match.

CORS is preconfigured (`app.cors.allowed-origins` in `application.properties`) to allow requests
from the Vite dev server at `http://localhost:5173`.

### Job search: Postgres (default) vs. Elasticsearch

The public job search (`GET /api/jobs`) runs against Postgres by default — `docker compose up`
above is all it needs. To try it against Elasticsearch instead (real relevance ranking instead of
falling back to recency — see `com.openopportunity.search`):

```bash
docker compose up -d elasticsearch          # starts a local, security-disabled ES on :9200
SEARCH_PROVIDER=elasticsearch ./gradlew bootRun
```

The index and its mapping are created automatically on startup, and every job in Postgres gets
backfilled into it the first time (see `JobSearchIndexInitializer`) — no separate setup step. In
a real deployment, point `spring.elasticsearch.uris`/`ELASTICSEARCH_URIS` (and
`ELASTICSEARCH_API_KEY`) at Elastic Cloud instead.

### File storage / local CDN: disk (default) vs. Google Cloud Storage

Uploaded files (resumes, candidate photos, company logos, certificates) go to local disk by
default (see `com.openopportunity.storage`) — nothing extra to run. To back them with Google
Cloud Storage instead, using a local emulator so the exact same code path (not a rewrite) is what
eventually talks to real GCS + Cloud CDN in production (see `infra/frontend.tf`):

```bash
docker compose up -d fake-gcs-server          # a real GCS API emulator on :4443, security off
STORAGE_PROVIDER=gcs STORAGE_GCS_EMULATOR_HOST=http://localhost:4443 ./gradlew bootRun
```

The upload bucket is created automatically on first use, and every file already sitting in
`app.storage.root-dir` (local disk) gets synced into it too (see `LocalUploadsSyncRunner`) — so
switching a machine that already has local uploads over to `gcs` mode doesn't leave existing
resumes/photos/logos 404ing (their storage key doesn't change, only where the bytes live; nothing
in Postgres needs updating). Only uploads what's missing, so it's cheap and safe to leave running
on every startup. Every upload/download/delete still goes through this app's own authenticated
endpoints exactly as it does with local disk — only where the bytes physically live changes. In a
real deployment, leave `STORAGE_GCS_EMULATOR_HOST` unset (the default) so it falls back to real
GCS via Application Default Credentials instead.

The same emulator can also serve the frontend's static build, mirroring the production Cloud
Storage + Cloud CDN setup (`infra/frontend.tf`) locally:

```bash
./scripts/sync-frontend-to-local-cdn.sh
```

This builds `frontend/` and uploads `dist/` into a local `openopportunity-frontend` bucket with
correct content types. fake-gcs-server's raw JSON API doesn't map root-relative paths the way a
real load balancer + backend bucket does, though, so `curl`ing an individual object (e.g.
`curl "http://localhost:4443/storage/v1/b/openopportunity-frontend/o/index.html?alt=media"`) is a
spot-check, not something you can browse directly — opening that URL in a tab 404s on every
asset, since `/assets/x.js` resolves against the wrong base. To actually browse the built site:

```bash
node scripts/local-cdn-proxy.mjs   # http://localhost:8081/, Ctrl+C to stop
```

This rewrites clean root-relative requests into the emulator's object URLs underneath (what the
real load balancer does automatically in production), falls back to `index.html` for any
unmatched path so React Router's client-side routes still work on a full page load, and
`app.cors.allowed-origins` already includes `http://localhost:8081` so the SPA's API calls to the
backend on `:8080` work from it too. Neither of these replace the Vite dev server for day-to-day
frontend work (no hot reload) — they're there to verify the CDN-serving path before it's ever
deployed.

### Caching: in-process Caffeine (default) vs. Redis

`@Cacheable` entries (the admin dashboard's report stats — see `AdminReportsService`) are cached
in-process by default (see `com.openopportunity.config.CacheConfig`) — correct for a single
instance, nothing extra to run. To share the cache across instances instead:

```bash
docker compose up -d redis          # no password locally
CACHE_PROVIDER=redis ./gradlew bootRun
```

Same cache names and 60s TTL either way — the `@Cacheable` call sites don't change
(`RedisCacheConfig`). Cache values are JSON (`GenericJackson2JsonRedisSerializer`, using the
app's own `ObjectMapper` so `Instant` fields serialize correctly), not Java serialization — the
DTOs being cached are plain records that don't implement `Serializable`, and JSON is the right
format for a cache anyway. Spot-check what landed in Redis with
`docker exec openopportunity-redis redis-cli KEYS '*'`. In a real deployment, point
`spring.data.redis.host`/`REDIS_HOST` (and `REDIS_PASSWORD`) at a real Redis (e.g. Memorystore)
instead.

### Notification events: in-process (default) vs. Kafka

Creating a notification (see `NotificationService.notify`, called by `JobService`/
`ApplicationService`/etc. as a side effect of their own state changes) always writes the
in-app notification row synchronously — only the "send the email" side effect's transport is
swappable (see `com.openopportunity.notification`). In-process (the default) dispatches it
directly, in the same JVM. To publish it as a real domain event on Kafka instead:

```bash
docker compose --profile events up -d kafka   # local single-node KRaft broker, no Zookeeper
EVENTS_PROVIDER=kafka ./gradlew bootRun
```

Durable across a restart between publish and delivery (unlike the in-process default's pure
in-memory thread pool), and the same "notifications" topic other consumers (search indexing,
analytics) could subscribe to later without touching `JobService`/`ApplicationService`/etc.
again. Spot-check what's actually on the topic with:

```bash
docker exec openopportunity-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --topic notifications --from-beginning --bootstrap-server localhost:9092
```

In a real deployment, point `spring.kafka.bootstrap-servers`/`KAFKA_BOOTSTRAP_SERVERS` at a real
Kafka (e.g. Confluent Cloud) instead.

### Admin console access

There's no admin self-registration flow (by design). On first startup the backend seeds one
admin account if it doesn't already exist yet (see `AdminSeeder` and the `app.admin.seed-*`
properties in `application.properties`):

```
email:    admin@openopportunity.com
password: AdminPass123!
```

Sign in at `/admin/login` in the frontend. Change these via `APP_ADMIN_SEED_EMAIL` /
`APP_ADMIN_SEED_PASSWORD` env vars before first startup in any real deployment.

## Cloud deploy

Terraform config for a minimal GCP deploy (Cloud Run + Cloud SQL + Cloud Storage/CDN) lives in `infra/` —
see [`infra/README.md`](infra/README.md) for setup and [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md)
("Phase 2 — Cloud infra") for the step-by-step build plan.
