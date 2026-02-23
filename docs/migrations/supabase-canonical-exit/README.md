# Supabase Canonical Exit Migration Kit

This kit provides phased artifacts to move canonical truth out of Supabase and into `suc-shared-data` while preserving reversibility and auditability.

## Scope Assumptions
- Canonical layer only; no user-domain table mutation.
- One-way flow remains: `Studio -> Shared Data -> Broadcast -> Viewers`.
- Legacy Supabase canonical tables are frozen first, then exported, then access is removed.

## Agent Consultation Notes
- `/agent data-arch`: model shape remains canonical-first, user fields stripped, deterministic references.
- `/agent schema-guard`: schemas are versioned, strict by default, append-only lifecycle supported, no silent contract drift.

## Run Order
1. Phase 0: `docs/migrations/supabase-canonical-exit/00_phase0_discovery.sql`
2. Phase 1: `docs/migrations/supabase-canonical-exit/01_phase1_freeze_legacy_canonical.sql`
3. Phase 2: `node scripts/migrations/export-legacy-canonical.js`
4. Phase 3: schemas in `schemas/`
5. Phase 4: `node scripts/migrations/validate-legacy-export.js`
6. Phase 5: broadcast stubs in `docs/migrations/supabase-canonical-exit/suc-broadcast-stubs/`
7. Phase 6: `docs/migrations/supabase-canonical-exit/06_phase6_lock_legacy_canonical.sql`

## Output Paths
- Canonical export root: `migration-output/canonical-export/`
- Validation report: `migration-output/migration-report.json`

