# SUC Shared Data

This repository is the canonical source of truth for the SUC ecosystem.

Rules
- Store structured reality only; no UI or presentation logic.
- Canonical files live in their existing folders (events/, routes/, workouts/, etc.).
- Training content lives in training-content/, gear reviews in gear-reviews/, crew stories in crew-stories/.
- Leaderboard snapshots live in leaderboards/ and weekly recap inputs live in recaps/.
- Compiled artifacts live only in compiled/ and are generated via npm run build.
- Do not edit compiled/ by hand; regenerate instead.
- Do not delete or "clean up" historical data.
- Do not assume public visibility for any data.
- This repository grows forever by design.

Canonical training system (v2)
- Canonical training data is stored as one JSON file per entity in seasons/, blocks/, weeks/, and workouts/.
- Each entity is schema-validated via schemas/season.schema.json, schemas/block.schema.json, schemas/week.schema.json, and schemas/workout.schema.json.
- References are by ID only: season.blocks[] -> blocks/, block.weeks[] -> weeks/, week.workouts[] -> workouts/.
- Run `npm run validate:canonical` to validate schemas and ID references.
- Validation only targets files that include an `id` field; legacy or historical files in these folders are preserved but ignored by the validator.
- Training signals contract:
  - Week-level signals are required in week.schema.json: focus (string|null), stress (low/med/med-high/high), volume (low/low-med/med/med-high/high), intensity (low/med/high).
  - Block-level signals are optional in block.schema.json with the same enums and do not override week-level values.

Compile contract
- npm run build executes scripts/compile.js and overwrites compiled/ deterministically.
- Downstream tools (route viewer, broadcast) read only from compiled/.
- npm run export:media reads compiled/ and writes deterministic media placeholders to exports/.

Legacy calendar spine (historical)
- data/seasons.json, data/blocks.json, and data/weeks.json remain as historical references.
- Legacy season drafts/published files live under seasons/deprecated/ for reference only.
