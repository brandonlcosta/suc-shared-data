# Validation Checklist

Quick reference for implementing validation. See [validation-invariants.md](./validation-invariants.md) for full details.

---

## Structural Hierarchy

- [ ] Season has at least one week
- [ ] All season.weekIds exist in weeks.json
- [ ] Weeks in season.weekIds are in chronological order
- [ ] Block has at least one week
- [ ] All block.weekIds exist in weeks.json
- [ ] Weeks in block.weekIds are in chronological order
- [ ] Week.seasonId references valid season
- [ ] Week.blockId references valid block
- [ ] Block weekIds are a subset of season.weekIds

---

## Dates

- [ ] Week start dates are Mondays
- [ ] Weeks do not overlap within a season (at least 7 days apart)
- [ ] Season start < end
- [ ] Season date range contains all referenced weeks
- [ ] Season timezone is America/Los_Angeles
- [ ] All dates are valid ISO 8601 (YYYY-MM-DD)

---

## Workout References

- [ ] All week.workouts (non-null) exist in workouts.json
- [ ] Week has exactly 7 workout assignments (mon-sun)
- [ ] Workout IDs follow format (workout-{slug} or workout-{timestamp})
- [ ] Workout references are version-pinned (workoutId@vN)
- [ ] Draft workouts are never valid targets
- [ ] Workouts have all three tiers (MED, LRG, XL) OR fallback rules are applied
- [ ] Each tier has non-empty structure array

---

## Intensity

- [ ] Every interval target has RPE (1-10 integer)
- [ ] HR% if present is 0-100 integer
- [ ] PaceTag if present is from valid enum (recovery/easy/steady/tempo/threshold/interval/hard)
- [ ] Cues are arrays (can be empty [])
- [ ] Repeat if present has count (≥1) and rest (string)

---

## IDs

- [ ] Season IDs are unique
- [ ] Block IDs are unique
- [ ] Week IDs are unique
- [ ] Workout ID + version combinations are unique
- [ ] Member IDs are unique
- [ ] Event IDs are unique
- [ ] Challenge IDs are unique
- [ ] All IDs follow kebab-case format (lowercase, hyphens only)

---

## Status/Enums

- [ ] Workout status: draft | published | archived
- [ ] Member status: active | paused | alumni
- [ ] Event type: 5k | 10k | half | marathon | ultra | trail | custom
- [ ] Event visibility: public | team | private
- [ ] Challenge type: streak | cumulative | single-effort
- [ ] Member tier: MED | LRG | XL

---

## Immutability

- [ ] Seasons are immutable once written to seasons.json
- [ ] Blocks are immutable once written to blocks.json
- [ ] Weeks are immutable once written to weeks.json
- [ ] Workout versions referenced by weeks cannot be deleted

---

## Roster

- [ ] Member tier: MED | LRG | XL
- [ ] Member email is valid and unique
- [ ] Member joined_at is valid date (YYYY-MM-DD)
- [ ] Member seasonId if present references existing season
- [ ] All consent flags are boolean (true/false)

---

## Events

- [ ] Event date is valid (YYYY-MM-DD)
- [ ] Event routeGroupId if present matches routes/ folder
- [ ] Event variants if present are MED/LRG/XL only

---

## Challenges

- [ ] Challenge startDate < endDate
- [ ] Challenge dates are valid ISO dates
- [ ] Challenge leaderboardEnabled is boolean

---

## Cross-File

- [ ] No orphaned weeks (all weeks referenced by exactly one season)
- [ ] Blocks do not mix seasons (all block weeks share a seasonId)
- [ ] Roster seasonId assignments reference existing seasons

---

## Data Types

- [ ] Arrays are [] when empty, never null
- [ ] Required fields are present and not null
- [ ] Required strings have length > 0
- [ ] RPE: 1-10
- [ ] HR%: 0-100
- [ ] Version: ≥ 1
- [ ] Repeat count: ≥ 1
- [ ] Timestamps include timezone

---

## Forbidden Patterns

- [ ] No computed values stored (volume totals, counts, durations)
- [ ] No athlete-specific data (completion, zones, max HR)
- [ ] No meaning duplication (event dates in notes, etc.)
- [ ] No reverse references (workouts → weeks, events → blocks)
- [ ] No immutability violations (edits to canonical spine entries)

---

## Validation Timing

### On Write (Canonical Spine)
Run: Structural + date + reference + data type invariants

### On Workout Publish
Run: Workout tier completeness, versioning, intensity rules

