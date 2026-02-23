## Status
- Operational
## Scope
- Canonical data layer (`suc-shared-data`)

# Contributor Workflow

## Standard Change Flow
1. Confirm scope is canonical-layer work.
2. Update schemas/entities/docs in `suc-shared-data`.
3. Run validation (`npm run validate:canonical`).
4. Document any cross-repo contract impact.
5. Submit with explicit migration notes when schema contracts change.

## Schema Change Flow
1. Prefer additive schema changes.
2. Record contract rationale in governance docs.
3. Coordinate required downstream updates (`suc-studio`, `suc-broadcast`, viewers).
4. Avoid breaking changes without migration plan.

## Deprecation Flow
1. Mark canonical entities deprecated/archived.
2. Keep references and history auditable.
3. Do not delete canonical records to remove old behavior.

## Prohibited Workflow Shortcuts
- Writing compile/presentation logic into canonical entities.
- Manual edits to compiled artifacts in place of canonical fixes.
- Reverse writes from pipeline/viewers into canonical data.