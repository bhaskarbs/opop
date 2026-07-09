# OpenOpportunity — Step-by-Step Development Roadmap

This is the small-step build plan for turning the mockups in `OpenOpportunity job portal/` and the
architecture in `docs/OpenOpportunity_Architecture.docx` into a working product. Each step is one
branch, one PR. Frontend first, backend once the UI shell exists, cloud infra deferred until the app
works end-to-end locally.

## Why git runs on your machine, not in chat

Claude's sandbox can create and edit files in this folder, but it cannot delete or rename files here
(a Cowork safety feature). Git needs to do that constantly (lock files, refs, objects), so it can't run
reliably from inside a Claude session against this folder. The fix: Claude writes/edits the code for
each step, and you run a short git command block in your own Terminal to branch, commit, push, and open
the PR. Every step below ends with that block, ready to copy-paste.

## One-time setup (do this first, in your own Terminal — not in Claude)

Claude's earlier attempt to `git init` here from the sandbox got stuck on a lock file it isn't allowed
to delete. Clear that out first:

```bash
cd "/Users/bhaskar/Documents/tech/opop/project"
rm -rf .git
git init -b main
git config user.name "Bhaskar"
git config user.email "bhaskarbs1111@gmail.com"
git add -A
git commit -m "chore: initial baseline (architecture doc, mockups, gitignore, README)"
```

Create the GitHub repo (pick one):

```bash
# If you have GitHub CLI (gh) installed and logged in:
gh repo create OpenOpportunity --private --source=. --remote=origin --push

# Otherwise: create an empty repo named OpenOpportunity on github.com first, then:
git remote add origin https://github.com/<your-username>/OpenOpportunity.git
git push -u origin main
```

## The pattern for every step below

1. Copy the **Prompt** for the step into Claude (in this same project folder).
2. Review the files Claude creates/edits.
3. Run this in your Terminal, swapping in the step's branch name and a short PR title:

```bash
cd "/Users/bhaskar/Documents/tech/opop/project"
git checkout -b <branch-name>
git add -A
git commit -m "<step summary>"
git push -u origin <branch-name>
gh pr create --fill --base main   # or open the compare URL GitHub prints after the push
git checkout main
```

---

## Phase 0 — Frontend shell (local-first, mock data, no backend yet)

### Step 1 — Scaffold the frontend app
**Branch:** `feat/01-frontend-scaffold`
**Prompt:**
> Set up a new React 18 + Vite + TypeScript app in a `frontend/` folder at the root of this project. Add ESLint + Prettier, React Router, and a root `package.json` with npm workspaces so a `backend/` folder can be added later without restructuring. Add an `.env.example`. Get `npm run dev` working with a placeholder home page. Update the root README with frontend run instructions.

### Step 2 — Design tokens from the style guide
**Branch:** `feat/02-design-tokens`
**Prompt:**
> Read `OpenOpportunity job portal/StyleGuide.dc.html` and extract the color palette, typography scale, spacing scale, and border-radius/shadow values into a design tokens file in `frontend/src/theme/` (CSS variables or a Tailwind config — pick one and set up Tailwind if so). Build base primitives matching the style guide: Button (primary/secondary/ghost, amber and teal accent variants), Card, Input, Badge, and a Tag component. Add a `/dev/style-guide` route in the app that renders every primitive so we can visually compare it against the original mockup.

### Step 3 — Header and Footer
**Branch:** `feat/03-header-footer`
**Prompt:**
> Read `OpenOpportunity job portal/Header.dc.html` and `Footer.dc.html`. Build React `Header` and `Footer` components in `frontend/src/components/layout/` using the design tokens/primitives from Step 2. The Header needs a guest variant (logged out) and an authenticated variant (candidate/company), matching the mockup exactly — logo, nav links, auth buttons vs. user menu.

### Step 4 — App shell and routing
**Branch:** `feat/04-app-shell-routing`
**Prompt:**
> Set up React Router route structure: a public layout (Header guest variant + Footer) and an authenticated layout (Header authenticated variant), each lazy-loaded as separate chunks. Add placeholder routes for every page listed in Section 2 of `docs/OpenOpportunity_Architecture.docx` (Landing, Job Search, Job Detail, Partnerships, Community, Login, Register — public; Candidate/Company Dashboard, Post a Job, Search Candidates, Applications, Seminar Scheduler, Mock Interview — authenticated; Admin Dashboard, Job/Company Approvals, Users, Reports — admin). Add a 404 page. No real content yet, just routing and layout wiring.

### Step 5 — Landing page
**Branch:** `feat/05-landing-page`
**Prompt:**
> Port `OpenOpportunity job portal/Landing-full.html` into the React Landing route (`/`), using the Step 2 primitives and Step 3 Header/Footer instead of inline styles. Match the mockup's layout, copy, and imagery placement exactly.

### Step 6 — Job Search page
**Branch:** `feat/06-job-search-page`
**Prompt:**
> Port `OpenOpportunity job portal/NewJobSearch-full.html` (fall back to `JobSearch.dc.html` if that's the more complete one) into the React Job Search route. Use a local mock dataset (10–15 fake jobs) in `frontend/src/mocks/jobs.ts`. Implement the filters/facets shown in the mockup as working client-side filters over the mock data.

### Step 7 — Job Detail page
**Branch:** `feat/07-job-detail-page`
**Prompt:**
> Port `OpenOpportunity job portal/JobDetail.dc.html` into a React Job Detail route (`/jobs/:id`), reading from the same mock dataset from Step 6. Include the apply CTA (no real submission yet — just a disabled/mock state).

### Step 8 — Auth pages (candidate + company)
**Branch:** `feat/08-auth-pages`
**Prompt:**
> Port `Login.dc.html`, `Register.dc.html`, `CompanyLogin.dc.html`, and `CompanyRegister.dc.html` into React routes. Use React Hook Form + Zod for validation, matching each mockup's fields exactly. Submit handlers should just log the payload and route to the relevant dashboard for now — no backend call yet.

### Step 9 — Candidate dashboard + profile
**Branch:** `feat/09-candidate-dashboard`
**Prompt:**
> Port `NewCandidateDashboard-full.html`, `CandidateProfile.dc.html`, and `AddMissingDetails-full.html` into React routes under the authenticated candidate layout, backed by mock data.

### Step 10 — Company dashboard, post a job, search candidates
**Branch:** `feat/10-company-pages`
**Prompt:**
> Port `CompanyDashboard.dc.html`, `PostJob-full.html`, and `SearchCandidates-full.html` into React routes under the authenticated company layout, backed by mock data. Post a Job should be a real multi-field form (React Hook Form + Zod) that appends to the in-memory mock job list on submit.

### Step 11 — Admin console
**Branch:** `feat/11-admin-pages`
**Prompt:**
> Port `AdminDashboard.dc.html`, `AdminJobApprovals-full.html`, `AdminCompanyApprovals-full.html`, `AdminUsers-full.html`, and `AdminReports.dc.html` into React routes under an admin layout, backed by mock data. Approve/reject actions should mutate the in-memory mock state so the UI feels real.

### Step 12 — Remaining pages
**Branch:** `feat/12-remaining-pages`
**Prompt:**
> Port the remaining mockups into React routes: `Community.dc.html`, `PartnershipLanding.dc.html` / `NewPartnershipLanding-full.html`, `SeminarScheduler-full.html`, `MockInterview.dc.html`, and `Applications-full.html`. All backed by mock data. At the end of this step every page in the mockup folder should exist as a working React route with realistic (mock) content — the full frontend shell is done.

---

## Phase 1 — Local backend (Spring Boot + Postgres via Docker)

### Step 13 — Backend scaffold
**Branch:** `feat/13-backend-scaffold`
**Prompt:**
> Set up a Java 21 + Spring Boot 3 project in `backend/` (Gradle), plus a root `docker-compose.yml` running Postgres 16 locally. Add a `/actuator/health` endpoint, Flyway wired up with an empty baseline migration, and instructions in the README for running `docker compose up` + the Spring Boot app locally. Add CORS config so the Vite dev server (localhost:5173) can call it.

### Step 14 — Auth service
**Branch:** `feat/14-auth-service`
**Prompt:**
> Add a `users` table (Flyway migration) covering candidate and company accounts, and REST endpoints for register/login issuing a JWT, per Section 6.1/12 of the architecture doc (OAuth2/OIDC can come later — start with straightforward JWT auth). Add Spring Security config protecting authenticated routes. Include unit tests for the auth flow.

### Step 15 — Wire frontend auth to the real API
**Branch:** `feat/15-wire-auth`
**Prompt:**
> Replace the mock submit handlers in the Step 8 auth pages with real calls to the Step 14 Auth Service. Store the token per the architecture doc (Section 4.1: in memory + httpOnly refresh cookie, not localStorage). Add route guards so authenticated routes redirect to login without a valid session.

### Step 16 — Job service
**Branch:** `feat/16-job-service`
**Prompt:**
> Add a Job Service to the backend: `jobs` table (Flyway), CRUD endpoints, and a basic SQL-based search/filter endpoint (Elastic comes later in Phase 2). Wire the Step 6/7/10 frontend pages (Job Search, Job Detail, Post a Job) to these real endpoints, replacing the mock dataset.

### Step 17 — Application service
**Branch:** `feat/17-application-service`
**Prompt:**
> Add an Application Service: `applications` table (Flyway), apply/withdraw endpoints, status tracking. Wire the Job Detail apply button and the Applications page to it.

### Step 18 — Admin approvals on real data
**Branch:** `feat/18-admin-service`
**Prompt:**
> Add approval/moderation endpoints to the backend (job approvals, company approvals, basic user management) with simple role-based access control (admin role). Wire the Step 11 admin pages to these endpoints.

---

## Later phases (revisit once Phase 0–1 are done)

These map to Phases 2–4 in `docs/OpenOpportunity_Architecture.docx` and aren't broken into steps yet
because priorities may shift once the local app is working:

- **Search & i18n** — Elastic Cloud multilingual search, react-i18next, locale routing, RTL support.
- **Mobile** — pull the frontend into an Nx/Turborepo monorepo, add the React Native app, shared design tokens.
- **Cloud infra** — Terraform for GCP (GKE, AlloyDB, Memorystore, Cloud Storage/CDN), CI/CD (GitHub Actions, Argo CD/Rollouts).
- **Analytics** — RudderStack, Kafka, BigQuery/dbt, Looker, PostHog.
- **Hardening** — multi-region, Cloud Armor, pen testing, observability (Prometheus/Grafana/Sentry).

When you're ready for one of these, ask and we'll break it into the same small-step format.
