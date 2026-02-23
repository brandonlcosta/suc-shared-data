## Status
- Living repo contract
## Scope
- Canonical data layer (`suc-shared-data`)

# AI Guardrails: SUC Shared Data

## Role
`suc-shared-data` owns canonical schemas and canonical entities for SUC-OS.

## Allowed
- Define and evolve canonical schemas with explicit versioning discipline.
- Store canonical JSON/GPX entities as source of truth.
- Enforce schema validation and cross-entity reference integrity.
- Preserve immutable published history using append-only lifecycle patterns.

## Not Allowed
- Compile canonical inputs into runtime artifacts.
- Render media, UI payloads, or presentation projections.
- Store viewer/pipeline outputs as canonical truth.
- Introduce ad-hoc schema forks outside canonical contracts.

## Invariants
1. One-way flow only: `Studio -> Shared Data -> Broadcast -> Viewers`.
2. Canonical entities must validate against canonical schemas.
3. Reference integrity is mandatory.
4. Canonical history is append-only by policy.
5. Downstream compile and viewer layers treat canonical data as read-only input.

## Escalation Rules
Escalate for coordinated cross-repo review when changes affect:
- Schema contracts consumed by `suc-studio` authoring workflows.
- Compile assumptions in `suc-broadcast`.
- Compiled contract expectations used by viewer repos.

Any breaking schema change requires explicit migration documentation and rollout sequencing.

## Change Definition Of Done
Before considering a canonical-layer change complete, all answers must be yes:
- Does the change stay within canonical scope in this `AI.md` (no compile/render/presentation leakage)?
- Does it preserve one-way flow and platform doctrine in `SUC-agents/canon/*`?
- Do canonical entities still satisfy schema validation and reference integrity invariants?
- Is append-only history/immutability preserved for published records?
- Were downstream contract impacts and breaking-change migrations explicitly documented when needed?
