# Immutability Rules

> NOTE (2026-02-01): The canonical calendar spine now lives in `data/seasons.json`, `data/blocks.json`, and `data/weeks.json`.
> These canonical files are immutable once written. Legacy publish/draft flows in `seasons/deprecated/` remain for reference only.

Published training plans do not change. This is a non-negotiable design principle.

Athletes need stability. Coaches need version control. Immutability provides both.

---

## LIFECYCLE STATES

### Draft
**Status:** `"draft"`

The plan is being authored. Full mutability.

**Allowed actions:**
- Create new seasons, blocks, weeks
- Edit any field
- Assign workouts
- Reorder blocks or weeks
- Delete objects
- Change dates
- Modify notes

**Visibility:**
- Coach tools only
- Not visible to athletes
- Not assigned to roster members

**Rule:** Draft plans can be changed freely. This is the working state.

---

### Active
**Status:** `"active"`

The plan is published and assigned to athletes. Structure is frozen.

**Triggering event:**
- Coach explicitly sets `status: "active"`
- System records `publishedAt` timestamp
- **This action is irreversible until archival**

**Allowed actions:**
- View all content (coach and athletes)
- Assign to roster members
- Change status to `"archived"` only

**Forbidden actions:**
- Edit season/block/week dates
- Edit block/week ordering
- Edit workout assignments
- Edit focus or notes
- Add or remove blocks or weeks
- Delete the season

**Visibility:**
- Visible to assigned athletes
- Read-only in coach tools

**Rule:** Once active, structure is locked. Only status changes allowed.

---

### Archived
**Status:** `"archived"`

The plan is historical. Fully immutable.

**Triggering event:**
- Coach sets `status: "archived"` on an active plan
- Typically done after season end date passes

**Allowed actions:**
- View for historical reference
- Cannot be reactivated

**Forbidden actions:**
- Edit any content
- Assign to new members
- Change status back to active or draft

**Visibility:**
- Visible to coach tools (historical view)
- Optionally visible to athletes who completed it
- Not available for new assignments

**Rule:** Archived plans are read-only forever.

---

## STATUS TRANSITIONS

```
   create          publish          archive
draft ────────> active ────────> archived
  ↑                │
  │                │
  └─ can delete   └─ only status change allowed
```

**Valid transitions:**
- `draft` → `active` (publish)
- `active` → `archived` (close out)

**Invalid transitions:**
- `active` → `draft` (cannot unpublish)
- `archived` → `active` (cannot resurrect)
- `archived` → `draft` (cannot resurrect)

**Deletion:**
- `draft` plans can be deleted entirely
- `active` plans cannot be deleted (only archived)
- `archived` plans cannot be deleted (permanent record)

---

## WHAT FREEZES AT PUBLISH TIME

When `status` changes from `draft` to `active`, the following become immutable:

### Season
- `seasonId` (already immutable)
- `name`
- `startDate`, `endDate`
- `blockIds` (order and contents)
- `notes`

**Only `status` can change.**

### Block
- `blockId` (already immutable)
- `seasonId`
- `name`
- `phase`
- `startDate`, `endDate`
- `weekIds` (order and contents)
- `eventId`
- `focus`
- `notes`

**Nothing can change.**

### Week
- `weekId` (already immutable)
- `blockId`
- `name`
- `startDate`
- `workoutIds` (all 7 days)
- `notes`

**Nothing can change.**

### Workouts
**See workout-versioning.md for full rules.**

Summary: Workouts referenced by active seasons are versioned. Editing a workout creates a new version. Active seasons continue referencing the original version.

---

## WHAT REMAINS MUTABLE FOREVER

### Roster
- Member assignments (`seasonId` can change)
- Member status (active, paused, alumni)
- Member tier (can be adjusted)
- Consent flags (can be updated)
- Context notes (can be updated)

**Why:** These are administrative, not structural. Changing an athlete's tier doesn't change the plan itself.

### Events
- Event details (name, location, URL, notes)
- Visibility settings

**Why:** Events exist independently. Correcting event info doesn't alter training structure.

**Exception:** Event dates should be changed with extreme caution if events are referenced by active blocks.

### Challenges
- Challenge details
- Leaderboard settings
- Visibility

**Why:** Challenges are opt-in and separate from structure.

---

## IMMUTABILITY ENFORCEMENT

### Builder Tool Responsibilities

1. **Before publish:**
   - Validate all required fields
   - Check date ranges nest correctly
   - Verify all workout references exist
   - Ensure tiers are complete
   - Confirm RPE on all intervals

2. **On publish:**
   - Set `status: "active"`
   - Record `publishedAt` timestamp
   - Lock UI for editing structure
   - Show confirmation: "This plan is now published and cannot be edited. Athletes will see this plan immediately."

3. **After publish:**
   - Disable edit buttons for structure
   - Show "Published" badge
   - Only allow status change to archived
   - Prevent deletion

### Viewer Tool Responsibilities

1. **Display only:**
   - Never write to seasons.json, blocks.json, weeks.json, workouts.json
   - Compute derived values locally
   - Store athlete-specific data separately

2. **No mutation:**
   - No API calls that modify structure
   - No local edits that sync back
   - Read-only mode enforced

---

## WHY THIS MATTERS

### For Athletes
**Problem without immutability:**
- Week 3 says "Long Run 90"
- Athlete sees it Monday, plans their weekend
- Coach edits it to "Long Run 120" on Thursday
- Athlete shows up unprepared

**Solution with immutability:**
- Published plans don't change
- Athletes can plan with confidence
- No surprise modifications

### For Coaches
**Problem without immutability:**
- Coach edits a workout to fix a typo
- Accidentally changes intensity for 50 athletes
- Can't remember original version
- No audit trail

**Solution with immutability:**
- Published plans are locked
- Edits require creating new versions
- Audit trail via `publishedAt` timestamps
- Clear versioning

### For System Integrity
**Problem without immutability:**
- Workout library is edited
- All weeks referencing it change retroactively
- Historical data becomes meaningless
- Can't reproduce past training

**Solution with immutability:**
- Workout versioning (see workout-versioning.md)
- Published plans reference specific versions
- Historical accuracy maintained

---

## WHAT IF THE COACH MADE A MISTAKE?

### Scenario: Published plan has an error

**Wrong approach:**
Edit the active plan directly. ❌

**Correct approach:**
1. **For minor issues (typo in notes, cue wording):**
   - Document the correction in a supplement (e.g., team announcement)
   - Accept that the JSON remains as-is
   - Learn for next season

2. **For major issues (wrong workout assigned, impossible volume):**
   - Notify affected athletes immediately
   - Provide corrected guidance separately (email, app notification)
   - For future weeks: If absolutely necessary, create a new season version and reassign athletes
   - For past weeks: Accept the mistake, document it

3. **For catastrophic issues (plan is fundamentally broken):**
   - Archive the broken plan
   - Create a new draft season
   - Publish the corrected plan
   - Reassign athletes to new season
   - Document why in notes

**Key principle:** The error of allowing retroactive edits is worse than the error of leaving a mistake in place.

---

## FORBIDDEN ACTIONS

The following are **explicitly prohibited** after a plan is published:

❌ Editing season dates
❌ Reordering blocks
❌ Adding or removing blocks
❌ Reordering weeks
❌ Adding or removing weeks
❌ Changing workout assignments in weeks
❌ Editing block focus or notes
❌ Editing week notes
❌ Changing event references
❌ Editing workout content that's versioned to this plan (see workout-versioning.md)
❌ Deleting the season
❌ Changing status back to draft

**Only allowed change:** `status: "active"` → `status: "archived"`

---

## EDGE CASES

### Can a coach copy a published plan to create a new draft?

**Yes.** Copying is not mutation.

Process:
1. Select active plan
2. Click "Duplicate to Draft"
3. System creates new season with new ID
4. All blocks/weeks/workouts are copied
5. New season starts in `draft` status
6. Coach can edit freely
7. Original plan remains unchanged

### Can an athlete be reassigned to a different season mid-cycle?

**Yes.** Roster assignments are mutable.

Process:
1. Coach changes `member.seasonId` in roster.json
2. Athlete's viewer app now shows new season
3. Old season remains unchanged
4. No retroactive effects

### Can workout library items be edited if they're in active plans?

**See workout-versioning.md.** Short answer: Edits create new versions. Active plans reference the old version.

### What if an event date changes after a block references it?

**Allowed but risky.**

- Events.json can be edited (event dates are mutable)
- Blocks referencing the event don't change
- Viewer logic computes which week contains the event based on current event date
- If event moves to a different week, block structure doesn't adapt

**Recommendation:** Avoid changing event dates after blocks reference them. If necessary, communicate the change separately to athletes.

---

## IMPLEMENTATION CHECKLIST

Builder tools must enforce:

- [ ] Draft plans show "Draft" badge and allow all edits
- [ ] Publish action shows confirmation dialog with warnings
- [ ] Active plans show "Published" badge and disable structure edits
- [ ] Active plans only allow status change to archived
- [ ] Archived plans are fully read-only
- [ ] Deletion is blocked for active and archived plans
- [ ] UI clearly indicates when fields are locked
- [ ] Duplicate action creates new draft from active plan

Viewer tools must enforce:

- [ ] All shared data access is read-only
- [ ] No API endpoints for mutating structure
- [ ] Athlete-specific data stored separately
- [ ] No local edits sync back to shared data

---

## SUMMARY

**Immutability is not optional. It's the foundation of trust.**

- Draft plans are mutable
- Published plans are immutable
- Archived plans are immutable forever
- Roster and events remain mutable (administrative, not structural)
- Mistakes are handled by communication and future corrections, not retroactive edits
- Copying is allowed; mutation is not

**When in doubt: if it's published, it's frozen.**
