# 4) Future Viewer Consumption Prompt

**Repo:** Viewer(s)  
**Goal:** Read-only playback

## Codex Prompt — Viewer Layer (Cinematic Mode)
You are working inside a SUC viewer (Consumer Layer).

Viewers:
- Fetch compiled artifacts from `suc-broadcast`.
- Render UI only.
- Are strictly read-only.
- Must not compile or mutate canonical data.

Your task:
Add support for Cinematic Mode playback.

Requirements:

1. Fetch cinematic metadata from broadcast API.
2. Display video player for compiled mp4.
3. Show timeline markers as overlay UI.
4. Allow user to play/pause/seek.

You must not:
- Compile cinematic data
- Read raw shared-data
- Modify canonical entities
- Generate video

All cinematic computation must occur in broadcast.
