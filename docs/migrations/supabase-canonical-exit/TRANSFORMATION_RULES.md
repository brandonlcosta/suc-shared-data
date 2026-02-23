# Phase 2 Transformation Logic

## Source To Target Mapping

1. `_legacy_routes` -> `routes/{routeId}/route.meta.json`
- `route_id`: `route_group_id | route_id | id | slug | code` (first present)
- `name`: `name | route_name | title`
- `variants`: `variants | variant_codes` (array or CSV)
- `segment_ids`: inferred from `_legacy_segments`
- `source_legacy`: original row minus user/audit columns

2. `_legacy_route_pois` -> `routes/{routeId}/route.pois.json`
- grouped by `route_group_id | route_id`
- each POI:
  - `id`: `poi_id | id | slug`
  - `title`: `title | name | label`
  - `type`: `type | poi_type`
  - `source_legacy`: original row minus user/audit columns

3. `_legacy_segments` -> `segments/{segmentId}.json`
- `segment_id`: `segment_id | id | slug | code`
- `route_id`: `route_group_id | route_id`
- `name`: `name | segment_name | title`
- `segment_type`: `segment_type | type`
- `source_legacy`: original row minus user/audit columns

4. `_legacy_events` + `_legacy_event_routes` + `_legacy_event_route_segments` -> `events/{eventId}.json`
- `event_id`: `event_id | id | slug | code`
- `route_group_ids[]`: from `_legacy_event_routes` (`route_group_id | route_id`)
- `segment_ids[]`: via `_legacy_event_route_segments` join on `event_route_id`
- `source_legacy`: event row minus user/audit columns

## Cross-Cutting Rules
1. IDs are normalized to stable strings.
2. UUIDs are preserved as strings; numeric IDs get deterministic prefixed string form.
3. User-specific/audit fields are stripped:
- `created_at`, `updated_at`, `deleted_at`
- `created_by`, `updated_by`
- `owner_id`, `user_id`, `author_id`, `editor_id`
4. Canonical lifecycle metadata is appended:
- `schema_version`
- `lifecycle.state`
- `lifecycle.appended_at`
- `lifecycle.source`
5. Export is local-file only; no Supabase writes.

