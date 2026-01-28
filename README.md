# SUC Shared Data

This repository is the canonical source of truth for the SUC ecosystem.

Rules
- Store structured reality only; no UI or presentation logic.
- Do not compile, transform, or publish data from this repo.
- Do not delete or "clean up" historical data.
- Do not assume public visibility for any data.
- This repository grows forever by design.

Integration note
- Downstream tools may read and write here, but compilation happens elsewhere.
- This repo contains zero logic for those actions.