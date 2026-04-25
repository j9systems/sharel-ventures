## Project overview
Operations management platform (Sharel Ventures) for a McDonald's franchisee group that operates 13 stores across two ownership entities: **NGEN** (2 stores) and **Sharel Ventures** (11 stores). Built by J9 Systems. Stack: Next.js (App Router), React 19, Tailwind, shadcn/ui, Supabase (project ID `jdlmpgjyedbxifjxbahy`), Vercel. Parsing libs: `xlsx`, `papaparse`.

Three active modules:
- **Deposit Reconciliation** — matches bank deposits against RTI records. Universal bank parser with DB-driven entity detection via `bank_accounts` table; automatic entity detection (no UI selector). RTI is being replaced end of April 2026 — parser is a swappable adapter.
- **Report Cards** — monthly 10-file upload tracking store performance metrics. Batch upload drawer + empty-state CTA. Note: the P&L file is company-wide (Sharel only), a known limitation for per-store P&L accuracy.
- **Team / Auth** — email/password auth, RLS across all tables, roles (Admin, Payroll, Ops), Admin-only Team page, Settings password flow.

## Store number mapping
East Henrietta=1350, Canandaigua=2368, Penn Yan=2562, West Henrietta=3090, Waterloo=3481, Farmington=7066, Perinton=10413, Marketplace=11172, Manchester=18842, Ovid=25738, Winton=32511, Geneva=33555, Victor=34940. (Store #8955 was a bank-account suffix mistakenly entered as a store and has been deleted.)

## Conventions
- snake_case for all Supabase columns and tables
- UUID primary keys with default gen_random_uuid()
- Parsers are swappable adapters (not hardcoded entity logic). Prefer DB-driven mappings (entity detection, store names, bank accounts) over TypeScript constants so changes don't require code edits.
- Reference /support folder for additional context, specs, and reference docs

## Architectural principles
- **Disqualification beats penalty in matching**: for confirmed store-number mismatches in bank descriptions, return `-1` (disqualify) rather than a negative score — a penalized-but-positive score can still win.
- **Score bonuses must be decisively larger than any proximity advantage**: e.g., exact-amount-match bonus is +2000 so date-proximity scores can't overcome it.
- **Multi-section file parsing requires section-boundary logic**: files with multiple store sections (P&L) need explicit boundary handling or you get silent last-store-wins bugs from overwriting.

## Subtle-bug patterns to watch
- **Supabase one-to-one nested selects return an object, not an array**: e.g., `report_card_metrics(*)` returns a single object; accessing `[0]` silently returns `undefined` rather than throwing.
- **Silent error swallowing masks root causes**: `.catch(() => {})` in `useEffect` hides failures. Log before diagnosing missing data.
- **Schema drift**: live Supabase schemas can diverge from SQL definitions (e.g., INTEGER vs. NUMERIC). Diagnose with `information_schema.columns` filtered by `data_type`.

## Database guardrails
- Supabase MCP has full write access.
- Before any destructive SQL (ALTER, DROP, DELETE, TRUNCATE), show me the exact statement and wait for explicit approval.
- Read-only queries can run without asking.
- `list_tables` with `schemas: ['public'], verbose: true` returns full column + constraint details in one call — prefer it for schema inspection.

## Workflow
- Pull latest before starting: git pull
- Commit after each logical unit of work with a clear message
- Push when feature is complete
