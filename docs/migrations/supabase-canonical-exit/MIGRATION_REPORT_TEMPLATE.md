# Legacy Canonical Exit - Migration Report Template

## Metadata
- Run timestamp (UTC):
- Operator:
- Supabase project ref:
- Export commit SHA:

## Phase 0 Discovery Summary
- Canonical tables found:
- FK dependencies (canonical -> user / user -> canonical):
- Views referencing canonical tables:
- RPC functions referencing canonical tables:
- Triggers/RLS on canonical tables:

## Phase 1 Freeze Summary
- Renamed tables:
- Write revocations applied:
- `_migration_log` entry id(s):
- Any anomalies:

## Phase 2 Export Summary
- `_legacy_routes` rows:
- `_legacy_segments` rows:
- `_legacy_events` rows:
- `_legacy_event_routes` rows:
- `_legacy_event_route_segments` rows:
- `_legacy_route_pois` rows:
- Output files generated:

## Phase 3 Schema Summary
- Schemas used:
- Schema versions:
- Additional properties policy:

## Phase 4 Validation Summary
- Total errors:
- Total warnings:
- Duplicate IDs:
- Orphaned routes:
- Orphaned segments:
- Events referencing missing routes:
- Inconsistent relationships:

## Phase 5 Broadcast Prep
- Loader stubs reviewed:
- Endpoint contract stubs reviewed:
- Open integration tasks:

## Phase 6 Lock Summary
- SELECT revoked from service role:
- RPC access blocks applied:
- Deprecation view deployed:
- Tables marked for future drop:

## Risks
- Canonical completeness gaps:
- Dependency blind spots:
- Runtime consumers still on legacy tables:

## Rollback Notes
- Freeze rollback script prepared:
- Lock rollback script prepared:
- Data restoration needed? (should be no):

