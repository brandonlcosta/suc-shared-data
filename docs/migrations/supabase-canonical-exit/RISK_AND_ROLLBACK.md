# Risk Assessment And Rollback Plan

## Key Risks
1. Hidden runtime dependencies on legacy canonical tables (views, RPCs, direct SQL clients).
2. Legacy relational joins may contain incomplete or inconsistent canonical references.
3. Existing event IDs/route IDs may not be normalized in a way downstream clients expect.
4. GPX variant data may not exist in relational rows and may require side-channel recovery.
5. Schema hardening (`additionalProperties: false`) can fail exports until mappings are adjusted.

## Controls Included
1. Phase 0 discovery map for FKs, indexes, triggers, RLS, views, and functions.
2. Freeze is non-destructive (rename + revoke write only; no drops).
3. Export does not write back to Supabase and preserves raw legacy payload snapshots.
4. Validation gate detects duplicates, orphaned references, and missing route/segment links.
5. Phase 6 lock is delayed until broadcast verification.

## Rollback Strategy
1. If freeze causes issues, run `docs/migrations/supabase-canonical-exit/01b_phase1_rollback_unfreeze.sql`.
2. If lock causes issues, run `docs/migrations/supabase-canonical-exit/06b_phase6_rollback_unlock.sql`.
3. Keep legacy tables intact until at least one full broadcast release cycle is stable.
4. Do not execute any drop migration until:
   - validation report is clean or accepted with known waivers,
   - broadcast endpoints are reading canonical JSON only,
   - no Phase 0 dependencies remain active.

