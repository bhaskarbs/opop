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
