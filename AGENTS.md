# In-Repo Agents - suc-shared-data

This repo defines in-repo sub-agents under `.agents/` for canonical data governance.

## Available Agents
- `/agent schema-guard`
  Consult for schema evolution, validation invariants, immutability, and reference integrity.
- `/agent data-arch`
  Consult for canonical modeling, entity relationships, and version strategy.

## Invocation Protocol
When invoking a repo-aware agent:
- Prefix the request with `/agent <name>`.
- Use one of the available names listed above.
- The agent must load `.agents/<name>.md` and follow it as its local instruction set.

## Authority
All in-repo agents must obey:
- `suc-shared-data/AI.md`
- `SUC-agents/canon/*`

If instructions conflict, `AI.md` and canon override agent instructions.

## Agent Playbook
- Schema changes, validation gate changes, immutability safeguards, and reference integrity updates:
  consult `/agent schema-guard`.
- Canonical model shape, relationship design, and entity lifecycle/version strategy changes:
  consult `/agent data-arch`.
- Mixed domain-model + schema changes:
  consult `/agent data-arch` first, then `/agent schema-guard` before implementation.
- Keep all recommendations constrained by `AI.md` and `SUC-agents/canon/*`.

## Pre-Change Ritual
- Confirm the request is in canonical-layer scope per `AI.md`.
- Re-read the relevant invariants in `AI.md` and platform canon in `SUC-agents/canon/*`.
- Consult the appropriate agent(s) from this file before implementation.
- Document canonical input assumptions and downstream contract impact (`suc-studio`, `suc-broadcast`, viewers) before implementation.

## Minimal Agent Invocation Template
```text
/agent <name>
Context:

What I'm changing:

Why:

What I think might break:

Diff / design notes:
```

## Non-Goals
This file does not define agent role internals (see `.agents/*.md`), platform doctrine (see canon/`AI.md`), or runtime/tool-specific configuration.
