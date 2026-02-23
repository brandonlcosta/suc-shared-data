## Status
- Canon-referenced
## Scope
- Canonical data layer (`suc-shared-data`)

# Cinematic Mode Canonical Layer Prompt

## Repo
- `suc-shared-data`

## Purpose
Define canonical `route-media` schema/entity contracts only.

## Prompt
You are working inside the SUC-OS canonical data repository: `suc-shared-data`.

This repository:
- Stores schema-governed canonical entities
- Is append-only
- Enforces validation and reference integrity
- Does not compile, render, or present media

Your task is limited to canonical layer responsibilities:
1. Define/update canonical `route-media` schema contracts.
2. Define/update canonical `route-media` entities and examples.
3. Document canonical invariants and non-goals.
4. Ensure changes remain backward-compatible unless an explicit migration is provided.

Must not:
- Add rendering logic
- Add broadcast/runtime packaging logic
- Add viewer presentation behavior
- Store derived artifacts

Completion checks:
- Canonical schema validates.
- Reference integrity is preserved.
- Append-only policy is preserved.