## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

# SUC-OS Platform Documentation

**SUC-OS** is a modular, pipeline-driven content platform for trail running crews, coaching workflows, route visualization, and training plan distribution.

## Philosophy

SUC-OS is built on four core principles:

1. **JSON-first**: All data is structured, versioned, and schema-validated
2. **Repo-driven**: Each repository has a single responsibility
3. **Pipeline-based**: Data flows unidirectionally through authoring → publication → compilation → consumption
4. **Canonical source of truth**: `suc-shared-data` is the long-term ledger

## What SUC-OS Does

SUC-OS enables a trail running crew to:

- **Author** routes, workouts, training plans, events, and educational content
- **Validate** all data against strict schemas before publication
- **Compile** canonical data into viewer-optimized formats (indexes, filters, calendars, aggregations)
- **Distribute** content to multiple frontends (web apps, mobile apps, future integrations)
- **Maintain** a complete audit trail of all content through git history

## The Platform Model

```
┌─────────────────────────────────────────────────────────────┐
│ AUTHORING LAYER                                             │
│ ┌─────────────────┐                                         │
│ │  suc-studio     │  Create and publish content             │
│ └────────┬────────┘                                         │
└──────────┼──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ DATA LAYER                                                  │
│ ┌─────────────────┐                                         │
│ │ suc-shared-data │  Canonical source of truth              │
│ └────────┬────────┘                                         │
└──────────┼──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ PIPELINE LAYER                                              │
│ ┌─────────────────┐                                         │
│ │  suc-broadcast  │  Compile and distribute                 │
│ └────────┬────────┘                                         │
└──────────┼──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ CONSUMER LAYER                                              │
│ ┌──────────────────┐  ┌──────────────────┐                 │
│ │ suc-route-viewer │  │ suc-workout-viewer│                 │
│ └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Repository Map

| Repository | Layer | Purpose |
|------------|-------|---------|
| suc-studio | Authoring | Human-facing content creation, validation, and publishing |
| suc-shared-data | Data | Canonical JSON/GPX/GeoJSON storage (source of truth) |
| suc-broadcast | Pipeline | Data compilation, indexing, formatting, and distribution |
| suc-route-viewer | Consumer | Public-facing route and POI visualization (map-first UI) |
| suc-workout-viewer | Consumer | Team-facing training dashboard (read-only) |

## How It Works

**The Pipeline in One Sentence**:
Content is authored in `suc-studio`, published to `suc-shared-data`, compiled by `suc-broadcast`, and consumed by viewer applications.

**Key Characteristics**:
- **Unidirectional flow**: Data never flows backward. Viewers never write. Pipeline never authors.
- **Schema validation**: All data is validated against JSON schemas before publication.
- **Append-only data**: Nothing is deleted from `suc-shared-data`, only deprecated.
- **Stateless compilation**: `suc-broadcast` can be fully rebuilt from `suc-shared-data` at any time.
- **Multi-consumer**: Multiple viewers can consume the same compiled data.

## Quick Start

**If you want to develop locally**:
Read [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md)

**If you want to understand the system**:
Read [ARCHITECTURE.md](./ARCHITECTURE.md)

**If you want to contribute content**:
Read [CONTRIBUTOR_WORKFLOW.md](./CONTRIBUTOR_WORKFLOW.md)

**If you want to understand data flow**:
Read [DATA_FLOW.md](./DATA_FLOW.md)

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design, layer model, data flow
- [DATA_FLOW.md](./DATA_FLOW.md) - Detailed pipeline lifecycle
- [DEVELOPER_ONBOARDING.md](./DEVELOPER_ONBOARDING.md) - Local setup and development
- [CONTRIBUTOR_WORKFLOW.md](./CONTRIBUTOR_WORKFLOW.md) - Common tasks and workflows
- [ANTI_PATTERNS.md](./ANTI_PATTERNS.md) - Architectural violations to avoid

## Entity Types

SUC-OS manages the following content types:

**Training**:
- Workouts (run workouts with pacing, distance, effort)
- Blocks (multi-week training phases)
- Seasons (annual training cycles)
- Training Content (educational tips by topic)

**Geographic**:
- Routes (GPX tracks with metadata)
- Events (with location and route references)

**Organization**:
- Roster (athlete profiles)
- Crew Stories (narrative content)
- Race Recaps
- Gear Reviews

## Design Principles

1. **Single Responsibility**: Each repo owns one layer
2. **Explicit Contracts**: Schemas define data shapes
3. **Immutable History**: Git provides the audit trail
4. **Deterministic Compilation**: Same input always produces same output
5. **Separation of Concerns**: Authoring, storage, compilation, and presentation are distinct

## Future Evolution

SUC-OS is designed to scale horizontally by adding new consumers without modifying the data or pipeline layers.

**Planned additions**:
- Mobile applications (iOS/Android)
- Analytics dashboards (athlete progress tracking)
- Admin tools (team management, permissions)
- Public API gateway (if needed for third-party integrations)

All new consumers will follow the same pattern: read from `suc-broadcast`, never write to `suc-shared-data`.

## Contributing

See [CONTRIBUTOR_WORKFLOW.md](./CONTRIBUTOR_WORKFLOW.md) for standard workflows.

**Key rules**:
- Always author content through `suc-studio`
- Never edit `suc-shared-data` files directly
- Never delete data—mark as deprecated instead
- Validate schemas before publishing
- Follow the deployment sequence: data → pipeline → consumers

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07

