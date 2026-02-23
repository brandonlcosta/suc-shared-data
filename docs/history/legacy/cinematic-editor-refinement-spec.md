## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

# Cinematic Editor Refinement Spec

## Layer Ownership
- Layer: `suc-shared-data` (Canonical data contract + refinement guardrails)
- Applies to: single-route cinematic authoring plans only

## Purpose Of Refinement Phase
This phase defines a documentation contract for refining the Cinematic Route Editor into a map-first, timeline-driven authoring tool while preserving canonical data compatibility and deterministic compile behavior.

## Scope Boundaries (Single Route Only)
In scope:
- Single-route timeline authoring
- Spatial POI/title anchoring
- Segment and camera/speed authoring semantics
- Preview-ready deterministic timeline structure

Out of scope:
- Multi-route logic
- Multi-tier synchronized playback
- Cross-route comparisons
- Route divergence handling

## SUC-OS Invariants (Re-stated)
1. Author -> Publish -> Compile -> View only.
2. `suc-shared-data` is canonical source of truth.
3. Broadcast/viewers do not author canonical route-media.
4. Viewers do not compile cinematic outputs.
5. Broadcast compile remains stateless and rebuildable.
6. Canonical data is append-only; archive/deprecate instead of delete.
7. Canonical payloads must validate against versioned JSON schemas.
8. Repo boundaries remain layer-scoped.

## Responsibilities
- `suc-shared-data`:
  - Define canonical constraints and expectations for timeline/segment/POI semantics.
  - Preserve backward compatibility expectations for existing `route-media` payloads.
- `suc-studio`:
  - Author and validate data that conforms to canonical contract.
- `suc-broadcast`:
  - Compile deterministic outputs from canonical plan semantics.

## Canonical Constraints (No Schema Breakage)
- Refinement must not require breaking schema changes.
- Existing payloads remain valid and compilable.
- New authoring behavior should map to existing canonical fields where possible.
- Any additive field proposal must be optional and backward compatible.

## Timeline Data Model Expectations
- Timeline is an ordered list with stable identifiers.
- Ordering is deterministic by canonical sequence keys.
- Entries are anchored to single-route mileage/progress coordinates.
- Timeline entries may reference camera presets and speed overrides.

Example timeline entry (canonical expectation):
```json
{
  "entryId": "ent-012",
  "kind": "title",
  "mile": 6.2,
  "startSec": 128.0,
  "endSec": 133.0,
  "title": "Ridge Traverse",
  "subtitle": "Wind-exposed contour section"
}
```

## Segment Duration Rules
- Segment durations must be positive and finite.
- Segment `startMile` must be less than `endMile`.
- Segment `startSec` must be less than `endSec` when explicit timing is present.
- Segment-to-segment ordering must be monotonic in playback progression.
- Duration derivation must be deterministic from speed + distance when explicit seconds are absent.

Example segment entry:
```json
{
  "segmentId": "seg-004",
  "startMile": 6.2,
  "endMile": 7.0,
  "speed": {
    "mode": "override",
    "milesPerSecond": 0.035
  },
  "cameraPresetId": "cam-follow-medium"
}
```

## Shared POI Model
- POIs are canonical route anchors, not viewer-local artifacts.
- POIs bind to route progress (mile/coordinate context) and can carry display metadata.
- POIs are reusable anchor points for timeline entries.
- POI identity must be stable across authoring edits.

Example POI entry:
```json
{
  "poiId": "poi-aid-01",
  "mile": 8.15,
  "label": "Aid Station",
  "type": "aid",
  "description": "Water + gels",
  "lat": 37.8123,
  "lng": -122.4011
}
```

## Camera Preset Expectations
- Presets should be canonicalized by preset ID and explicit camera parameters.
- Preset usage must be deterministic at compile time.

Example camera preset:
```json
{
  "presetId": "cam-follow-medium",
  "mode": "follow",
  "followDistanceMeters": 38,
  "altitudeMeters": 24,
  "pitchDeg": 58,
  "headingOffsetDeg": 10
}
```

## Speed Override Expectations
- Speed overrides are segment-scoped and deterministic.
- If no override is set, playback defaults apply.

Example speed override:
```json
{
  "speedOverride": {
    "mode": "override",
    "milesPerSecond": 0.03,
    "reason": "technical descent pacing"
  }
}
```

## Determinism Guarantees
- Same canonical plan + same compile inputs => same timeline resolution.
- Stable ordering and anchor semantics across runs.
- No random or wall-clock dependent timeline mutation.

## Future Extensibility Notes
- Keep entry model modular (lane-friendly semantics without changing canonical route identity).
- Support additive metadata for richer editor UX while preserving existing compile behavior.
- Reserve future extensions for explicit later phases; this phase remains single-route only.

## Non-Goals
- Multi-route graph modeling.
- Synchronized multi-route playback.
- Cross-route comparison tooling.
- Route divergence/merge authoring.
- Tier-based narration variants.

## Phase 0–3 Baseline
The following capabilities are frozen and must remain stable for Phase 4:
- Elevation backbone in the timeline (waveform + snap anchors).
- Multi-lane timeline (`title`, `poi`, `camera`, `speed`) with per-lane overlap enforcement.
- Real-time preview (play/pause/seek/step) with camera interpolation and overlays.
- Deterministic canonical output (stable ordering + validation invariants).
- Single-route constraint (no multi-route or tier-aware logic).

