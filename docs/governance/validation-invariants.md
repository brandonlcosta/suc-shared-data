## Status
- Living repo contract
## Scope
- Canonical data layer (`suc-shared-data`)

# Validation Invariants

## Required At All Times
- Schema validity for each canonical entity.
- Cross-entity reference integrity.
- Stable identity and uniqueness constraints.
- Contract-safe enums and value domains.

Validation gates must fail fast on violations.
