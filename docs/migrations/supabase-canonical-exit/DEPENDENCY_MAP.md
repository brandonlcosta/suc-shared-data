# Phase 0 Dependency Map (To Be Filled From SQL Output)

Run `docs/migrations/supabase-canonical-exit/00_phase0_discovery.sql` against Supabase and populate:

## Canonical Tables
- routes:
- segments:
- events:
- event_routes:
- event_route_segments:
- event_series:
- route_pois:

## Foreign Key Dependencies
- Canonical -> user-domain:
- User-domain -> canonical:
- Canonical -> canonical:

## Indexes
- Table:
- Critical index:
- Drop-risk if renamed/locked:

## Triggers
- Table:
- Trigger:
- Purpose:

## RLS Policies
- Table:
- Policy:
- Access impact:

## Views Referencing Canonical
- View:
- Referenced canonical table:
- Replacement plan:

## RPC Functions Referencing Canonical
- Function signature:
- Referenced canonical table:
- Deprecation plan:

