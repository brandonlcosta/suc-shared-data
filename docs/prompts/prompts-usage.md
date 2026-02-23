## Status
- Operational
## Scope
- Canonical data layer (`suc-shared-data`)

# Cinematic Mode Prompt Usage

This repository keeps only the canonical-layer prompt.

## Canonical Prompt (kept here)
- `docs/prompts/cinematic-mode-canonical-layer-prompt.md`

## Relocated Prompt Packs
- Studio layer prompt:
  - `../suc-studio/docs/prompts/cinematic-mode-studio-layer-prompt.md`
- Broadcast layer prompt:
  - `../suc-broadcast/docs/prompts/cinematic-mode-broadcast-layer-prompt.md`
- Viewer layer prompt:
  - `../SUC-agents/agent-skills/cinematic-mode-prompts/cinematic-mode-viewer-layer-prompt.md`

## Separation Of Concerns
- Canonical layer defines schemas/entities/contracts.
- Studio layer authors and validates canonical intent.
- Broadcast layer compiles/renders deterministic outputs.
- Viewer layers consume compiled outputs only.