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
