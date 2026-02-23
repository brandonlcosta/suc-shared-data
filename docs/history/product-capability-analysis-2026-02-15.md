## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

# SUC-OS PRODUCT CAPABILITY DEEP DIVE

**Date:** 2026-02-15
**Scope:** Reverse-engineering existing architecture → translating to product capabilities → identifying leverage points

---

## 1️⃣ SYSTEM MECHANICS → PRODUCT CAPABILITY MAP

### **Layer: suc-studio (Authoring)**

| Mechanical Function | Product Capability | Constraint | Creative Leverage |
|---------------------|-------------------|------------|------------------|
| **Writes validated JSON to canonical store** | Structured authoring with guardrails | Only schema-approved structures | Deterministic content composition |
| **8 specialized builders + 1 advanced cinematic editor** | Multi-domain content creation (workouts, routes, events, media) | Each builder scope-limited to one entity type | Parallel content creation across domains |
| **Multi-tier workout system** (MED/LRG/XL/XXL) | Single-intent workouts with volume/intensity progressions | Tiers independent (no auto-sync) | One design → four delivery variants |
| **Cinematic timeline editor** (4-lane system: title/POI/camera/speed) | Frame-accurate media planning with collision detection | Browser-only preview (no FFmpeg) | Deterministic timeline → reproducible renders |
| **GPX import + route variant labeling** | Automatic distance-based categorization | Labels fixed to 4 tiers | Instant route family creation from GPX drops |
| **Season → Block → Week hierarchy** | Time/intent planning separate from execution | Weeks always Monday-Sunday | Calendar-first training philosophy |
| **Explicit save only** (no autosave) | Deliberate publishing workflow | Risk of lost work | Clean draft/published separation |
| **AJV schema validation** | Prevents malformed data at authoring | "Garbage in, garbage saved" (no validation IN builder) | Downstream systems can trust structure |
| **Route Intel POI selector** | Race section definition with variant-specific placement | POIs must exist in route.pois.json first | One route → multiple event-specific narratives |
| **Consent management in roster** | Legal compliance for public content | Per-member consent flags required | Safe storytelling/metrics publishing |

**Product Translation:**
- Studio = **Content Authoring Control Plane**
- Enables: Workout programming, route cataloging, event planning, race strategy authoring, cinematic media planning
- Does NOT: Render, compile, publish to viewers (single responsibility)

---

### **Layer: suc-shared-data (Canonical Truth)**

| Mechanical Function | Product Capability | Constraint | Creative Leverage |
|---------------------|-------------------|------------|------------------|
| **Append-only JSON file storage** | Complete audit trail via Git | Cannot delete (only archive) | Time-travel debugging + rollback |
| **Reference integrity** (season→blocks→weeks→workouts) | Hierarchical training system | IDs immutable once created | Stable URLs, no broken links |
| **Schema-driven contracts** (14 entity types) | Deterministic compilation | New fields require schema updates | Type-safe downstream consumption |
| **Route variants with POI annotations** | Distance-specific race intel | POIs must be manually placed per variant | One route group → 4 race plans (MED/LRG/XL/XXL) |
| **Training signals** (stress/volume/intensity) | Structured periodization metadata | Enums fixed (low/med/high) | Queryable training load |
| **Event-route linking via route_group_ids** | Reusable route library | Routes exist independently of events | One route → many events over time |
| **Consent flags per roster member** | Privacy-first publishing | Boolean only (no granular permissions) | Safe default: deny unless explicit consent |
| **ISO-8601 timestamps** | Deterministic chronology | Timezone-naive (assumes UTC) | Sortable, queryable history |
| **Validation on save** | Data integrity at rest | No late validation (fails at authoring) | Downstream never sees bad data |
| **GPX + GeoJSON dual storage** | Native GPS + web-optimized formats | GPX is source of truth | Compatible with Garmin, Strava, web viewers |

**Product Translation:**
- Shared-Data = **Canonical Source of Truth + Audit Log**
- Enables: Version control, deterministic rebuilds, reference integrity, privacy compliance
- Guarantees: No data loss, reproducible compilation, type-safe contracts

---

### **Layer: suc-broadcast (Compilation)**

| Mechanical Function | Product Capability | Constraint | Creative Leverage |
|---------------------|-------------------|------------|------------------|
| **2-tier pipeline** (viewer build + media export) | Dual output: structured data + social media assets | Must run both to get full artifact set | Decoupled: data ≠ media |
| **Stateless transformation** | Idempotent rebuilds (same input → same output) | No incremental compilation | Cache-friendly, safe to re-run |
| **10-step viewer build** (routes, events, workouts, calendar, etc.) | Optimized JSON for viewer consumption | Output schema separate from canonical | Viewer complexity hidden from authoring |
| **Media export pipeline** (posters, carousels, animations) | Social-ready assets on-demand | Requires route intel for some outputs | One route → 10+ export variants |
| **Content presets** (route-intel, event-poster, weekly-schedule) | Composable export options | Presets hardcoded (not user-configurable) | Template-driven asset generation |
| **Social media formats** (square/story/landscape) | Platform-optimized outputs | Aspect ratios fixed | One design → 3 platform variants |
| **Elevation chart SVG generation** | Terrain visualization | SVG only (no raster/Canvas) | Lightweight, scalable graphics |
| **Deterministic content hashing** | Skip re-render if unchanged | Hash collision risk (low) | Efficient render queue |
| **Google Drive distribution** | Automatic upload to team drives | Requires OAuth credentials | One-click publish to distribution |
| **Composer UI** (React-based broadcast editor) | Preview + validate before publish | Browser-only (no CLI mode) | Real-time dry-run compilation |

**Product Translation:**
- Broadcast = **Compilation + Distribution Engine**
- Enables: Viewer-optimized data, social media factory, newsletter composition, render queue management
- Output Types: JSON artifacts (viewers), PNG/JPG (social), MP4 (animations), ZIP (packages)

---

### **Layer: Viewers (Consumption)**

#### **suc-route-viewer**

| Mechanical Function | Product Capability | Constraint | Creative Leverage |
|---------------------|-------------------|------------|------------------|
| **MapLibre 3D terrain rendering** | Interactive route exploration | Requires style JSON + tile source | Beautiful isometric route views |
| **POI multi-layer system** (surfaces/icons/beams/hit-zones) | Rich POI interaction model | Max 5 POIs at same location | Stacked markers for dense POI clusters |
| **Playback simulation** (animated dot + ETA) | Virtual race pacing tool | No real GPS replay (synthetic only) | Pre-visualize race execution |
| **Live GPS tracking** | Real-time position on map during race | Requires geolocation permission | Turn phone into race tracker |
| **Calendar strip** | Event discovery + workout context | Horizontal scroll only | See upcoming events with distance variants |
| **Elevation profile** (Chart.js) | Terrain analysis | Static chart (no zoom/pan) | Identify climbs + descents visually |
| **Route Intel sections** | Turn-by-turn race narrative | Requires route-intel artifact from broadcast | Section-level pacing strategy |
| **Read-only consumption** | Zero risk of data corruption | No editing, commenting, or annotations | Users can't break data |

**Product Translation:**
- Route Viewer = **Event Route Explorer + Race Day Tool**
- Use Cases: Event discovery, route preview, live race tracking, post-race analysis
- Dependencies: events.json, routes.json, route-intel (optional)

#### **suc-workout-viewer**

| Mechanical Function | Product Capability | Constraint | Creative Leverage |
|---------------------|-------------------|------------|------------------|
| **Workout chart SVG** (interval visualization) | Visual workout structure | Requires duration parsing ("10 min" → 600s) | See workout complexity at a glance |
| **Tier filtering** (MED/LRG/XL/XXL tabs) | Personalized workout prescription | Tier definitions hardcoded | Same workout → 4 intensity levels |
| **Route Intel map** (custom SVG projection) | Embedded route context for workouts | No interactive map (static projection) | Lightweight, no tile dependencies |
| **Calendar navigation** (Today/Upcoming/Plan) | Training schedule consumption | No workout logging or completion tracking | See what's programmed, not what's done |
| **Route Intel sections** | Race strategy linked to workouts | Requires route-intel artifact | Workout context: "This is for SUC-036 XL" |
| **Legacy URL support** | Stable bookmarks across versions | Old URL structure must be maintained | No broken links from historical shares |

**Product Translation:**
- Workout Viewer = **Training Calendar + Workout Prescription Tool**
- Use Cases: Daily workout lookup, tier selection, race prep (route intel)
- Dependencies: calendar.json, workouts.json, route-intel (optional)

---

## 2️⃣ PIPELINE CAPABILITY ANALYSIS

### **What Inputs Each Stage Accepts**

| Stage | Inputs Accepted | Validation |
|-------|----------------|------------|
| **Studio** | User interactions (clicks, text, GPX drops) | AJV schema on save |
| **Shared-Data** | Studio-written JSON, manual Git commits | npm run validate:canonical |
| **Broadcast Viewer Build** | events.master.json, workouts.master.json, routes/*.json, route-intel/*.json | Schema validation in compile steps |
| **Broadcast Media Export** | Route stats, POI data, event metadata, content presets | Preflight checks (missing routes, invalid variants) |
| **Route Viewer** | routes.json, events.json, route-intel/{id}.json | Runtime type checks, optional artifact fallback |
| **Workout Viewer** | calendar.json, route-intel index/docs | Runtime validation, graceful degradation |

### **What Outputs Each Stage Produces**

| Stage | Outputs | Format | Consumers |
|-------|---------|--------|-----------|
| **Studio** | Canonical JSON files | JSON (validated) | Shared-Data Git repo |
| **Shared-Data** | Validated canonical files + compiled routes | JSON + GeoJSON + GPX | Broadcast pipeline |
| **Broadcast Viewer Build** | Viewer-optimized JSON artifacts | JSON | Route Viewer, Workout Viewer |
| **Broadcast Media Export** | Social media assets | PNG, JPG, MP4, ZIP | Google Drive, local filesystem |
| **Route Viewer** | Interactive map UI | HTML + Canvas + WebGL | End-user browsers |
| **Workout Viewer** | Workout calendar UI | HTML + SVG | End-user browsers |

### **Transformations at Each Stage**

#### **Studio → Shared-Data**
```
User Actions → Draft State → Validate → Canonical JSON
```
- Tier structure flattened into variant records
- Timestamps added (createdAt, updatedAt, publishedAt)
- IDs generated (stable, collision-resistant)
- POI placements snapped to GPX polyline

#### **Shared-Data → Broadcast**
```
Canonical JSON → Parse → Enrich → Project → Compile
```
- GPX → distance/elevation series (Haversine + interpolation)
- POI placement → GeoJSON features
- Route variants → joined with event/workout refs
- Season/Block/Week → flattened calendar.json
- Route Intel → section-level elevation gain calculations

#### **Broadcast → Viewers**
```
Compiled JSON → HTTP GET → Parse → Render
```
- JSON deserialized into TypeScript types
- GeoJSON → MapLibre layers
- Distance/elevation series → Chart.js datasets
- POI data → stacked markers with importance ordering

#### **Broadcast → Social Media**
```
Route/Event Data → Template → SVG/Canvas → PNG/MP4
```
- Route stats → elevation chart SVG
- POI list → HTML list → Canvas render
- Timeline entries → cinematic camera keyframes → animation frames → FFmpeg encoding

### **Baked-In Assumptions**

| Assumption | Location | Impact |
|-----------|----------|--------|
| **Weeks are Monday-Sunday** | Studio season-builder, calendar compiler | Cannot model non-standard weeks |
| **4 tiers only** (MED/LRG/XL/XXL) | Throughout all systems | Cannot add MICRO or ULTRA tiers without refactor |
| **POIs belong to routes, not events** | Route Manager, POI annotations | Event-specific POIs require route duplication |
| **Route Intel requires route + event** | Route Intel builder, compile pipeline | Cannot create standalone race strategy docs |
| **Consent is boolean** | Roster schema | No "consent for photos but not metrics" granularity |
| **Viewer artifacts regenerated fully** | Broadcast viewer build | No incremental compilation (slow for large datasets) |
| **Social media formats are fixed** | Media export templates | Custom aspect ratios require code changes |
| **Training signals are enums** | Season/block/week schemas | Cannot model arbitrary load metrics (e.g., TSS) |
| **Viewers are web-only** | React apps | No native mobile apps (yet) |
| **Cinematic timeline is browser-preview only** | Studio route-media builder | No server-side FFmpeg render from Studio |

---

### **What New Outputs Could This Pipeline Produce?**

#### **PDF Exports** ✅ **HIGH LEVERAGE**
- **Input:** calendar.json + workouts.json + route-intel
- **Transform:** HTML template → Puppeteer → PDF
- **Output:** Printable training plan PDF (week-by-week)
- **Use Case:** Physical binder for coach, offline access
- **Friction:** Puppeteer setup, template design
- **Leverage:** Reuse existing data contracts, no new authoring

#### **Training Simulations** ✅ **HIGH LEVERAGE**
- **Input:** Workout intervals + HR zones + fitness model
- **Transform:** Workout structure → physiological simulation → predicted HR/pace curves
- **Output:** Simulated workout execution graph
- **Use Case:** "What will my HR look like if I run this workout at Z3 pace?"
- **Friction:** Requires fitness model (ATL/CTL), HR zone definitions
- **Leverage:** Multi-tier workouts already structured for simulation

#### **Narrative Scripts** ✅ **MEDIUM LEVERAGE**
- **Input:** Route Intel sections + POI notes + event description
- **Transform:** Section-by-section narrative → LLM prompt → race script
- **Output:** Turn-by-turn race commentary (text or audio)
- **Use Case:** Audio race guide for headphones during race
- **Friction:** LLM integration, audio synthesis
- **Leverage:** Route Intel already contains section narratives

#### **Multi-Format Publishing** ✅ **HIGH LEVERAGE**
- **Input:** Training content, crew stories, race recaps
- **Transform:** Markdown → Pandoc → EPUB/Mobi/DOCX
- **Output:** E-book or Word doc
- **Use Case:** Annual recap book, training manual
- **Friction:** Pandoc setup, template design
- **Leverage:** Content already in structured JSON

#### **AI-Generated Content Overlays** ⚠️ **LOW LEVERAGE** (RISKY)
- **Input:** Route stats + historical weather + Strava segments
- **Transform:** AI model → predicted effort, suggested pacing
- **Output:** AI-enhanced route intel
- **Use Case:** "This climb is harder than elevation suggests due to wind exposure"
- **Friction:** Model training, data sourcing, accuracy validation
- **Leverage:** LOW (introduces unpredictability, violates determinism)

#### **Performance Analytics** ✅ **MEDIUM LEVERAGE**
- **Input:** Training calendar + workouts + tier selections
- **Transform:** Weekly load calculations → CTL/ATL → fatigue modeling
- **Output:** Training load dashboard
- **Use Case:** Track periodization adherence, prevent overtraining
- **Friction:** Requires completed workout tracking (not just planned)
- **Leverage:** Workout structure already present, needs execution data layer

#### **Garmin/Strava Workout Export** ✅ **HIGH LEVERAGE**
- **Input:** Workout intervals (duration, target zones)
- **Transform:** Interval structure → Garmin FIT file or Strava workout JSON
- **Output:** Importable workout files for GPS watches
- **Use Case:** Load workout into watch, follow structured intervals
- **Friction:** FIT file format encoding, Strava API auth
- **Leverage:** Workout structure already interval-based

#### **Email/SMS Digest** ✅ **HIGH LEVERAGE**
- **Input:** calendar.json + upcoming events
- **Transform:** Weekly summary → HTML email or SMS
- **Output:** "This week: 3 workouts, 1 event (SUC-036 LRG)"
- **Use Case:** Weekly reminder, race countdown
- **Friction:** Email service integration (SendGrid, SES)
- **Leverage:** Calendar already compiled, just needs formatting

#### **Leaderboard Snapshots** ✅ **MEDIUM LEVERAGE**
- **Input:** leaderboards.current.json + historical snapshots
- **Transform:** Time-series analysis → rankings over time
- **Output:** Progression charts, "Most improved" rankings
- **Use Case:** Recognition, gamification
- **Friction:** Requires historical data (not currently stored)
- **Leverage:** Leaderboard structure exists, needs time-series storage

---

## 3️⃣ BUILDER SURFACE ANALYSIS

### **Multi-Tier Workout Builder**

#### **Where It Plugs In**
- **Authoring:** Studio Workout Builder (`WorkoutBuilder.tsx`)
- **Canonical:** `workouts/workouts.master.json`
- **Compile:** Broadcast viewer build → `workouts/workouts.json`
- **Render:** Workout Viewer → SVG interval chart per tier

#### **Canonical Structures Emitted**
```json
{
  "id": "long-run-v2",
  "version": 2,
  "status": "published",
  "domain": "run",
  "name": "Long Run (Progressive)",
  "tiers": {
    "MED": {
      "name": "Easy Long Run",
      "structure": [
        { "type": "interval", "duration": "60 min", "target": "Z2", "cues": "conversational pace" }
      ]
    },
    "LRG": {
      "name": "Hard Long Run",
      "structure": [
        { "type": "interval", "duration": "90 min", "target": "Z2-Z3", "cues": "moderate effort" }
      ]
    },
    "XL": { ... },
    "XXL": { ... }
  },
  "routeId": "SUC-LOOP",
  "sectionEfforts": [
    { "sectionKey": "climb-1", "effort": "Z4" }
  ]
}
```

#### **Broadcast Compile Needs**
- Parse `tiers` object → flatten per-tier workouts
- Join with route data if `routeId` present
- Calculate total duration (sum intervals) for display
- Normalize target zones (Z2, HR 140-150, 8:00/mi) → viewer format

#### **Viewer Render Needs**
- Tab selection for tier (MED/LRG/XL/XXL)
- Interval chart with color-coded zones
- Route map if `routeId` present
- Section efforts overlay on route sections

#### **New Artifact Types**
- **Tier Comparison Chart**: Side-by-side bar chart showing MED vs XXL duration/load
- **FIT File per Tier**: Garmin-importable workout file (4 files per workout)
- **Workout Narrative**: LLM-generated workout description ("This workout builds aerobic endurance with...")

#### **Friction Points**
- ❌ No tier auto-copy (users must fill all tiers manually) → time-consuming
- ❌ No tier templates (e.g., "Make XXL = 1.5x MED duration")
- ❌ No workout library/cloning (must recreate similar workouts)
- ❌ No workout versioning UI (version increments on publish, but no diff view)

#### **Leverage Points**
- ✅ One workout design → 4 prescriptions (volume/intensity personalization)
- ✅ Route integration → section-specific efforts (e.g., "climb at Z4")
- ✅ Interval structure → direct export to Garmin/Strava
- ✅ Coach notes → LLM prompt for narrative generation

---

### **Cinema Builder**

#### **Where It Plugs In**
- **Authoring:** Studio Route Media Builder (`RouteMediaBuilder/`)
- **Canonical:** `route-media/{id}.json`
- **Compile:** Broadcast media export → MP4 animation
- **Render:** Not currently rendered in viewers (export-only)

#### **Canonical Structures Emitted**
```json
{
  "id": "SUC-036-FLYBY",
  "type": "route-media",
  "eventId": "SUC-036",
  "routeId": "SUC-036",
  "distanceVariantId": "XL",
  "playback": {
    "milesPerSecond": 0.25,
    "fps": 30,
    "holdSeconds": 2,
    "outputFormat": "story"
  },
  "camera": {
    "mode": "third-person-follow",
    "followDistanceMeters": 100,
    "altitudeMeters": 50,
    "pitchDeg": 35,
    "headingOffsetDeg": -28
  },
  "timeline": [
    {
      "id": "title-intro",
      "lane": "title",
      "startMile": 0,
      "endMile": 0.5,
      "title": "SUC-036: XL LOOP"
    },
    {
      "id": "poi-summit",
      "lane": "poi",
      "startMile": 5.2,
      "endMile": 5.2,
      "payload": { "poiId": "summit-loma-alta" }
    },
    {
      "id": "camera-overview",
      "lane": "camera",
      "startMile": 5.0,
      "endMile": 6.0,
      "cameraMode": "overview-lock",
      "payload": { "altitudeMeters": 200 }
    },
    {
      "id": "speed-slow",
      "lane": "speed",
      "startMile": 5.0,
      "endMile": 6.0,
      "speedMiPerSec": 0.1
    }
  ],
  "subtitles": [
    { "id": "sub-1", "startSec": 10, "endSec": 15, "text": "Climb begins", "position": "bottom" }
  ],
  "markers": [
    { "id": "marker-1", "atMi": 5.2, "type": "poi", "poiId": "summit-loma-alta" }
  ]
}
```

#### **Broadcast Compile Needs**
- Load route geometry (GeoJSON)
- Load elevation series
- Load POI positions
- Interpolate camera path from timeline entries
- Generate keyframes for title/subtitle overlays
- Render frames (3D terrain + camera path + overlays)
- Encode MP4 via FFmpeg

#### **Viewer Render Needs**
- **NOT currently rendered in viewers** (export-only)
- Potential: Embed MP4 in Route Viewer event detail page
- Potential: Preview player in Studio (browser-based, no FFmpeg)

#### **New Artifact Types**
- **Story Format**: 1080x1920 vertical video (Instagram/TikTok)
- **Square Format**: 1080x1080 (Instagram feed)
- **Landscape Format**: 1920x1080 (YouTube)
- **GIF Export**: Animated GIF for email embeds (low-fi version)
- **Frame Stills**: PNG snapshots at mile markers

#### **Friction Points**
- ❌ Browser-only preview (no server-side render from Studio)
- ❌ No bulk timeline generation (must manually place all entries)
- ❌ No timeline templates (e.g., "POI every mile")
- ❌ Collision detection enforced (prevents overlapping titles in same lane)
- ❌ No audio track support (video-only, no music or voiceover)

#### **Leverage Points**
- ✅ 4-lane paradigm → precise timeline control (title/POI/camera/speed independent)
- ✅ Deterministic timeline → reproducible renders (same timeline = same video)
- ✅ Elevation waveform snap → easily anchor to terrain features
- ✅ Map sync → visual feedback during editing (see timeline on map)
- ✅ Multi-format export → one timeline → 3 aspect ratios

---

### **Route Experience Composer**

**Status:** Not yet built (conceptual)

#### **Where It Would Plug In**
- **Authoring:** New Studio builder (`RouteExperienceBuilder.tsx`)
- **Canonical:** `route-experiences/{id}.json` (new entity type)
- **Compile:** Broadcast viewer build → `route-experiences/{id}.json` (viewer-optimized)
- **Render:** Route Viewer → immersive story mode (scrollytelling)

#### **Canonical Structures It Would Emit**
```json
{
  "id": "SUC-036-EXPERIENCE",
  "type": "route-experience",
  "eventId": "SUC-036",
  "routeId": "SUC-036",
  "distanceVariantIds": ["XL"],
  "sections": [
    {
      "sectionKey": "start-to-climb",
      "narrative": "You'll begin with a gentle warm-up along the creek...",
      "media": {
        "imageUrl": "/assets/creek-photo.jpg",
        "videoUrl": "/media/SUC-036-FLYBY-CLIP-1.mp4"
      },
      "mapBounds": { "north": 38.59, "south": 38.57, "east": -121.47, "west": -121.49 }
    },
    {
      "sectionKey": "climb",
      "narrative": "The climb kicks in at mile 3. Expect 800ft over 2 miles...",
      "media": { "imageUrl": "/assets/climb-photo.jpg" },
      "mapBounds": { ... }
    }
  ],
  "visibility": "public"
}
```

#### **Broadcast Compile Needs**
- Join with route data (geometry, POIs, elevation)
- Join with route-intel sections (if present)
- Validate section keys against route POIs
- Package media URLs (images, video clips)

#### **Viewer Render Needs**
- Scrollytelling UI (scroll → section advances)
- Map animates to mapBounds on section change
- Narrative text overlays
- Media gallery (image/video)
- POI highlights synchronized with narrative

#### **New Artifact Types**
- **Immersive Route Story**: Multi-section narrative with media + map
- **PDF Export**: Printable route guide
- **Audio Guide**: Text-to-speech narrative for headphones

#### **Friction Points**
- ❌ Requires new schema + validation
- ❌ Media assets must be uploaded separately (not in canonical data)
- ❌ No authoring UI yet (would need full builder)

#### **Leverage Points**
- ✅ Reuse Route Intel section definitions (narrative already exists)
- ✅ Reuse Cinema Builder media (timeline clips → section media)
- ✅ Reuse POI annotations (automatic map highlights)

---

### **Weekly Recap Generator**

**Status:** Partially exists (manual process via Composer UI)

#### **Where It Would Plug In**
- **Authoring:** Composer UI (`ComposerView.jsx`) → draft JSON
- **Canonical:** `recaps/weekly/{date}.json` (new entity type)
- **Compile:** Broadcast media export → PNG carousel
- **Render:** Not in viewers (social media distribution only)

#### **Canonical Structures It Would Emit**
```json
{
  "id": "recap-2026-02-10",
  "type": "weekly-recap",
  "weekStart": "2026-02-10",
  "weekEnd": "2026-02-16",
  "highlights": [
    {
      "type": "event",
      "eventId": "SUC-036",
      "attendance": 12,
      "photoUrl": "/assets/suc-036-group.jpg",
      "caption": "12 crew members conquered SUC-036 in beautiful weather"
    },
    {
      "type": "achievement",
      "memberId": "jane-doe",
      "metric": "Longest run: 18 miles",
      "photoUrl": "/assets/jane-18mi.jpg"
    }
  ],
  "nextWeek": {
    "events": ["SUC-HILL-REPEATS"],
    "focusText": "Hill strength week"
  }
}
```

#### **Broadcast Compile Needs**
- Load event data for week (from calendar.json)
- Load member data (from roster.json)
- Load photos (external media library)
- Generate carousel slides (1 slide per highlight + 1 "next week" slide)
- Export PNG files (story format)

#### **Viewer Render Needs**
- **NOT in viewers** (social media only)
- Potential: Archive page in Route Viewer (past recaps gallery)

#### **New Artifact Types**
- **Instagram Carousel**: 10 slides (highlights + next week)
- **Email Digest**: HTML email with same content
- **PDF Recap**: Printable weekly summary

#### **Friction Points**
- ❌ Manual photo upload/management (not in canonical data)
- ❌ No template system (each recap hand-crafted)
- ❌ No automation (must manually trigger generation)

#### **Leverage Points**
- ✅ Calendar data already compiled (events for week)
- ✅ Roster data available (member names, consent flags)
- ✅ Media export pipeline exists (just needs new template)

---

## 4️⃣ SNAP-IN / SNAP-OUT SCENARIOS

### **Scenario: Swap Viewer UI Entirely**

**Action:** Replace Route Viewer with entirely new React app (e.g., Next.js, SvelteKit)

**What Breaks:**
- ❌ Nothing in Studio (unaware of viewers)
- ❌ Nothing in Shared-Data (unaware of viewers)
- ❌ Nothing in Broadcast (produces same artifacts regardless)

**What Doesn't Break:**
- ✅ Data contracts (routes.json, events.json still valid)
- ✅ Authoring workflow (Studio → Shared-Data unchanged)
- ✅ Compilation (Broadcast still produces artifacts)

**What Scales Naturally:**
- ✅ New viewer can consume same artifacts (no pipeline changes)
- ✅ Multiple viewers can coexist (mobile app + web app)
- ✅ Viewer versioning independent of pipeline

**What Requires Architectural Modification:**
- ⚠️ If new viewer needs different data shape → Broadcast must add new compile step
- ⚠️ If new viewer needs real-time data → Need WebSocket layer (violates read-only model)

**Verdict:** ✅ **CLEAN SNAP-OUT** (viewer swappable with no pipeline changes)

---

### **Scenario: Add New Viewer Types (Mobile, Email, Print)**

**Mobile Viewer (React Native)**

**What Breaks:**
- ❌ Nothing (data contracts same)

**What Doesn't Break:**
- ✅ JSON artifacts work cross-platform
- ✅ GeoJSON → React Native Maps
- ✅ Elevation charts → React Native SVG

**What Scales Naturally:**
- ✅ Same data source (just different renderer)

**What Requires Modification:**
- ⚠️ Might need lighter artifacts (mobile bandwidth constraints) → Broadcast adds `mobile-optimized` compile variant
- ⚠️ Offline support → Need artifact caching strategy (not currently supported)

**Email Viewer (HTML Email)**

**What Breaks:**
- ❌ Nothing (email just consumes exported images)

**What Doesn't Break:**
- ✅ Social media exports already produce email-friendly PNGs

**What Scales Naturally:**
- ✅ Weekly recap carousel → email attachment

**What Requires Modification:**
- ⚠️ Need HTML email template (not currently in pipeline)
- ⚠️ Need email service integration (SendGrid, SES)

**Print Viewer (PDF Export)**

**What Breaks:**
- ❌ Nothing

**What Doesn't Break:**
- ✅ Canonical data already structured

**What Scales Naturally:**
- ✅ calendar.json → HTML → Puppeteer → PDF

**What Requires Modification:**
- ⚠️ Need PDF template design (not currently in pipeline)
- ⚠️ Need Puppeteer setup in Broadcast

**Verdict:** ✅ **SNAP-IN FRIENDLY** (new viewer types fit cleanly into pipeline)

---

### **Scenario: Introduce AI Enrichment in Broadcast**

**Action:** Add LLM step to generate workout narratives, route descriptions, race scripts

**What Breaks:**
- ⚠️ **Determinism** (same input no longer guarantees same output)
- ⚠️ **Reproducibility** (AI output varies between runs)
- ⚠️ **Validation** (how to schema-validate LLM output?)

**What Doesn't Break:**
- ✅ Authoring (Studio unchanged)
- ✅ Storage (Shared-Data unchanged)
- ✅ Viewers (just consume enriched artifacts)

**What Scales Naturally:**
- ✅ AI as optional enrichment layer (can skip if API fails)
- ✅ Cached AI output (store generated content to avoid re-runs)

**What Requires Modification:**
- ⚠️ Need AI prompt templates
- ⚠️ Need LLM API integration (OpenAI, Claude)
- ⚠️ Need human review workflow (AI output may be wrong)
- ⚠️ Need caching strategy (avoid re-running LLM on every build)

**Verdict:** ⚠️ **REQUIRES ARCHITECTURAL SHIFT** (violates determinism unless AI output is cached in canonical data)

**Recommendation:** Store AI output as canonical data (human-reviewed), not generated on-the-fly

---

### **Scenario: Introduce Simulation Engines**

**Action:** Add workout simulation (predict HR/pace from intervals + fitness model)

**What Breaks:**
- ⚠️ **Statelessness** (simulation requires user fitness data, not in canonical data)
- ⚠️ **Privacy** (fitness data requires consent, PII)

**What Doesn't Break:**
- ✅ Authoring (Studio unchanged)
- ✅ Storage (Shared-Data unchanged, just add user fitness data)
- ✅ Viewers (just render simulation output)

**What Scales Naturally:**
- ✅ Simulation as optional viewer feature (not required in pipeline)
- ✅ User fitness data stored separately (not in canonical data)

**What Requires Modification:**
- ⚠️ Need user fitness data storage (ATL, CTL, HR zones, pace zones)
- ⚠️ Need simulation engine (physiological model)
- ⚠️ Need viewer UI for simulation input (HR zones, fitness level)

**Verdict:** ⚠️ **REQUIRES NEW DATA LAYER** (user-specific data, not canonical)

**Recommendation:** Add user-specific data layer (separate from canonical data) → simulation runs client-side in viewer

---

### **Scenario: Introduce New Entity Types (Recovery Score, Terrain Model, Crew Ranking)**

**Recovery Score**

**What Breaks:**
- ❌ Nothing if added as new entity type

**What Requires Modification:**
- ⚠️ New schema: `recovery-scores/{memberId}.json`
- ⚠️ Studio builder: Recovery Score Editor
- ⚠️ Broadcast compile: Join recovery score with calendar
- ⚠️ Viewer: Display recovery score on workout days

**What Scales Naturally:**
- ✅ Same append-only pattern
- ✅ Same validation workflow
- ✅ Same compile → viewer pipeline

**Verdict:** ✅ **SNAP-IN FRIENDLY** (new entity type fits cleanly)

**Terrain Model**

**What Breaks:**
- ⚠️ **Storage size** (terrain raster tiles are large)
- ⚠️ **Compilation** (terrain generation computationally expensive)

**What Requires Modification:**
- ⚠️ New schema: `terrain-models/{routeId}.json` (elevation grid, surface type)
- ⚠️ Broadcast compile: Generate terrain mesh from DEM data
- ⚠️ Route Viewer: Render 3D terrain (MapLibre already supports this)

**What Scales Naturally:**
- ✅ MapLibre terrain protocol already exists
- ✅ Tile-based lazy loading (no need to store full terrain in canonical data)

**Verdict:** ⚠️ **REQUIRES EXTERNAL DATA SOURCE** (DEM tiles not in canonical data)

**Crew Ranking**

**What Breaks:**
- ❌ Nothing

**What Requires Modification:**
- ⚠️ New schema: `rankings/{date}.json` (leaderboard snapshot)
- ⚠️ Broadcast compile: Join with roster, generate rankings
- ⚠️ Viewer: Leaderboard page

**What Scales Naturally:**
- ✅ Leaderboard.current.json already exists (just needs time-series storage)
- ✅ Append-only pattern (historical snapshots)

**Verdict:** ✅ **SNAP-IN FRIENDLY** (fits existing patterns)

---

## 5️⃣ CREATIVE VELOCITY ANALYSIS

### **Current Bottlenecks: Idea → Publish → Beautiful Output → Crew Impact**

| Stage | Current Latency | Manual Steps | Friction Source |
|-------|----------------|--------------|-----------------|
| **Idea** → **Authoring** | 5-30 min | Open Studio, navigate to builder, fill forms | No quick-capture (must use full builder) |
| **Authoring** → **Save** | 1-2 min | Fill all required fields, click Save | Validation errors block save |
| **Save** → **Publish** | 1-5 min | Review, click Publish, increment version | No bulk publish (must publish one-by-one) |
| **Publish** → **Compile** | 2-10 min | Manual trigger of `npm run build` in suc-broadcast | No auto-compilation on Git push |
| **Compile** → **Distribution** | 1-5 min | Manual trigger of media export, Google Drive upload | No auto-distribution |
| **Distribution** → **Crew Access** | 0 sec (instant) | None (viewers auto-refresh) | ✅ No friction here |

**Total Latency:** 10-52 minutes (Idea → Crew Access)

**Manual Steps:**
1. Open Studio
2. Navigate to builder
3. Fill forms
4. Click Save
5. Click Publish
6. Run `npm run build` in suc-broadcast
7. Run media export
8. Upload to Google Drive
9. Share link with crew

**Tooling Rigidity:**
- ❌ No mobile authoring (desktop-only)
- ❌ No voice input (text-only)
- ❌ No templates (start from scratch every time)
- ❌ No cloning (must recreate similar workouts)
- ❌ No bulk operations (publish all drafts, export all events)

**Content Composition Bottlenecks:**
- ❌ Cinematic timeline: Must manually place every entry (no auto-generation)
- ❌ Route Intel: Must manually enable POIs per variant (no templates)
- ❌ Multi-tier workouts: Must fill all tiers manually (no auto-copy)
- ❌ Weekly recap: Must manually compose every week (no automation)

**Output Format Constraints:**
- ❌ Social media only (no email, PDF, SMS)
- ❌ Fixed aspect ratios (square/story/landscape hardcoded)
- ❌ PNG/JPG/MP4 only (no GIF, SVG export)
- ❌ No custom branding (tier colors hardcoded)

---

### **Pipeline-Level Upgrades (Speed + Expressive Power)**

| Upgrade | Speed Gain | Expressive Power Gain | Implementation Effort |
|---------|------------|----------------------|---------------------|
| **Auto-compile on Git push** (CI/CD) | ✅ -5 min | — | LOW (GitHub Actions) |
| **Incremental compilation** (only changed files) | ✅ -5 min | — | MEDIUM (hash-based diffing) |
| **Render queue auto-start** (no manual trigger) | ✅ -2 min | — | LOW (file watcher) |
| **Bulk publish** (publish all drafts) | ✅ -3 min | — | LOW (Studio UI button) |
| **Parallel compilation** (routes + workouts + media in parallel) | ✅ -3 min | — | MEDIUM (async pipeline) |
| **LLM enrichment** (auto-generate narratives) | — | ✅✅✅ | MEDIUM (OpenAI API) |
| **Template system** (workout templates, timeline templates) | ✅ -10 min | ✅✅ | MEDIUM (template schema) |
| **PDF export** (training plan PDF) | — | ✅✅ | LOW (Puppeteer) |
| **Email distribution** (weekly recap email) | — | ✅✅ | LOW (SendGrid) |
| **Garmin FIT export** (importable workouts) | — | ✅✅✅ | MEDIUM (FIT SDK) |

**Highest ROI:** Auto-compile + Template system + Garmin FIT export

---

### **Studio-Level Upgrades**

| Upgrade | Speed Gain | Expressive Power Gain | Implementation Effort |
|---------|------------|----------------------|---------------------|
| **Mobile forms** (quick-capture on phone) | ✅ -10 min | — | MEDIUM (responsive UI) |
| **Voice input** (dictate workout notes) | ✅ -5 min | — | MEDIUM (Web Speech API) |
| **Workout cloning** (copy existing workout) | ✅ -5 min | — | LOW (clone button) |
| **Tier auto-copy** (MED → LRG with 1.5x duration) | ✅ -5 min | — | LOW (transform function) |
| **POI templates** (auto-enable all aid stations) | ✅ -3 min | — | LOW (preset buttons) |
| **Timeline auto-generation** (POI every mile) | ✅ -10 min | ✅ | MEDIUM (generator function) |
| **Autosave** (no lost work) | — | — | MEDIUM (debounced save) |
| **Multi-select publish** (select drafts → publish all) | ✅ -5 min | — | LOW (checkbox UI) |
| **Inline validation** (real-time error display) | ✅ -2 min | — | LOW (async validation) |
| **Import from Strava** (auto-create route from activity) | — | ✅✅ | MEDIUM (Strava API) |

**Highest ROI:** Workout cloning + Tier auto-copy + Timeline auto-generation

---

### **Broadcast-Level Upgrades**

| Upgrade | Speed Gain | Expressive Power Gain | Implementation Effort |
|---------|------------|----------------------|---------------------|
| **Smart caching** (skip unchanged artifacts) | ✅ -5 min | — | LOW (content hashing) |
| **Parallel rendering** (all routes at once) | ✅ -10 min | — | MEDIUM (queue concurrency) |
| **On-demand compilation** (compile on API request) | ✅ -5 min | — | MEDIUM (lazy build) |
| **Multi-format output** (PDF, EPUB, email) | — | ✅✅✅ | MEDIUM (Pandoc, Puppeteer) |
| **Custom templates** (user-defined export formats) | — | ✅✅ | HIGH (template engine) |
| **AI narration** (auto-generate race scripts) | — | ✅✅✅ | MEDIUM (LLM API) |
| **Audio export** (text-to-speech race guide) | — | ✅✅ | LOW (TTS API) |
| **GIF export** (animated route preview) | — | ✅ | LOW (FFmpeg) |

**Highest ROI:** Smart caching + Multi-format output + AI narration

---

### **Viewer-Level Upgrades**

| Upgrade | Speed Gain | Expressive Power Gain | Implementation Effort |
|---------|------------|----------------------|---------------------|
| **Offline mode** (PWA with cached artifacts) | ✅ -10 sec | — | MEDIUM (service worker) |
| **Live race tracking** (real-time GPS) | — | ✅✅✅ | MEDIUM (WebSocket) |
| **Workout completion tracking** (checkboxes) | — | ✅✅ | MEDIUM (local storage + sync) |
| **Training load dashboard** (CTL/ATL charts) | — | ✅✅✅ | HIGH (fitness model) |
| **Social features** (comments, reactions) | — | ✅✅ | HIGH (backend + auth) |
| **Mobile app** (native iOS/Android) | — | ✅✅ | HIGH (React Native) |
| **Apple Watch integration** (workout sync) | — | ✅✅✅ | HIGH (HealthKit) |
| **Strava sync** (auto-upload completed workouts) | — | ✅✅ | MEDIUM (Strava API) |

**Highest ROI:** Live race tracking + Workout completion tracking + Strava sync

---

## 6️⃣ OPPORTUNITY MAP

### **Hidden Superpowers (Already Present)**

| Capability | Current State | Hidden Power | How to Unlock |
|-----------|---------------|--------------|---------------|
| **Multi-tier workouts** | Fully built | One workout → 4 prescriptions | Export to Garmin FIT (4 files), market as "personalized training" |
| **Cinematic timeline** | Fully built | Frame-accurate media control | Auto-generate timelines (POI every mile), batch export all routes |
| **Route Intel sections** | Fully built | Turn-by-turn race strategy | Audio guide (text-to-speech), print PDF race plan |
| **Append-only canonical data** | Fully built | Complete audit trail | Time-travel debugging, rollback to any date |
| **Deterministic compilation** | Fully built | Reproducible builds | CI/CD auto-publish on Git push |
| **POI variant placement** | Fully built | Distance-specific race intel | Auto-generate variant-specific race plans |
| **Training signals** (stress/volume/intensity) | Fully built | Queryable training load | Training load dashboard, fatigue modeling |
| **Consent flags** | Fully built | Legal compliance | Safe storytelling, metrics publishing |
| **Route geometry** (GeoJSON + GPX) | Fully built | Universal compatibility | Export to Garmin, Strava, Komoot, AllTrails |

---

### **Underused Surfaces**

| Surface | Current Usage | Potential Usage | Gap |
|---------|---------------|-----------------|-----|
| **Workout `coachNotes` field** | Free text (often empty) | LLM prompt for auto-narration | No LLM integration |
| **Route `description` field** | Short text | Rich markdown with links, images | No markdown renderer |
| **Event `type` field** (crew-run, race, social) | Filtering only | Custom templates per type | Hardcoded templates |
| **POI `metadata` field** (water, nutrition, crew access) | Display only | Filterable POI list (show only aid stations) | No filter UI |
| **Route `color` field** | Map rendering only | Custom branding (crew colors) | Hardcoded tier colors |
| **Workout `focus` tags** | Display only | Search/filter workouts by focus | No search UI |
| **Season `markers`** (race flags) | Display only | Auto-generate taper weeks | No auto-taper logic |
| **Roster `tier` field** | Display only | Auto-assign workout tier | No tier assignment logic |

---

### **Natural Product Extensions**

| Extension | Builds On | Value Add | Effort |
|-----------|-----------|-----------|--------|
| **Training Plan PDF** | calendar.json + workouts.json | Printable plan for offline use | LOW |
| **Garmin FIT Export** | Workout intervals | Importable workouts for GPS watch | MEDIUM |
| **Weekly Email Digest** | calendar.json + events.json | Automated weekly reminder | LOW |
| **Audio Race Guide** | Route Intel sections | Turn-by-turn audio for headphones | MEDIUM |
| **Workout Library** | workouts.master.json | Searchable/filterable workout database | LOW |
| **Training Load Dashboard** | calendar.json + workout tier selections | CTL/ATL/TSB charts | HIGH |
| **Strava Integration** | Workout structure + route GPX | Auto-create Strava workouts | MEDIUM |
| **Live Race Tracking** | Route geometry + live GPS | Real-time crew position on map | MEDIUM |
| **Mobile App** | Same artifacts, native UI | Offline access, push notifications | HIGH |
| **AI Workout Generator** | Training signals + fitness model | "Generate a 12-week marathon plan" | HIGH |

---

### **High-Leverage Upgrades**

#### **🏆 Tier 1: Immediate Impact, Low Effort**

1. **Auto-compile on Git push** (CI/CD)
   - Impact: Eliminate manual build step (saves 5 min per publish)
   - Effort: 1 day (GitHub Actions workflow)

2. **Workout cloning**
   - Impact: Reuse existing workouts (saves 10 min per workout)
   - Effort: 1 day (clone button + duplicate function)

3. **Training Plan PDF Export**
   - Impact: Offline access, printable (new distribution channel)
   - Effort: 2 days (Puppeteer + HTML template)

4. **Weekly Email Digest**
   - Impact: Automated crew communication (saves 30 min/week)
   - Effort: 2 days (SendGrid + email template)

5. **Tier auto-copy** (MED → LRG with multiplier)
   - Impact: Faster multi-tier authoring (saves 5 min per tier)
   - Effort: 1 day (transform function)

#### **🥈 Tier 2: High Impact, Medium Effort**

6. **Garmin FIT Export**
   - Impact: Importable workouts for GPS watch (game-changer for training)
   - Effort: 1 week (FIT SDK integration)

7. **Timeline Auto-Generation** (POI every mile)
   - Impact: Faster cinematic authoring (saves 10 min per timeline)
   - Effort: 3 days (generator function)

8. **Audio Race Guide**
   - Impact: Turn-by-turn audio for race day (new content format)
   - Effort: 3 days (text-to-speech + MP3 export)

9. **Live Race Tracking**
   - Impact: Real-time crew position on map (race day excitement)
   - Effort: 1 week (WebSocket + GPS polling)

10. **LLM Narration** (auto-generate workout descriptions)
    - Impact: Rich content with zero authoring effort
    - Effort: 1 week (OpenAI API + prompt engineering)

#### **🥉 Tier 3: Transformative, High Effort**

11. **Training Load Dashboard** (CTL/ATL/TSB)
    - Impact: Data-driven training decisions (prevent overtraining)
    - Effort: 3 weeks (fitness model + chart UI)

12. **Mobile App** (React Native)
    - Impact: Offline access, push notifications (mobile-first crew)
    - Effort: 6 weeks (iOS + Android)

13. **AI Workout Generator**
    - Impact: "Generate a 12-week marathon plan" (one-click programming)
    - Effort: 4 weeks (LLM + fitness model + validation)

---

### **Things That Look Powerful But Are Distractions**

| Idea | Why It Seems Powerful | Why It's a Distraction | Better Alternative |
|------|----------------------|------------------------|-------------------|
| **Social features** (comments, likes) | "Engagement!" | Requires backend, auth, moderation (HIGH effort, LOW unique value) | Use existing social platforms (Instagram, Strava) |
| **Custom branding** (user-defined colors) | "Personalization!" | Breaks visual consistency, adds UI complexity | Stick with tier colors (proven system) |
| **Real-time collaboration** (multiple editors) | "Google Docs for workouts!" | Requires WebSocket, conflict resolution (HIGH effort) | Sequential editing works fine for one crew |
| **Advanced analytics** (ML insights) | "AI-powered training!" | Requires training data, model accuracy questionable | Simple training load (CTL/ATL) more valuable |
| **Gamification** (badges, streaks) | "Motivation!" | Extrinsic motivation undermines intrinsic (culture risk) | Focus on narrative, community, not points |
| **Multi-crew tenancy** | "Scale to 100 crews!" | Violates one-crew excellence principle (complexity explosion) | Stick with one-crew focus |

---

### **Single Highest ROI Improvement (One Crew, Right Now)**

**🎯 Garmin FIT Export + Weekly Email Digest**

**Why:**
1. **Garmin FIT Export:**
   - Immediate training value (workouts → GPS watch)
   - Leverages existing workout structure (no new authoring)
   - High crew excitement ("My watch knows the workout!")
   - Low effort (1 week implementation)

2. **Weekly Email Digest:**
   - Eliminates manual crew communication
   - Saves coach 30 min/week
   - Increases engagement (email > checking website)
   - Low effort (2 days implementation)

**Combined Impact:**
- **Training Effectiveness:** ⬆️⬆️⬆️ (watch-guided workouts)
- **Crew Engagement:** ⬆️⬆️ (weekly reminder)
- **Coach Time Saved:** 30 min/week
- **Implementation Effort:** 9 days total

**Implementation Plan:**
1. Week 1: Build Garmin FIT exporter (workout intervals → FIT file)
2. Week 2: Build email digest (calendar → HTML email → SendGrid)
3. Week 2: Ship both, measure engagement

**Success Metrics:**
- % of crew loading workouts to watch (target: 50%+)
- Email open rate (target: 70%+)
- Coach time saved (target: 30 min/week)

---

## FINAL SYNTHESIS

**SUC-OS is a deterministic content machine with 3 core strengths:**

1. **Structured Authoring** (Studio + Shared-Data)
   - Multi-domain content creation (workouts, routes, events, media)
   - Schema-enforced data integrity
   - Append-only audit trail

2. **Stateless Compilation** (Broadcast)
   - Reproducible builds
   - Multi-format outputs (JSON, PNG, MP4)
   - Distribution automation

3. **Read-Only Consumption** (Viewers)
   - Interactive route exploration
   - Training calendar
   - Race day tools

**The highest-leverage opportunities are:**

1. **Garmin FIT Export** → Turn workouts into watch files (training effectiveness)
2. **Weekly Email Digest** → Automate crew communication (coach time savings)
3. **Training Plan PDF** → Offline access (new distribution channel)
4. **Auto-compile CI/CD** → Eliminate manual build step (velocity)
5. **LLM Narration** → Auto-generate descriptions (content richness)

**Avoid distractions:**
- Social features (use Instagram/Strava instead)
- Multi-crew tenancy (violates one-crew focus)
- Gamification (extrinsic motivation risk)

**The single most valuable upgrade right now:**
**Garmin FIT Export + Weekly Email Digest** (9 days effort, transformative impact)

