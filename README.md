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
