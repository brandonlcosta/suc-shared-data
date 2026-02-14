# Cinematic Mode Specification

## Purpose

Cinematic Mode defines a canonical `route-media` entity used to generate long-form route flyover media with authored timeline events, camera behavior, subtitles, and POI/title markers.

This spec is authoritative for all SUC-OS repos.

## Canonical Schema

- Schema file: `schemas/route-media.schema.json`
- Entity type: `route-media`
- Contract version: `schemaVersion: "1.0.0"` (semantic version)
- Example payload: `route-media/SUC-036-MEDIA.json`

## Data Flow

Unidirectional flow is mandatory:

1. Author in `suc-studio`
2. Publish canonical `route-media` JSON to `suc-shared-data/route-media/*.json`
3. Compile and render in `suc-broadcast`
4. Consume compiled media assets in viewers

No reverse writes are allowed from broadcast or viewers back into canonical data.

## Entity Model (`route-media`)

Core fields:

- Identity and routing: `id`, `eventId`, `routeId`, optional `distanceVariantId`
- Versioning and lifecycle: `schemaVersion`, `status`, `publish`, `createdAt`, `updatedAt`
- Playback: `playback.milesPerSecond`, `playback.fps`, `playback.holdSeconds`, `playback.outputFormat`
- Camera defaults: `camera.mode`, `followDistanceMeters`, `altitudeMeters`, `pitchDeg`, `headingOffsetDeg`
- Timeline plan: ordered `timeline[]` segments with mileage bounds and optional speed/camera overrides
- Subtitles: `subtitles[]` with `startSec` / `endSec` windows
- Markers: `markers[]` with mileage anchors and POI/title metadata

## Platform Invariants

This feature must preserve the platform invariants:

1. Author -> Publish -> Compile -> View only.
2. `suc-shared-data` is canonical truth.
3. No canonical authoring storage in broadcast/viewers.
4. No compilation/transformation in viewers.
5. Broadcast compile/render remains stateless and rebuildable.
6. Canonical data is append-only; archive/deprecate instead of delete.
7. Canonical payloads must validate against versioned JSON schemas.
8. Repo boundaries remain layer-scoped.

## Responsibilities by Layer

- `suc-studio`:
  - Provide authoring UI for timeline, subtitles, markers, speed, and camera selection.
  - Validate payloads against this canonical schema.
  - Publish canonical JSON only.

- `suc-broadcast`:
  - Read canonical `route-media` plans.
  - Resolve route geometry.
  - Interpolate route position over timeline/playback speed.
  - Apply third-person follow camera simulation and overlays.
  - Render frames and encode media artifacts.
  - Write artifacts to build output only (no canonical writes).

- Viewer repos:
  - Read compiled media artifacts/metadata only.
  - No authoring logic, no canonical mutations, no compile logic.

## Non-Goals (V1)

- Viewer-side cinematic compilation.
- Authoring canonical data in broadcast.
- Bidirectional edits from viewers to canonical sources.
- Auto-migration of older schema versions without explicit migration tooling.
