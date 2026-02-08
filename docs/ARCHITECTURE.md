# SUC-OS Architecture

This document defines the system design, layer model, and architectural principles of SUC-OS.

## Table of Contents

- [Design Principles](#design-principles)
- [Layer Model](#layer-model)
- [System Invariants](#system-invariants)
- [Repo Boundaries](#repo-boundaries)
- [Data Flow](#data-flow)
- [Architectural Diagrams](#architectural-diagrams)
- [Extending the Platform](#extending-the-platform)

---

## Design Principles

SUC-OS is built on these non-negotiable principles:

### 1. Unidirectional Data Flow

Data flows in one direction only: **Author → Publish → Compile → Consume**.

- Viewers never write to canonical data
- Pipeline never authors content
- Studio never compiles or serves data

**Violation**: A viewer that allows users to edit workouts and writes back to `suc-shared-data`
**Correct**: A viewer that allows users to edit workouts and writes to a separate user preferences database

---

### 2. Single Source of Truth

`suc-shared-data` is the canonical ledger. Everything else is derived.

- All other repos can be deleted and rebuilt from `suc-shared-data`
- Broadcast outputs are ephemeral (can be regenerated)
- Viewer state is local (can be cleared)

**Violation**: Storing canonical route metadata in `suc-broadcast` database
**Correct**: Storing only compilation artifacts (indexes, caches) in broadcast, reading canonical data from `suc-shared-data`

---

### 3. Schema-Driven Contracts

All data must validate against JSON schemas before publication.

- Schemas live in `suc-shared-data/schemas/`
- Studio validates before publishing
- Broadcast validates during ingestion
- Viewers validate responses (defensive)

**Violation**: Publishing a workout without validating it matches the schema
**Correct**: Studio runs AJV validation and blocks publish if validation fails

---

### 4. Append-Only Data

`suc-shared-data` never deletes content. Only deprecation is allowed.

- Deprecated entities are marked with `deprecated: true` or `visibility: "archived"`
- Git history provides full audit trail
- Rollbacks are git reverts, not deletions

**Violation**: Deleting `routes/old-trail.json` from the repo
**Correct**: Updating `routes/old-trail.json` to include `"deprecated": true` and filtering it out in broadcast

---

### 5. Stateless Pipeline

`suc-broadcast` is deterministic and rebuildable.

- Given the same input (shared-data), broadcast produces the same output
- Broadcast does not store mutable state
- All compilation logic is idempotent

**Violation**: Broadcast storing "last compiled timestamp" in a database and using it for conditional logic
**Correct**: Broadcast reads git commit timestamps from `suc-shared-data` to determine freshness

---

### 6. Separation of Concerns

Each layer has a single responsibility:

| Layer | Responsibility |
|-------|----------------|
| Authoring | Create, edit, validate |
| Data | Store, version, preserve |
| Pipeline | Compile, index, format, serve |
| Consumers | Fetch, render, display |

**Violation**: A viewer that compiles its own workout calendar from raw JSON
**Correct**: A viewer that fetches a pre-compiled calendar from `suc-broadcast`

---

## Layer Model

### Layer 1: Authoring

**Repository**: `suc-studio`

**Purpose**: Human-facing content creation and publication.

**Responsibilities**:
- Provide UIs/CLIs for creating routes, workouts, events, tips, etc.
- Validate content against schemas (AJV)
- Manage draft vs published state
- Commit validated artifacts to `suc-shared-data` (git operations)

**Does NOT**:
- Compile data into consumer-ready formats
- Serve data to viewers
- Store canonical data (only writes to `suc-shared-data`)

**Key Technologies**:
- React/Next.js (web UI)
- AJV (JSON schema validation)
- Git CLI (for publishing)

**Inputs**: Human content creators
**Outputs**: Validated JSON/GPX/GeoJSON committed to `suc-shared-data`

---

### Layer 2: Data (Source of Truth)

**Repository**: `suc-shared-data`

**Purpose**: Canonical, versioned, immutable storage of all SUC content.

**Responsibilities**:
- Store all validated JSON, GPX, and GeoJSON files
- Maintain schemas for all entity types
- Provide git-based versioning and audit trail
- Enforce append-only semantics (no deletions)

**Does NOT**:
- Author content (only receives validated commits from studio)
- Compile or transform data
- Serve data to consumers (broadcast reads it, not viewers)

**Structure**:
```
suc-shared-data/
├── schemas/
│   ├── route.json
│   ├── workout.json
│   ├── event.json
│   └── ...
├── routes/
│   ├── route-001.json
│   ├── route-001.gpx
│   └── ...
├── workouts/
│   ├── tempo-2025-02-07.json
│   └── ...
├── events/
├── training-content/
├── blocks/
├── seasons/
├── roster/
└── ...
```

**Key Technologies**:
- Git (version control)
- JSON Schema (validation)
- GitHub Actions (CI for schema validation)

**Inputs**: Validated commits from `suc-studio`
**Outputs**: Versioned canonical data read by `suc-broadcast`

---

### Layer 3: Pipeline (Compilation & Distribution)

**Repository**: `suc-broadcast`

**Purpose**: Transform canonical data into optimized, consumer-ready formats.

**Responsibilities**:
- Ingest data from `suc-shared-data` (git submodule, file read, or API)
- Compile indexes (by date, topic, difficulty, visibility)
- Denormalize related entities (e.g., embed block metadata in workouts)
- Generate topic filters (strength, endurance, recovery)
- Build calendars (weekly schedules, event timelines)
- Produce API endpoints or static JSON bundles
- Deploy compiled outputs to CDN or serverless hosting

**Does NOT**:
- Author content
- Store canonical data (only reads from `suc-shared-data`)
- Render UIs (only produces data)

**Compilation Examples**:
```
Input:  suc-shared-data/workouts/*.json
Output: /api/v1/workouts/2025-W05.json (all workouts for week 5)

Input:  suc-shared-data/routes/*.json + *.gpx
Output: /api/v1/routes/public.json (all public routes with simplified metadata)

Input:  suc-shared-data/events/*.json
Output: /api/v1/events/upcoming.json (future events sorted by date)
```

**Key Technologies**:
- Node.js (compilation scripts)
- GitHub Actions or Vercel (CI/CD)
- S3 + CloudFront or Vercel Edge (hosting)

**Inputs**: Canonical data from `suc-shared-data`
**Outputs**: Compiled JSON served via API or CDN

---

### Layer 4: Consumers (User-Facing Applications)

**Repositories**: `suc-route-viewer`, `suc-workout-viewer`, (+ future apps)

**Purpose**: Render data for end users in specialized UIs.

**Responsibilities**:
- Fetch compiled data from `suc-broadcast`
- Render UIs (maps, calendars, cards, lists)
- Handle user interactions (filtering, searching, navigation)
- Cache data locally for performance/offline support

**Does NOT**:
- Author or modify canonical data
- Compile or aggregate data (consumes pre-compiled outputs)
- Store source-of-truth data (only caches for UX)

**Viewer Descriptions**:

**suc-route-viewer**:
- Target audience: General public, prospective crew members
- Features: Map-based route browsing, POI visualization, event-linked routes
- Data sources: `/api/v1/routes/`, `/api/v1/events/`

**suc-workout-viewer**:
- Target audience: SUC athletes and coaches
- Features: Weekly training plans, workout detail views, training tips
- Data sources: `/api/v1/workouts/`, `/api/v1/blocks/`, `/api/v1/training-content/`

**Key Technologies**:
- React/Next.js/Svelte (UI frameworks)
- Mapbox/Leaflet (for route viewer)
- Vercel/Netlify (hosting)

**Inputs**: Compiled JSON from `suc-broadcast`
**Outputs**: Rendered HTML/CSS/JS for end users

---

## System Invariants

These rules are non-negotiable and must never be violated:

### Invariant 1: Data flows unidirectionally
**Rule**: Data moves Author → Data → Pipeline → Consumers, never backward.

**Enforcement**:
- Viewers have no write access to `suc-shared-data`
- Broadcast has no authoring UIs
- Studio has no compilation logic

**Test**: Can I delete `suc-broadcast` and rebuild it from `suc-shared-data`? (Answer must be YES)

---

### Invariant 2: suc-shared-data is append-only
**Rule**: Never delete files. Only deprecate.

**Enforcement**:
- GitHub branch protection (require PR review for deletions)
- CI checks that fail if files are removed
- Cultural discipline

**Test**: Can I recover any historical content from git history? (Answer must be YES)

---

### Invariant 3: All data is schema-validated
**Rule**: No content reaches `suc-shared-data` without passing schema validation.

**Enforcement**:
- Studio validates before commit
- GitHub Actions validates on PR
- Broadcast validates on ingest (defensive)

**Test**: Can invalid JSON be merged to `suc-shared-data` main branch? (Answer must be NO)

---

### Invariant 4: Broadcast is stateless
**Rule**: Broadcast can be deleted and rebuilt at any time without data loss.

**Enforcement**:
- No persistent databases in broadcast
- All outputs are derived from `suc-shared-data`
- Compilation is idempotent

**Test**: Can I delete `suc-broadcast/dist/` and regenerate identical outputs? (Answer must be YES)

---

### Invariant 5: Viewers are read-only
**Rule**: Viewers never mutate canonical data.

**Enforcement**:
- Viewers only have HTTP GET access to broadcast APIs
- No POST/PUT/DELETE endpoints in broadcast (for canonical data)
- User-generated content (if needed) goes to separate databases

**Test**: Can a viewer modify a workout's difficulty? (Answer must be NO, unless it's local-only preference)

---

## Repo Boundaries

### What Each Repo CAN Do

| Repo | Allowed Operations |
|------|-------------------|
| suc-studio | Create, edit, validate, publish (commit to shared-data) |
| suc-shared-data | Store, version, validate schemas, provide git history |
| suc-broadcast | Read shared-data, compile, index, format, serve APIs |
| suc-route-viewer | Fetch broadcast data, render maps, display routes |
| suc-workout-viewer | Fetch broadcast data, render calendars, display workouts |

### What Each Repo CANNOT Do

| Repo | Forbidden Operations |
|------|---------------------|
| suc-studio | Compile indexes, serve APIs, render viewer UIs |
| suc-shared-data | Author content (only receives commits), compile, serve |
| suc-broadcast | Author content, store canonical data, render UIs |
| suc-route-viewer | Author/modify canonical data, compile aggregations |
| suc-workout-viewer | Author/modify canonical data, compile aggregations |

---

## Data Flow

See [DATA_FLOW.md](./DATA_FLOW.md) for detailed pipeline documentation.

**High-level flow**:

```
1. Coach opens suc-studio
2. Creates a new workout (tempo run, 8mi @ 7:30/mi)
3. Studio validates against schemas/workout.json
4. Studio commits to suc-shared-data/workouts/tempo-2025-02-07.json
5. Studio pushes to GitHub
6. GitHub Actions validates schemas (redundant check)
7. Merge to main triggers webhook to suc-broadcast
8. Broadcast detects new workout
9. Broadcast recompiles /api/v1/workouts/2025-W05.json
10. Broadcast deploys updated JSON to CDN
11. Athlete opens suc-workout-viewer
12. Viewer fetches /api/v1/workouts/2025-W05.json
13. Viewer renders workout in weekly calendar
```

**Latency**: Typically 3-8 minutes from publish to user visibility.

---

## Architectural Diagrams

### Full System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTHORING LAYER                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              suc-studio (Web UI)                    │   │
│  │                                                     │   │
│  │  - Create routes, workouts, events, tips           │   │
│  │  - Validate against JSON schemas                   │   │
│  │  - Manage draft/published state                    │   │
│  │  - Git commit + push to suc-shared-data            │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ (git push)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         suc-shared-data (Git Repository)            │   │
│  │                                                     │   │
│  │  - Canonical JSON/GPX/GeoJSON files                │   │
│  │  - JSON schemas for validation                     │   │
│  │  - Append-only (never delete)                      │   │
│  │  - Full git history (audit trail)                  │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ (read files)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PIPELINE LAYER                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       suc-broadcast (Compilation Service)           │   │
│  │                                                     │   │
│  │  - Ingest from suc-shared-data                     │   │
│  │  - Compile indexes, filters, calendars             │   │
│  │  - Denormalize entities                            │   │
│  │  - Generate API endpoints                          │   │
│  │  - Deploy to CDN                                   │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ (HTTP GET)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONSUMER LAYER                            │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │  suc-route-viewer        │  │ suc-workout-viewer   │    │
│  │  (Public Web App)        │  │ (Team Web App)       │    │
│  │                          │  │                      │    │
│  │  - Fetch routes          │  │ - Fetch workouts     │    │
│  │  - Render maps           │  │ - Render calendars   │    │
│  │  - Display events        │  │ - Display tips       │    │
│  └──────────────────────────┘  └──────────────────────┘    │
│                                                             │
│  ┌──────────────────────────┐                              │
│  │  Future Viewers          │                              │
│  │  (Mobile, Analytics)     │                              │
│  └──────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Flow

```
┌──────────────┐
│   Engineer   │
└──────┬───────┘
       │
       │ (1) Author content in suc-studio
       ▼
┌──────────────────┐
│   suc-studio     │
└──────┬───────────┘
       │
       │ (2) Validate schemas (AJV)
       │ (3) Git commit + push
       ▼
┌──────────────────┐
│ suc-shared-data  │
│  (GitHub repo)   │
└──────┬───────────┘
       │
       │ (4) CI validates schemas
       │ (5) Merge to main
       │ (6) Trigger webhook
       ▼
┌──────────────────┐
│  suc-broadcast   │
│  (GitHub Action) │
└──────┬───────────┘
       │
       │ (7) Detect changes (git diff)
       │ (8) Recompile affected outputs
       │ (9) Deploy to CDN
       ▼
┌──────────────────┐
│   CDN/Edge       │
│  (Vercel/S3)     │
└──────┬───────────┘
       │
       │ (10) Viewers fetch updated data
       ▼
┌──────────────────┐
│  End Users       │
└──────────────────┘
```

---

## Extending the Platform

### Adding a New Viewer

**Scenario**: You want to build a mobile app.

**Steps**:
1. Create new repo: `suc-mobile`
2. Install dependencies (React Native, etc.)
3. Configure API endpoint: `https://api.suc-broadcast.app`
4. Fetch data from broadcast APIs (read-only)
5. Render native UIs
6. Deploy to app stores

**Rules**:
- ✅ Consume from `suc-broadcast` API
- ✅ Cache data locally for offline support
- ❌ Do NOT write to `suc-shared-data`
- ❌ Do NOT compile or aggregate data in the app

---

### Adding a New Entity Type

**Scenario**: You want to track "Gear Reviews".

**Steps**:
1. Define schema in `suc-shared-data/schemas/gear-review.json`
2. Add authoring UI in `suc-studio` for creating gear reviews
3. Publish gear reviews to `suc-shared-data/gear-reviews/`
4. Update `suc-broadcast` to compile `/api/v1/gear-reviews/all.json`
5. Update viewers to display gear reviews (or create new viewer)

**Rules**:
- ✅ Follow the same Author → Data → Pipeline → Consume flow
- ✅ Validate against schema before publishing
- ❌ Do NOT skip schema validation
- ❌ Do NOT store gear reviews only in broadcast

---

### Adding a New Data Source

**Scenario**: You want to ingest Strava activities.

**Steps**:
1. Create integration in `suc-studio` (or new repo: `suc-strava-sync`)
2. Fetch Strava activities via API
3. Transform to SUC workout schema
4. Validate against `schemas/workout.json`
5. Publish to `suc-shared-data/workouts/`
6. Broadcast automatically picks up new workouts

**Rules**:
- ✅ External data must pass through studio (or equivalent authoring layer)
- ✅ Must validate against schemas
- ✅ Must be published to `suc-shared-data`
- ❌ Do NOT write directly to shared-data without validation
- ❌ Do NOT store Strava data in broadcast

---

### Scaling Broadcast

**When compilation becomes slow** (>5 minutes):

**Solutions**:
1. **Incremental compilation**: Only recompile changed entities
2. **Parallel compilation**: Compile entity types in parallel
3. **Caching**: Cache intermediate results (e.g., route indexes)
4. **Pre-computed aggregations**: Store denormalized data in shared-data (trade-off)

**Example** (incremental):
```javascript
const changedFiles = execSync('git diff --name-only HEAD~1').toString().split('\n');
const changedWorkouts = changedFiles.filter(f => f.startsWith('workouts/'));

if (changedWorkouts.length > 0) {
  recompileWorkouts();
} else {
  console.log('No workout changes detected, skipping recompilation');
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-02-07 | Initial architecture definition |

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07
