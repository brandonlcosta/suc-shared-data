# Data Contract

This document defines ownership boundaries for Team-SUC shared data.

Every piece of data has ONE canonical home. Everything else is either a reference (ID) or derived (computed at render time).

---

## seasons.json

### OWNS
- Season identity (ID, name)
- Season date range (startDate, endDate)
- Fixed timezone (America/Los_Angeles)
- Week ordering (weekIds in chronological order)

### DOES NOT OWN
- Block metadata (belongs to blocks)
- Workout content (belongs to workouts)
- Athlete assignments (belongs to roster)
- Volume totals (derived from workouts)
- Event details (belongs to events)

### REFERENCES
- **OUT:** `weekIds[]` -> weeks.json
- **IN:** roster.json -> `seasonId`

### BUILDER RESPONSIBILITY
- Create seasons
- Set date range and timezone
- Order weeks in `weekIds`
- Ensure weeks fall within season dates

### VIEWER RESPONSIBILITY
- Resolve active season by date
- Display block progression via week.blockId
- Compute total season duration
- Cannot modify

---

## blocks.json

### OWNS
- Block identity (ID, name)
- Block intent statement (athlete-facing)
- Week grouping (weekIds in chronological order)

### DOES NOT OWN
- Workout content (belongs to workouts)
- Week-day assignments (belongs to weeks)
- Season dates (belongs to seasons)
- Volume totals (derived from weeks)
- Event details (belongs to events)

### REFERENCES
- **OUT:** `weekIds[]` -> weeks.json
- **IN:** weeks.json -> `blockId`

### BUILDER RESPONSIBILITY
- Create blocks as descriptive groupings
- Assign weeks to blocks
- Keep weekIds ordered and contiguous in the season

### VIEWER RESPONSIBILITY
- Display block name and intent
- Group weeks by block
- Cannot modify

---

## weeks.json

### OWNS
- Week identity (ID, start date)
- Parent linkage (seasonId, blockId)
- Day-to-day workout assignments (7-day structure)

### DOES NOT OWN
- Workout content (belongs to workouts)
- Volume totals (derived from workouts)
- Athlete completion status (belongs to athlete-specific data)

### REFERENCES
- **UP:** `seasonId` -> seasons.json
- **UP:** `blockId` -> blocks.json
- **OUT:** `workouts.{day}` -> workouts.json
- **IN:** seasons.json -> `weekIds[]`

### STRUCTURE RULES
- Weeks always start on Monday
- `workouts` object has exactly 7 keys: mon, tue, wed, thu, fri, sat, sun
- Rest days are explicit `null`, never omitted
- Each workout reference must exist in workouts.json
- Workout references are version-pinned: `workoutId@vN`

### BUILDER RESPONSIBILITY
- Create weeks and assign them to seasons and blocks
- Assign workouts to days (version-pinned)
- Set rest days explicitly as null
- Ensure start date is a Monday
- Ensure weeks fit within season bounds

### VIEWER RESPONSIBILITY
- Display 7-day week structure
- Show workout names and rest days
- Compute total week volume (derived)
- Cannot modify

---

## workouts.json

### OWNS
- Workout identity (ID, name, description)
- Tier-specific structures (MED, LRG, XL)
- Interval definitions (type, duration, target, cues, repeat)
- Intensity prescription (RPE required, HR% optional, paceTag optional)
- Workout tags (for filtering/search)
- Creation timestamp

### DOES NOT OWN
- Week assignments (belongs to weeks)
- Athlete completion logs (belongs to athlete-specific data)
- Athlete-specific pace zones (viewer computes locally)
- Volume totals (derived from structure)

### REFERENCES
- **IN:** weeks.json -> `workouts.{day}`

### STRUCTURE RULES
- Preferred: every workout includes all three tiers: MED, LRG, XL
- If a tier is missing, viewer applies fallback: XL → LRG → MED, LRG → MED, MED → first available tier
- Fallback must be recorded in viewer output
- Every interval target MUST have `rpe` (1-10 scale)
- HR% is optional (0-100 if present)
- PaceTag is optional (enum: recovery, easy, steady, tempo, threshold, interval, hard)
- Cues are always arrays (empty array if none)

### BUILDER RESPONSIBILITY
- Create workouts in library
- Define all three tier variants
- Set RPE on every interval
- Optionally provide HR% and paceTag context
- Add searchable tags

### VIEWER RESPONSIBILITY
- Display workout for athlete's assigned tier
- Compute total workout duration
- Convert HR% to BPM using athlete's local max HR
- Display paceTag as contextual label
- Never compute absolute pace values
- Cannot modify

### INTENSITY HIERARCHY (enforced in viewer)
```
RPE (required)    ← Anchor - what the coach prescribes
  ↓
HR% (optional)    ← Reference - what a viewer might display
  ↓
PaceTag (optional) ← Context - friendly label
```

Max HR is NEVER in this file. Athletes input it locally in viewer.

---

## events.json

### OWNS
- Event identity (ID, name, date, location)
- Event type (5k, 10k, half, marathon, ultra, trail, custom)
- Visibility (public, team, private)
- Distance variants (if applicable)
- Route references (if applicable)
- External URL
- Context notes

### DOES NOT OWN
- Block assignments (events are independent of the season spine)
- Athlete registration (belongs to athlete-specific data)
- Results or times (not a results database)
- Training plan logic (events do not trigger auto-adjustments)

### REFERENCES
- **OUT:** `routeGroupId` (optional) → routes/ folder

### BUILDER RESPONSIBILITY
- Create events (races, team events)
- Set visibility appropriately
- Link to route data if applicable
- Provide external race URL

### VIEWER RESPONSIBILITY
- Display event calendar (separate from training structure)
- Show events as independent calendar context
- Compute which week contains event date
- Cannot modify

### CRITICAL RULE
Events are **reality anchors**, not plan drivers. They do not:
- Auto-generate taper weeks
- Modify workout intensity
- Trigger plan restructuring
- Require athlete registration tracking

---

## roster.json

### OWNS
- Member identity (ID, name, email)
- Membership status (active, paused, alumni)
- Tier assignment (MED, LRG, XL)
- Season assignment
- Training context (goal, typical mileage)
- Consent flags (public visibility permissions)
- Join date
- Internal coach notes

### DOES NOT OWN
- Season content (belongs to seasons/blocks/weeks)
- Workout content (belongs to workouts)
- Training logs (belongs to athlete-specific data)
- Performance metrics (belongs to athlete-specific data)

### REFERENCES
- **OUT:** `seasonId` → seasons.json
- **OUT:** `tier` → workouts.json (tier filter)

### BUILDER RESPONSIBILITY
- Create member records
- Assign members to seasons
- Set tier recommendation
- Manage consent flags
- Update status (active, paused, alumni)

### VIEWER RESPONSIBILITY
- Authenticate member
- Display assigned season
- Filter workouts by assigned tier
- Respect consent flags for public displays
- Cannot modify (except own profile in controlled settings)

---

## challenges.json

### OWNS
- Challenge identity (ID, name, dates)
- Challenge type (streak, cumulative, single-effort)
- Description
- Visibility (public, team, private)
- Leaderboard flag

### DOES NOT OWN
- Athlete participation (belongs to athlete-specific data)
- Completion tracking (belongs to athlete-specific data)
- Season/block/week structure (challenges are independent)

### REFERENCES
- None (challenges are fully independent)

### BUILDER RESPONSIBILITY
- Create challenges
- Set dates and visibility
- Enable/disable leaderboards

### VIEWER RESPONSIBILITY
- Display active challenges
- Track participation (viewer-side state only)
- Show leaderboards if enabled
- Cannot modify

### CRITICAL RULE
Challenges are **opt-in motivation**, not structure. They:
- Do not modify training plans
- Do not affect seasons/blocks/weeks
- Do not require coach approval for participation
- Are tracked entirely in viewer-side data

---

## REFERENCE DIRECTION RULES

### Parent -> Child (Structure)
```
Season -> Week -> Workout (reference only)
Block -> Week (descriptive grouping)
```

### Child -> Parent (Backref)
```
Week -> Season (seasonId)
Week -> Block (blockId)
```

### Horizontal (Optional Context)
```
Member -> Season (seasonId)
```

### Library (Reusable, No Ownership)
```
Week -> Workout (many weeks can reference same workout)
```

---

## BUILDER VS VIEWER BOUNDARIES

| Responsibility | Builder (Coach Tools) | Viewer (Athlete Apps) |
|----------------|----------------------|----------------------|
| **Create structure** | ✅ | ❌ |
| **Edit draft plans** | ✅ | ❌ |
| **Publish plans** | ✅ | ❌ |
| **Assign athletes** | ✅ | ❌ |
| **Read structure** | ✅ | ✅ |
| **Compute derived data** | ⚠️ (optional) | ✅ (required) |
| **Store athlete logs** | ❌ | ✅ (local only) |
| **Store athlete zones** | ❌ | ✅ (local only) |
| **Modify published plans** | ❌ | ❌ |

⚠️ Builders MAY compute derived data for preview/validation purposes, but MUST NOT store it in shared data.

---

## FORBIDDEN ACTIONS

The following are **explicitly prohibited** and violate the data contract:

❌ Storing volume totals in weeks.json or blocks.json
❌ Storing athlete-specific pace zones in workouts.json
❌ Storing completion status in weeks.json
❌ Storing athlete assignments in seasons.json (belongs in roster.json)
❌ Storing event dates in week notes (duplicates events.json)
❌ Storing computed values anywhere in shared data
❌ Creating athlete-specific workout variants in workouts.json
❌ Modifying canonical seasons/blocks/weeks (see immutability.md)
❌ Creating reverse references that violate direction rules

---

## VALIDATION BOUNDARY

Builder tools MUST enforce:
- All references resolve (no dangling IDs)
- Date ranges nest correctly (season contains weeks)
- Required fields are present
- Enum values match allowed sets
- Tiers exist (MED, LRG, XL on all workouts)
- RPE exists on all interval targets
- Week start dates are Mondays
- Canonical objects are not edited

Viewer tools MUST enforce:
- Read-only access to shared data
- Athlete-specific data stays local
- Derived values are computed, never stored
- No mutations propagate to shared data

---

## WHEN IN DOUBT

If you're unsure where data belongs, ask:

1. **Is this structural or athlete-specific?**
   - Structural → shared data
   - Athlete-specific → viewer local storage

2. **Is this a source of truth or derived?**
   - Source of truth → store in appropriate JSON
   - Derived → compute at render time

3. **Would changing this affect other athletes?**
   - Yes → shared data (if structural)
   - No → viewer local storage

4. **Is this about the plan or the execution?**
   - The plan → shared data
   - The execution → viewer local storage

**Default answer: When in doubt, DON'T add it to shared data.**















