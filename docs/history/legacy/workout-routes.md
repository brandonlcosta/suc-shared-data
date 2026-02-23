## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

# Workout Routes

Workout Routes are route-based workouts where terrain sections are defined by workout POIs and effort is assigned per section.

## Section Structure
- Section boundaries come only from workout POIs in `routes/<routeId>/route.pois.json`.
- Section keys are derived in broadcast from workout POI order.
- Studio and viewers must never compute distances, durations, or section geometry.

## Effort Assignment
- Effort is semantic only (e.g., `tempo`, `threshold`).
- Effort lives on the workout in `workouts.master.json` as `sectionEfforts`.
- Viewers render effort without any inference or math.

## Common Mistakes To Avoid
- Do not change section length in Studio. Section length is determined by the route.
- Do not compute distance, elevation, or duration outside broadcast.
- Do not derive or edit geometry in Studio or viewers.
- Do not add smart defaults based on elevation.

If you are trying to change section length in the UI, you are in the wrong layer.

