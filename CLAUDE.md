# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

The repo is mid-roadmap: `docs/DEVELOPMENT_ROADMAP.md` Step 1 (frontend scaffold) is done; `backend/` and
everything from Step 2 onward do not exist yet. Check `docs/DEVELOPMENT_ROADMAP.md` and recent git history
for which step is current before assuming a piece of tooling or a route exists.

## What's here

- `frontend/` — React 18 + Vite + TypeScript app (npm workspace). See "Frontend commands" below.
- `OpenOpportunity job portal/` — static HTML mockups (the visual source of truth for the UI).
- `docs/OpenOpportunity_Architecture.docx` — full target technical architecture (stack, services, data
  model, auth approach). Read this before making stack/architecture decisions.
- `docs/DEVELOPMENT_ROADMAP.md` — the numbered, branch-by-branch build plan (Steps 1–18, across Phase 0
  frontend shell and Phase 1 local backend), each with the exact prompt to expect from the user for that
  step. Check this file to see what step is next and what a step's prompt is scoped to.
- `README.md` — target stack summary and the local-first build philosophy.

## Frontend commands

Requires Node 20+ (`.nvmrc` at repo root pins `20.20.2`). Root is an npm workspaces project, so run these
from the repo root, not from inside `frontend/`:

```bash
npm install
npm run dev --workspace=frontend           # Vite dev server, http://localhost:5173
npm run build --workspace=frontend         # tsc -b && vite build
npm run lint --workspace=frontend          # ESLint (flat config, eslint.config.js)
npm run format --workspace=frontend        # Prettier — writes
npm run format:check --workspace=frontend  # Prettier — check only
```

No test runner is set up yet — don't invent test commands.

## Reading the mockups

The `.dc.html` files are not plain HTML — they use a small proprietary templating format:
- `<x-dc>` wraps the page body.
- `<dc-import name="Header" variant="guest">` / `<dc-import name="Footer">` pull in the shared
  `Header.dc.html` / `Footer.dc.html` components (Header has `guest` vs. authenticated variants).
- `<sc-for list="{{ trendingSkills }}" as="s">...</sc-for>` is a repeater over mock/placeholder data;
  `{{ expr }}` is interpolation.
- `support.js` and `doc-page.js` are the runtime that resolves these tags in a browser preview — they are
  mockup tooling, not application code, and shouldn't be ported into the real app.
- `*-full.html` files are the same page pre-bundled/inlined (imports resolved) for standalone viewing.
- The `OpenOpportunity <Page Name>.html` files (no `.dc`/`-full` suffix) are large self-contained bundler
  exports (SVG thumbnail + loading shell) meant for opening directly in a browser to preview — not useful
  as a reference for markup, since the real content loads dynamically. Prefer the `.dc.html` /
  `-full.html` versions when porting a page.
- `StyleGuide.dc.html` is the source of truth for colors, type scale, spacing, and component variants —
  read it before inventing new design tokens.

When a roadmap step says "port `X.dc.html`", read that file (and any `dc-import`ed Header/Footer) for
exact layout, copy, and inline styles, and translate it faithfully into the target framework rather than
redesigning it.

## Target architecture (from `docs/OpenOpportunity_Architecture.docx` and `README.md`)

- **Frontend:** React 18 + Vite (TypeScript), React Router, TanStack Query, Zustand, React Hook Form + Zod.
- **Backend:** Java 21 + Spring Boot 3 microservices (Auth, Job, Application, Admin services — one per
  roadmap step), Gradle, Flyway migrations.
- **Database:** PostgreSQL — plain Postgres via Docker locally, AlloyDB in production.
- **Auth:** JWT first; token stored in memory + httpOnly refresh cookie (explicitly *not* localStorage).
- **Cloud (later phases, not yet):** GCP (GKE, Cloud Storage/CDN, Memorystore, Elastic Cloud), Terraform,
  Kafka/BigQuery/dbt analytics, react-i18next for locale/RTL, React Native mobile app.

Build local-first: every Phase 0/1 step must run entirely on localhost (Vite dev server, Spring Boot,
Postgres in Docker) with no cloud dependency. Elastic, Terraform, Kafka, RudderStack, etc. are explicitly
deferred until the app works end-to-end locally — don't introduce them early.

## Git workflow — important: git does not run from inside Claude here

Claude's sandbox in this project cannot delete or rename files (a safety feature), which breaks git's
normal operation (locks, refs, objects). So the workflow is split:

- **Claude's job:** write/edit the code for one roadmap step at a time, scoped to that step's branch name
  and prompt as listed in `docs/DEVELOPMENT_ROADMAP.md`.
- **The user's job:** all git operations (branch, add, commit, push, PR) run in their own terminal, using
  the command block at the end of each roadmap step.

Do not attempt `git init`, `git add`, commits, branch creation, or any destructive git operation from
within a session in this repo — it will get stuck on files/locks Claude can't clean up. If asked to do
git work here, point back to the roadmap's command block instead.

## Working step-by-step

Each roadmap step is scoped to one branch/one PR. When the user gives a step prompt (or references a step
number), check `docs/DEVELOPMENT_ROADMAP.md` for that step's exact branch name and prompt text before
starting, and keep the change limited to that step's scope — later steps (e.g. wiring real backend calls)
intentionally come later and shouldn't be pulled forward.
