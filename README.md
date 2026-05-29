# EU Financial Reg Horizon Scanner

MVP foundation for a regulatory horizon-scanning workflow focused on EU crypto, payments, digital assets, and prudential supervision.

The current working slice ingests Tier 1 public regulator sources, normalises publications, stores version history, classifies against the delivered taxonomy, scores publications against local product maps, routes items through human review, prepares approved alert drafts, and keeps delivery behind explicit reviewed sends. Classification uses deterministic rules by default and can use structured AI Gateway output for public publication text after explicit configuration. Product maps maintain local concern watchlists, multiple licences, product lines, jurisdictions, quarterly footprint confirmation, and auditable score recalculation. Stored score explanations retain topic, home-state, passporting, critical-line and score-floor components. Score-affecting footprint edits retire pending alert drafts until the edited footprint is confirmed again. Reviewers can rerun classification, correct tags, deadlines, confidence, summaries, and service routing, with correction history and score recalculation. Governed service-package updates invalidate pending alert drafts and flow into newly generated payloads. Client product maps stay local. No legal, client, recruiting, or public communications are sent automatically.

For a reviewer-friendly demo path, architecture map, checks and safety posture, see [`docs/launch-readiness.md`](docs/launch-readiness.md).

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Prisma with Postgres, `pgvector`, and `pg_trgm`
- Inngest for scheduled source polling and dry-run digest jobs
- Clerk-ready auth, optional in local demo mode
- Clerk organisation mapping and internal-operator gating for firm-governed screens
- Resend, Slack, Teams, and explicit HubSpot lead/deal delivery behind reviewed send buttons
- Vitest for taxonomy, service-routing, ingestion, review, paragraph diffing, extraction, delivery blocking, saved views, diligence, and scoring tests

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app works without `DATABASE_URL` by using demo publications. Connect Postgres when you want persistence:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run prisma:validate
npm run prisma:generate
npm run ingest:fixture
npm run smoke:routes
npm run build
npm audit --omit=dev
```

## Production Access

Client-specific records are tenant-scoped when Clerk is configured. Set `User.externalId` to the Clerk user ID and `Organisation.externalId` to the Clerk organisation ID, then create the relevant `Membership` row. Users only see scores, product maps, alerts, saved views, integration settings, and audit events for the active organisation.

Review decisions, service catalogue governance, source diligence edits, and manual source polling require `User.isInternalOperator = true`. The seed creates one local fixture reviewer for development. Production operator actions require Clerk, even when read-only demo fallback is explicitly enabled.

## Main Paths

- `config/taxonomy.yaml`: versioned taxonomy and service-offering triggers.
- `config/scoring-rules.yaml`: versioned deterministic impact-scoring rules.
- `prisma/schema.prisma`: delivered schema plus adapter state and tenant access fields.
- `prisma.config.ts`: Prisma schema, migration, seed, and datasource configuration.
- `src/lib/ingestion`: source adapters, diligence-gated polling, RSS parsing, detail extraction, paragraph versioning, and persistence.
- `src/lib/impact-scoring.ts`: local product-map scoring, no LLM calls.
- `src/lib/ai/classification.ts`: publication-only deterministic classifier and optional AI Gateway structured-output execution.
- `src/lib/review.ts`: internal review state transitions, validated corrections, correction history, and alert invalidation after revised classifications.
- `src/lib/alerts.ts` and `src/lib/delivery.ts`: alert draft generation, approval, and reviewed delivery attempts.
- `src/app`: dashboard, review queue, alert cockpit, service catalogue, source diligence, audit log, diagnostics, publication detail, digest preview, source registry, and API routes.
- `docs/launch-readiness.md`: reviewer runbook for demo path, checks, architecture and safety posture.
- `docs/launch/launch-post.md`: launch asset, stored as a draft.
- `docs/BACKLOG.md`: later 12-month features deliberately left outside this MVP pass.

## Source References

- BaFin RSS discovery: https://www.bafin.de/EN/Service/TopNavigation/RSS/rss_artikel_en.html
- ESMA RSS and Q&A search: https://www.esma.europa.eu/rss.xml and https://www.esma.europa.eu/esma-qa-search-page/all
- EBA RSS and Single Rulebook Q&A: https://www.eba.europa.eu/news-press/news/rss.xml and https://www.eba.europa.eu/single-rulebook-qa
- EUR-Lex reuse and Cellar access: https://eur-lex.europa.eu/content/help/data-reuse/reuse-contents-eurlex-details.html?locale=en
- Bundesbank RSS discovery: https://www.bundesbank.de/de/startseite/rss

## Safety Defaults

- Email, Slack, Teams, and HubSpot delivery remain blocked until a human approves an alert draft and presses the reviewed send action.
- Alert sends atomically claim an approved draft, preventing duplicate delivery attempts from concurrent clicks.
- Reviewer attribution for persisted decisions and approvals is taken from the authenticated operator identity.
- Configured Postgres reads fail visibly on error and never substitute sample client records.
- Secrets stay in environment variables. Postgres stores only non-secret integration metadata.
- The classifier sends only public regulator publication text to AI Gateway when `HORIZON_AI_PROVIDER="gateway"`, a model is selected, and gateway authentication is configured.
- Reviewer-triggered classification reruns return the publication to pending review and retire related pending alert drafts.
- Product-map impact scoring is deterministic and local in this pass.
- Product-map edits are organisation-scoped, audit logged, and immediately recalculate the persisted explanation breakdown.
- Alert generation and reviewed send require current quarterly confirmation for every active product map in the organisation.
- Live polling honours source reuse status and allowed cadence; sources awaiting diligence remain blocked.
- Production mode denies an unconfigured authenticated app. Read-only demo rendering is available only when explicitly permitted with `HORIZON_ALLOW_DEMO_MODE="true"` and no database is configured.
- External publishing, outreach, billing, Neo4j, and fine-tuning remain out of scope for this pilot-ready core.