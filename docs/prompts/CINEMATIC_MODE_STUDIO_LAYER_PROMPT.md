# 2) Studio Media Builder Prompt

**Repo:** `suc-studio`  
**Goal:** Authoring UI + Validation + Publish

## Codex Prompt — Studio Authoring Layer (Cinematic Mode)
You are working inside `suc-studio` (Authoring Layer).

This repo:
- Authors canonical data.
- Validates against schemas from `suc-shared-data`.
- Publishes via git commit.
- Does NOT compile or render media.

Platform invariants:
- No compilation logic here.
- No ffmpeg.
- No video rendering.
- All JSON must validate before publish.
- All writes go to `suc-shared-data` only.

Your task:
Implement the Cinematic Media Builder UI for `route-media` entities.

Requirements:

1. Add a new Media Builder screen:
   - Select canonical route
   - Set speed (miles per second)
   - Choose camera mode
   - Add/edit/delete timeline entries

2. Timeline Editor:
   - Mile-based positioning
   - Drag-and-drop reorder
   - Title/subtitle entry
   - Real-time schema validation

3. Validation:
   - Use `route-media.schema.json` from `suc-shared-data`
   - Block publish if invalid
   - Display field-level validation errors

4. Publish flow:
   - Write canonical JSON to: `suc-shared-data/route-media/{id}.json`
   - Commit with descriptive message
   - Preserve append-only semantics

5. No rendering preview beyond lightweight visual simulation.
   (No actual video generation.)

6. Add `docs/CINEMATIC_MODE.md`

Document:
- Studio responsibilities
- What Studio must not do
- Link to canonical spec

You must not:
- Write to `suc-broadcast`
- Generate `mp4`
- Store derived data
- Store compilation state

When complete:
- Output changed file list
- Confirm validation works
- Confirm publish writes canonical JSON only
