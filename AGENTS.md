<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Rules

- Treat `config/taxonomy.yaml` as product code. Every classification must store the taxonomy version used.
- Keep client product maps local. Do not send product-map or client-specific facts to LLM providers in the MVP foundation.
- Public regulator publication text may be classified by the AI seam once a provider is explicitly configured.
- Product-map impact scoring is deterministic and versioned in `config/scoring-rules.yaml`.
- Email, Slack, Teams, HubSpot, publishing, and outreach paths must stay draft-only unless a reviewed action explicitly sends them.
- Prefer fixture-backed ingestion tests before changing live adapter parsing.
