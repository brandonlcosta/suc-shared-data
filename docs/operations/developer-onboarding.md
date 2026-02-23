## Status
- Operational
## Scope
- Canonical data layer (`suc-shared-data`)

# Developer Onboarding

## Prerequisites
- Node.js and npm installed
- Git installed
- Sibling repos available: `suc-studio`, `suc-broadcast`, `SUC-agents`

## Local Setup
1. `npm install`
2. Run canonical validation: `npm run validate:canonical`
3. (Optional) run deterministic compile check: `npm run build`

## Working Model
- Author content in `suc-studio`.
- Treat `suc-shared-data` as canonical contract storage.
- Do not hand-edit compiled artifacts as a substitute for canonical fixes.

## First Read
- `AI.md`
- `docs/governance/data-contract.md`
- `docs/governance/validation-invariants.md`
- `../SUC-agents/canon/01_SYSTEM_MAP.md`