# SUC Shared Data

This repository is the canonical source of truth for the SUC ecosystem.

Rules
- Store structured reality only; no UI or presentation logic.
- Canonical files live in their existing folders (events/, routes/, workouts/, etc.).
- Compiled artifacts live only in compiled/ and are generated via npm run build.
- Do not edit compiled/ by hand; regenerate instead.
- Do not delete or "clean up" historical data.
- Do not assume public visibility for any data.
- This repository grows forever by design.

Compile contract
- npm run build executes scripts/compile.js and overwrites compiled/ deterministically.
- Downstream tools (route viewer, broadcast) read only from compiled/.

Canonical calendar spine
- data/seasons.json, data/blocks.json, and data/weeks.json define the single source of truth for date -> workout resolution.
- Legacy season drafts/published files live under seasons/deprecated/ for reference only.
