# 1) Canonical Schema & Spec Prompt

**Repo:** `suc-shared-data`  
**Goal:** Define canonical entity + authoritative spec

## Codex Prompt — Canonical Data Layer (Cinematic Mode)
You are working inside the SUC-OS Data Layer repository: `suc-shared-data`.

This repository is the canonical source of truth. It:
- Stores versioned JSON entities.
- Owns all schemas.
- Is append-only.
- Does not compile, render, or serve APIs.

Platform invariants:
1. All canonical data must be schema validated.
2. No rendering logic is allowed here.
3. No derived artifacts are stored here.
4. No deletion, only deprecation.
5. This repo defines contracts consumed by downstream systems.

Your task is to implement Cinematic Mode as a canonical entity.

Requirements:

1. Create a new entity type: `route-media`.
2. Create a versioned schema: `schemas/route-media.schema.json`.
3. The schema must include:
   - `id` (string)
   - `routeId` (string, reference to canonical route)
   - `type` (enum: `"cinematic"`)
   - `version` (semantic version string)
   - `config`:
     - `speedMilesPerSecond` (number, min `0.1`)
     - `cameraMode` (enum, initially: `"third-person-follow"`)
     - optional camera tuning fields
   - `timeline` (array of entries):
     - `mile` (number, >= `0`)
     - `type` (enum: `"title"`, `"subtitle"`, `"marker"`)
     - `text` (string)
   - `createdAt`
   - `updatedAt`
   - optional `deprecated` flag
4. Ensure schema is backward-compatible and additive.
5. Add example canonical JSON in: `route-media/examples/ws100-cinematic-v1.json`.
6. Create documentation: `docs/CINEMATIC_MODE_SPEC.md`.

The spec must include:
- Purpose
- Data model definition
- Schema versioning strategy
- Data flow across layers
- Explicit non-goals (no rendering logic here)
- Determinism guarantees
- Multi-tenant future considerations

You must not:
- Add rendering logic
- Add ffmpeg references
- Add broadcast-specific implementation details

When complete:
- Output a list of new files
- Confirm schema validates via `npm run validate`
- Confirm append-only integrity is preserved
