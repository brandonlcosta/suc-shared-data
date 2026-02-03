# Validation Invariants

These are constraints that MUST hold true at all times. Builder tools must enforce them. Viewer tools must assume them.

Violations indicate corrupt data and must be prevented, not handled gracefully.

---

## STRUCTURAL INVARIANTS

### Season -> Week Spine

**S1. Season must reference at least one week**
- `seasons.json`: `weekIds` array must have length >= 1
- Empty seasons are meaningless

**S2. All season.weekIds must exist in weeks.json**
- No dangling references
- Lookup by `weekId` must succeed for every ID in the array

**S3. Weeks in season.weekIds must be in chronological order**
- For each consecutive pair (weekA, weekB) in `weekIds`:
  - `weekA.startDate < weekB.startDate`
- Week progression is sequential

**S4. Weeks must reference their parent season**
- `week.seasonId` must match a `seasonId` in seasons.json
- Parent reference must be valid

**S5. Block must reference at least one week**
- `blocks.json`: `weekIds` array must have length >= 1
- Empty blocks are meaningless

**S6. All block.weekIds must exist in weeks.json**
- No dangling references
- Lookup by `weekId` must succeed for every ID in the array

**S7. Weeks in block.weekIds must be in chronological order**
- For each consecutive pair (weekA, weekB) in `weekIds`:
  - `weekA.startDate < weekB.startDate`
- Week progression is sequential within the block

**S8. Week blockId must reference a valid block**
- `week.blockId` must match a `blockId` in blocks.json
- Parent reference must be valid

**S9. Block weekIds must be a subset of season.weekIds**
- Each `block.weekIds[]` value must appear in the parent season's `weekIds`
- Blocks are descriptive groupings within the season spine

---

## DATE INVARIANTS

**D1. Week start dates must be Mondays**
- Parse `week.startDate`
- Day of week must be Monday
- This is a locked convention

**D2. Weeks must not overlap within a season**
- For each season, weeks must be at least 7 days apart
- `weekB.startDate >= weekA.startDate + 7 days`
- Weeks can have gaps (intentional recovery weeks), but cannot overlap

**D3. Season start date must be before end date**
- `season.startDate < season.endDate`
- Zero-day or negative-day seasons are invalid

**D4. Season dates must fully contain all referenced weeks**
- For each week in `season.weekIds`:
  - `season.startDate <= week.startDate`
  - `season.endDate >= week.startDate + 6 days`
- Seasons define the outer boundary

**D5. Season timezone must be America/Los_Angeles**
- `season.timezone` must equal `America/Los_Angeles`
- Date resolution is fixed to Pacific time

**D6. Dates must be valid ISO 8601 format**
- Format: `YYYY-MM-DD`
- Must parse as valid calendar date
- No February 30, no month 13, etc.

---

## WORKOUT REFERENCE INVARIANTS

**W1. Week workout references must exist in workouts.json**
- For each non-null value in `week.workouts`:
  - Parse workout reference (format: `workoutId@vN`)
  - Workout must exist in workouts.json
  - Draft workouts are never valid targets
- No dangling workout references

**W2. Week must have exactly 7 workout assignments**
- `week.workouts` object must have exactly these keys: mon, tue, wed, thu, fri, sat, sun
- No missing days
- No extra days

**W3. Workout IDs must follow format rules**
- Format: `workout-{slug}` or `workout-{timestamp}`
- Must be lowercase, alphanumeric + hyphens only
- No spaces, no special characters

**W4. Workout references must be version-pinned**
- Format: `workoutId@vN` where N is a positive integer
- The referenced version must exist in workouts.json

**W5. Tier coverage must be deterministic**
- Preferred: workouts include all tiers (MED, LRG, XL)
- If missing, viewer MUST apply fallback rule:
  - XL -> LRG -> MED
  - LRG -> MED
  - MED -> first available tier
- Fallback must be recorded in viewer output

**W6. Each tier must have a non-empty structure array**
- `workout.tiers.MED.structure` must exist and have length >= 1
- Same for LRG and XL (or the fallback tier used)
- Empty workout structures are invalid

---

## INTENSITY INVARIANTS

**I1. Every interval target must have RPE**
- For every interval in every workout structure:
  - `interval.target.rpe` must exist
  - Must be an integer between 1 and 10 inclusive
- RPE is the anchor - non-optional

**I2. HR% if present must be valid**
- If `interval.target.hrPct` exists:
  - Must be an integer between 0 and 100 inclusive
  - Zero is allowed (active recovery)

**I3. PaceTag if present must be from valid set**
- If `interval.target.paceTag` exists:
  - Must be one of: `recovery`, `easy`, `steady`, `tempo`, `threshold`, `interval`, `hard`
  - Lowercase only
  - No custom tags

**I4. Cues must be arrays**
- `interval.cues` must be an array (can be empty)
- Even if no cues, must be `[]`, not null or absent

**I5. Repeat structure if present must be valid**
- If `interval.repeat` exists:
  - Must have `count` (positive integer)
  - Must have `rest` (string duration, e.g., "90sec")
  - Count must be ≥ 1

---

## ID INVARIANTS

**ID1. Season IDs must be unique**
- No two seasons can have the same `seasonId`
- Case-sensitive

**ID2. Block IDs must be unique**
- No two blocks can have the same `blockId`
- Case-sensitive

**ID3. Week IDs must be unique**
- No two weeks can have the same `weekId`
- Case-sensitive

**ID4. Workout IDs + versions must be unique**
- No two workouts can have the same combination of `workoutId` and `version`
- Same `workoutId` with different versions is allowed (that's versioning)

**ID5. Member IDs must be unique**
- No two roster members can have the same `id`
- Case-sensitive

**ID6. Event IDs must be unique**
- No two events can have the same `eventId`
- Case-sensitive

**ID7. Challenge IDs must be unique**
- No two challenges can have the same `challengeId`
- Case-sensitive

**ID8. IDs must follow naming conventions**
- Season: `{year}-{slug}` or `{slug}`, kebab-case
- Block: `block-{slug}` or `block-{timestamp}`, kebab-case
- Week: `week-{n}` or `week-{timestamp}`, kebab-case
- Workout: `workout-{slug}` or `workout-{timestamp}`, kebab-case
- Member: `{slug}`, kebab-case
- Event: `{slug}`, kebab-case
- Challenge: `{slug}`, kebab-case
- All lowercase, hyphens only, no spaces or special characters

---

## STATUS INVARIANTS

**ST1. Workout status must be valid**
- Must be one of: `draft`, `published`, `archived`
- Lowercase only

**ST2. Member status must be valid**
- Must be one of: `active`, `paused`, `alumni`
- Lowercase only

**ST3. Event type must be valid**
- Must be one of: `5k`, `10k`, `half`, `marathon`, `ultra`, `trail`, `custom`
- Lowercase only

**ST4. Event visibility must be valid**
- Must be one of: `public`, `team`, `private`
- Lowercase only

**ST5. Challenge type must be valid**
- Must be one of: `streak`, `cumulative`, `single-effort`
- Lowercase only

---

## IMMUTABILITY INVARIANTS

**IM1. Canonical seasons are immutable**
- Once written to `seasons.json`, fields must not change
- Changes require a new seasonId

**IM2. Canonical blocks are immutable**
- Once written to `blocks.json`, fields must not change
- Changes require a new blockId

**IM3. Canonical weeks are immutable**
- Once written to `weeks.json`, fields must not change
- Changes require a new weekId

**IM4. Referenced workout versions cannot be deleted**
- If a workout version is referenced by any week:
  - That version cannot be deleted
  - It may be archived but must remain in workouts.json

---

## ROSTER INVARIANTS

**R1. Member tier must be valid**
- Must be one of: `MED`, `LRG`, `XL`
- Uppercase only
- Matches workout tier keys

**R2. Member email must be valid format**
- Must match email format (basic validation)
- Must be unique across all members

**R3. Member joined_at must be valid date**
- Format: `YYYY-MM-DD`
- Must be in the past or today

**R4. Member seasonId if present must exist**
- If `member.seasonId` is not null:
  - Must reference a valid season in seasons.json

**R5. Consent flags must all be boolean**
- `consent.public_name` must be true or false
- Same for `public_story`, `public_photos`, `public_metrics`
- No null, no undefined

---

## EVENT INVARIANTS

**E1. Event date must be valid**
- Format: `YYYY-MM-DD`
- Must parse as valid calendar date

**E2. Event routeGroupId if present must exist**
- If `event.routeGroupId` is not null:
  - Must match a folder in `routes/` directory

**E3. Event variants if present must match tier names**
- If `event.variants` is not null:
  - Must be an array containing only: `MED`, `LRG`, `XL`
  - Uppercase only

---

## CHALLENGE INVARIANTS

**C1. Challenge dates must be valid**
- `startDate` and `endDate` must be valid ISO dates
- `startDate` must be before `endDate`

**C2. Challenge leaderboardEnabled must be boolean**
- Must be true or false
- No null, no undefined

---

## CROSS-FILE CONSISTENCY

**X1. No orphaned weeks**
- Every week in weeks.json must be referenced by exactly one season in seasons.json
- `week.seasonId` must match the owning season

**X2. Blocks must not mix seasons**
- All weeks referenced by a block must share the same `seasonId`

**X3. Roster season assignments must be valid**
- If roster member has `seasonId`:
  - Season must exist

---

## DATA TYPE INVARIANTS

**T1. Arrays must not be null**
- Fields defined as arrays must be `[]` if empty, never null
- Examples: `weekIds`, `cues`, `tags`

**T2. Required fields must not be null or absent**
- All fields marked as required in schemas must be present
- Must not be null (unless schema explicitly allows null, like workout assignment rest days)

**T3. Strings must not be empty when required**
- Required string fields must have length > 0
- Example: `name`, `workoutId`, `seasonId`

**T4. Numbers must be in valid ranges**
- RPE: 1-10
- HR%: 0-100
- Version: ≥ 1
- Repeat count: ≥ 1

**T5. Timestamps must include timezone**
- All ISO timestamps must have timezone indicator (Z or offset)
- Local times without timezone are invalid

---

## FORBIDDEN PATTERNS

These patterns must be actively prevented:

**F1. Do not store computed values**
- No volume totals in weeks or blocks
- No workout counts
- No duration sums
- All derived data must be computed at render time

**F2. Do not store athlete-specific data in shared files**
- No completion flags in weeks
- No personal pace zones in workouts
- No max HR in workouts
- Athlete data belongs in viewer local storage only

**F3. Do not duplicate meaning across files**
- Event dates must not be repeated in week notes
- Workout content must not be duplicated (use references)

**F4. Do not create reverse references**
- Workouts must not reference weeks
- Events must not reference blocks (blocks reference events)
- Parents reference children; children reference parents; no circular refs

**F5. Do not break immutability**
- Canonical season/block/week entries cannot be edited
- Version numbers must never decrease

---

## VALIDATION TIMING

### On Write (Canonical Spine)
- Enforce: ALL structural, date, reference, and data type invariants
- Reject any mutation to existing season/block/week entries

### On Workout Publish
- Enforce: Workout tier completeness, versioning, and intensity rules
- Reject publish if any invariant fails

---

## ERROR HANDLING

When validation fails:

**Builder tools:**
- Show clear error message
- Highlight invalid field
- Prevent save/publish until fixed
- Log validation error with context

**Viewer tools:**
- Log error (invalid data should never reach viewer)
- Show fallback UI or error state
- Do not attempt to "fix" data
- Report data corruption to monitoring

---

## VALIDATION CHECKLIST

Builder tools must validate:

- [ ] All ID uniqueness constraints
- [ ] All ID format rules
- [ ] All date formats and ranges
- [ ] All reference validity (no dangling refs)
- [ ] All required fields present
- [ ] All enum values from valid sets
- [ ] All data type constraints
- [ ] All structural hierarchy rules (season → week, block groupings)
- [ ] All immutability rules for canonical spine entries
- [ ] All workout tier completeness or fallback rules
- [ ] All intensity hierarchy rules (RPE required)

---

## SUMMARY

Validation is not optional. These invariants define structural integrity.

**When in doubt: reject the operation.**

Invalid data must never enter the system. It's better to block a coach's action than to corrupt the data spine.

Builder tools are the gatekeepers. Viewer tools are the consumers. Validation happens at the gate.










