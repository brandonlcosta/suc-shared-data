# 3) Broadcast Renderer Prompt

**Repo:** `suc-broadcast`  
**Goal:** Deterministic cinematic renderer

## Codex Prompt — Broadcast Pipeline Layer (Cinematic Mode)
You are working inside `suc-broadcast` (Pipeline Layer).

This repo:
- Reads canonical data from `suc-shared-data`.
- Compiles derived artifacts.
- Must remain stateless.
- Can be fully rebuilt from canonical data.

Platform invariants:
- No canonical writes.
- No stateful databases.
- Same input -> same output.
- No authoring behavior.
- All outputs are ephemeral.

Your task:
Implement Cinematic Mode rendering.

Requirements:

1. Create renderer module: `renderers/cinematic/`

2. Renderer pipeline:
   - Load canonical route
   - Load canonical route-media plan
   - Interpolate GPX
   - Simulate third-person follow camera
   - Generate frames (headless Chrome or canvas)
   - Pipe frames to ffmpeg
   - Output mp4 to: `dist/media/{routeMediaId}.mp4`

3. Determinism:
   - Output must be identical for identical canonical inputs.
   - No runtime randomness.
   - No external time-based variation.

4. CLI command:
   - `npm run render:cinematic -- --id ws100-cinematic-v1`

5. Add `docs/CINEMATIC_MODE.md`

Document:
- Renderer contract
- Stateless guarantees
- Prohibition of canonical writes
- Determinism expectations

6. Optional:
   Implement Google Drive upload as a post-render step.
   This must not:
   - Store Drive IDs canonically
   - Persist state
   - Modify shared-data

You must not:
- Write back to `suc-shared-data`
- Store render history
- Add persistent database
- Add viewer logic

When complete:
- Output file list
- Confirm stateless behavior
- Confirm full rebuild from canonical works
