## Status
- Operational
## Scope
- Canonical data layer (`suc-shared-data`)

# Validation Checklist

## Canonical Gate
- [ ] Entity validates against its schema.
- [ ] Required fields are present and typed correctly.
- [ ] Enum and format constraints pass.
- [ ] IDs are stable and unique where required.
- [ ] Cross-file references resolve.
- [ ] No derived/runtime presentation data is being stored canonically.

## Immutability Gate
- [ ] Change preserves append-only policy.
- [ ] Deprecated/archived markers used instead of deletion.
- [ ] Historical meaning remains reproducible.

## Cross-Repo Contract Gate
- [ ] `suc-studio` impact reviewed (authoring/validation).
- [ ] `suc-broadcast` impact reviewed (compile behavior).
- [ ] Viewer contract impact reviewed through broadcast outputs.

## Final Command
- [ ] `npm run validate:canonical`