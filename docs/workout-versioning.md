# Workout Versioning

Workouts are reusable library items. Multiple weeks can reference the same workout. When a coach edits a workout, published plans must remain unchanged.

This document defines how workout versioning preserves immutability while allowing library evolution.

---

## THE PROBLEM

**Scenario:**
1. Coach creates `workout-tempo-40`
2. Coach assigns it to Week 1, Week 3, Week 7 in Season A
3. Coach publishes Season A
4. Coach later edits `workout-tempo-40` to fix a cue or adjust duration
5. **Question:** Do all weeks in Season A see the updated workout?

**Wrong answer:** Yes (violates immutability)

**Correct answer:** No (Season A references the original version)

---

## THE SOLUTION: COPY-ON-PUBLISH

When a season is published (`draft` → `active`), all referenced workouts are **versioned**.

The season references a specific version. Future edits create new versions.

---

## IMPLEMENTATION STRATEGY

### Workout Schema Addition

Every workout has a version identifier:

```json
{
  "workoutId": "workout-tempo-40",
  "version": 1,
  "name": "Tempo 40",
  "tiers": { "MED": {...}, "LRG": {...}, "XL": {...} },
  "createdAt": "2026-01-10T10:00:00Z",
  "updatedAt": "2026-01-10T10:00:00Z"
}
```

**Rules:**
- `version` starts at 1 for all new workouts
- `createdAt` never changes
- `updatedAt` changes when workout is edited

---

## REFERENCE FORMAT

### Draft Plans (before publish)

Weeks reference workouts by ID only:

```json
{
  "weekId": "week-1",
  "workouts": {
    "mon": null,
    "tue": "workout-tempo-40",
    "wed": null,
    ...
  }
}
```

**Behavior:** Viewer looks up current version in workouts.json

**Why:** Draft plans should always show latest workout content during authoring

---

### Published Plans (after publish)

Weeks reference workouts with version pinning:

```json
{
  "weekId": "week-1",
  "workouts": {
    "mon": null,
    "tue": "workout-tempo-40@v1",
    "wed": null,
    ...
  }
}
```

**Behavior:** Viewer looks up `workout-tempo-40` version 1 specifically

**Why:** Published plans must not change when library evolves

---

## PUBLISH-TIME BEHAVIOR

When coach clicks "Publish" on a season:

1. **System validates all workout references exist**
2. **For each workout reference in the season:**
   - Read current `version` from workouts.json
   - Update week's `workouts` to include `@v{version}` suffix
3. **Set season status to `active`**
4. **Record `publishedAt` timestamp**

**Example transformation:**

**Before publish:**
```json
{
  "weekId": "week-1",
  "workouts": {
    "tue": "workout-tempo-40"
  }
}
```

**After publish:**
```json
{
  "weekId": "week-1",
  "workouts": {
    "tue": "workout-tempo-40@v1"
  }
}
```

---

## EDITING WORKOUTS

### Before Any Season Uses It

Workout is in library but not yet referenced by any published season.

**Action:** Coach edits the workout directly

**Behavior:**
- Content is updated in-place
- Version stays at 1 (or current version)
- `updatedAt` timestamp is updated
- No versioning needed yet

---

### After Draft Seasons Reference It

Workout is referenced by draft seasons (not yet published).

**Action:** Coach edits the workout

**Behavior:**
- Content is updated in-place
- Version stays at 1 (or current version)
- Draft seasons see the updated content immediately
- `updatedAt` timestamp is updated

**Why:** Draft seasons should see live updates during authoring

---

### After Published Seasons Reference It

Workout is referenced by one or more published seasons.

**Action:** Coach attempts to edit the workout

**Builder tool behavior:**

**Option A: Create New Version (Recommended)**

1. Show dialog: "This workout is used in published plans. Creating a new version."
2. Increment version: `version: 2`
3. Update content
4. Update `updatedAt` timestamp
5. Published plans continue referencing `@v1`
6. New/draft plans reference `@v2` (or unversioned, which resolves to latest)

**Option B: Warn and Allow (Simpler, but requires discipline)**

1. Show warning: "This workout is used in published plans. Edits will only affect new plans."
2. Increment version: `version: 2`
3. Proceed with edit
4. Published plans have `@v1` references (frozen)
5. New plans reference current version

**Option C: Copy to New Workout (Most Conservative)**

1. Show dialog: "This workout is locked. Create a copy to edit?"
2. Create new workout: `workout-tempo-40-v2` (new ID)
3. Original workout remains unchanged
4. Coach must manually update draft plans to use new workout

**Recommended:** Option A (automatic versioning with increment)

---

## WORKOUT STORAGE

### Single File with Versions

Store all versions in workouts.json:

```json
{
  "workouts": [
    {
      "workoutId": "workout-tempo-40",
      "version": 1,
      "name": "Tempo 40",
      "tiers": {...},
      "createdAt": "2026-01-10T10:00:00Z",
      "updatedAt": "2026-01-10T10:00:00Z"
    },
    {
      "workoutId": "workout-tempo-40",
      "version": 2,
      "name": "Tempo 40",
      "tiers": {...},
      "createdAt": "2026-01-10T10:00:00Z",
      "updatedAt": "2026-02-15T14:30:00Z"
    }
  ]
}
```

**Lookup logic:**
- `workout-tempo-40` (no version) → latest version (v2)
- `workout-tempo-40@v1` → version 1 specifically
- `workout-tempo-40@v2` → version 2 specifically

**Benefits:**
- Simple file structure
- All versions in one place
- Easy to see version history

**Drawbacks:**
- File grows over time (acceptable — repo grows forever by design)

---

## VIEWER BEHAVIOR

### Rendering Workouts

**For draft plans:**
```
Reference: "workout-tempo-40"
Lookup: Find workout with workoutId="workout-tempo-40", highest version
Display: Latest content
```

**For published plans:**
```
Reference: "workout-tempo-40@v1"
Parse: workoutId="workout-tempo-40", version=1
Lookup: Find workout with workoutId="workout-tempo-40" AND version=1
Display: Frozen content from version 1
```

**If version not found:**
- Log error
- Fall back to latest version with warning banner: "This workout version is missing. Showing latest version instead."

---

## WHY THIS PROTECTS ATHLETES

**Without versioning:**
1. Athlete sees "Tempo 40" on Monday (20min tempo)
2. Coach edits workout Thursday (changes to 30min tempo)
3. Athlete's view changes mid-week
4. Confusion and lost trust

**With versioning:**
1. Athlete sees "Tempo 40" on Monday (20min tempo, v1)
2. Coach edits workout Thursday (creates v2, 30min tempo)
3. Athlete still sees v1 (20min tempo)
4. Consistency maintained

---

## WHY THIS PROTECTS COACHES

**Without versioning:**
1. Coach builds Season A with workout X (5 reps)
2. Coach builds Season B with workout X (8 reps, edited)
3. Season A now shows 8 reps retroactively
4. Coach doesn't realize historical data changed

**With versioning:**
1. Coach builds Season A with workout X v1 (5 reps)
2. Coach edits workout X (creates v2, 8 reps)
3. Season A frozen at v1 (5 reps)
4. Season B uses v2 (8 reps)
5. Both seasons accurate to their time

---

## WHY THIS PROTECTS REUSE

**Goal:** Workouts should be reusable across seasons, blocks, and weeks

**Without versioning:**
- Reuse is risky (editing affects all references)
- Coaches duplicate workouts instead (library bloat)
- Semantic meaning is lost (is "Tempo 40" the same workout or different?)

**With versioning:**
- Reuse is safe (editing creates new version)
- Library stays clean (one workout, multiple versions)
- Historical accuracy (past plans reference past versions)

---

## DELETION POLICY

### Can workouts be deleted?

**If never referenced by any season:** Yes

**If referenced by draft seasons only:** Yes, but show warning: "X draft plans use this workout"

**If referenced by published seasons:** No

**Rule:** Workouts referenced by published plans are permanent. They can be hidden from library UI, but the data must remain.

### Hiding old versions

Builder tools MAY hide old versions from the library browser to reduce clutter:

- Show only latest version by default
- Provide "Show all versions" option
- Published plans continue accessing old versions via data layer

**Old versions must remain in workouts.json** for referential integrity.

---

## EDGE CASES

### Coach wants to "fix a typo" in a published workout

**Scenario:** Coach notices a cue says "Comfortbly hard" (typo) in a published plan.

**Wrong approach:** Edit the workout in place ❌

**Correct approach:**
1. Accept that the published plan has the typo
2. Edit the workout (creates new version with fix)
3. Future plans will use corrected version
4. Or: If typo is critical, communicate correction to athletes separately

**Principle:** Even typos don't justify breaking immutability.

---

### Athlete sees "version 3" in their plan and asks why

**This should not happen.** Viewer UI should abstract versioning.

**Correct display:**
- Workout name: "Tempo 40"
- No version number shown to athletes

Versioning is internal plumbing, not user-facing.

---

### Two seasons reference different versions of the same workout

**Scenario:**
- Season A (Spring 2026) uses `workout-tempo-40@v1` (20min tempo)
- Season B (Fall 2026) uses `workout-tempo-40@v2` (30min tempo)

**Behavior:** This is correct and expected.

**Coach view:**
- Library shows "Tempo 40" (current version: v2)
- Season A shows version 1 (20min)
- Season B shows version 2 (30min)

**Athlete view:**
- Athletes in Season A see 20min tempo
- Athletes in Season B see 30min tempo
- No version numbers shown

**Why this is good:** Workouts evolve over time. Versioning captures that evolution without breaking past plans.

---

### Coach wants to "roll back" a workout edit

**Scenario:** Coach edits workout (creates v2), then realizes v1 was better.

**Solution:** Create v3 that duplicates v1 content.

**Why not restore v1 as latest?** Version numbers must be monotonically increasing. Never reuse or skip version numbers.

**Alternative:** Builder tool could provide "Restore from version X" action that creates a new version with old content.

---

## VALIDATION RULES

Builder tools must enforce:

- [ ] New workouts start at `version: 1`
- [ ] Editing a workout increments version number
- [ ] Version numbers are monotonically increasing (never skip or reuse)
- [ ] `createdAt` never changes
- [ ] `updatedAt` changes on every edit
- [ ] Publishing a season pins all workout references to current versions (adds `@v{X}` suffix)
- [ ] Workouts referenced by published plans cannot be deleted
- [ ] Versioned references (`workout-id@vN`) resolve to specific versions
- [ ] Unversioned references (`workout-id`) resolve to latest version

Viewer tools must enforce:

- [ ] Parse `@vN` suffix from workout references
- [ ] Look up specific version if pinned
- [ ] Fall back to latest version if reference is unversioned (draft plans)
- [ ] Never expose version numbers to athletes in UI
- [ ] Log errors if referenced version is missing

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Basic Versioning
- [ ] Add `version` field to workout schema (default: 1)
- [ ] Add `updatedAt` field to workout schema
- [ ] Implement version increment on edit
- [ ] Store all versions in workouts.json (unique by workoutId + version)

### Phase 2: Publish-Time Pinning
- [ ] On season publish, resolve all workout references
- [ ] Append `@v{X}` suffix to all `workouts` in weeks
- [ ] Validate all versions exist before publishing

### Phase 3: Viewer Support
- [ ] Parse versioned references (`workout-id@vN`)
- [ ] Lookup logic for specific versions
- [ ] Fallback to latest for unversioned refs
- [ ] Hide version numbers in athlete UI

### Phase 4: Builder UX
- [ ] Show "Used in X published plans" badge on workouts
- [ ] Warn when editing workouts in published plans
- [ ] Show version history in workout detail view
- [ ] Provide "Restore from version" action

---

## SUMMARY

**Workout versioning is not optional. It's the bridge between library reuse and plan immutability.**

- Workouts are versioned on edit
- Draft plans reference latest version
- Published plans pin specific versions
- Old versions are permanent
- Athletes never see version numbers
- Reuse is safe; evolution is tracked

**When in doubt: version it.**

