# SUC Shared Data

`suc-shared-data` is the SUC-OS canonical data layer and source of truth for schema-governed entities.

## Role In SUC-OS
- Layer: Canonical truth
- Upstream: `suc-studio` (authoring intent)
- Downstream: `suc-broadcast` (deterministic compile) and viewers (runtime projections)
- One-way flow: `Studio -> Shared Data -> Broadcast -> Viewers`

## Governance
- Repo guardrails: `AI.md`
- In-repo agents: `AGENTS.md`
- Canon authority: `../suc-agents/canon/`

## Key Living Governance Docs
- `docs/governance/data-contract.md`
- `docs/governance/immutability.md`
- `docs/governance/validation-invariants.md`
- `docs/governance/workout-versioning.md`

## Operations And History
- Operational docs: `docs/operations/`
- Prompt operations: `docs/prompts/`
- Historical archive: `docs/history/`

## Validation
- Canonical validation: `npm run validate:canonical`
