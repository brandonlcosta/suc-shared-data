# Team-SUC Governance Documentation

This directory contains the authoritative rules for the Team-SUC data spine.

**These documents are law, not guidelines.**

---

## Purpose

The Team-SUC system separates Builders (coach tools) from Viewers (athlete apps) with a shared data layer.

These documents prevent accidental philosophy violations, scope creep, and structural drift.

---

## Core Documents

### [data-contract.md](./data-contract.md)
**What it defines:** Ownership boundaries for every JSON file

**Read this if:**
- You're building a new feature
- You're unsure where data belongs
- You're tempted to add a "convenient" field

**Key principle:** Every piece of data has ONE canonical home.

---

### [immutability.md](./immutability.md)
**What it defines:** Draft → Active → Archived lifecycle and what freezes when

**Read this if:**
- You're implementing publish/edit flows
- You're building athlete-facing views
- A coach wants to "just fix one thing" in a published plan

**Key principle:** Published plans do not change.

---

### [workout-versioning.md](./workout-versioning.md)
**What it defines:** How workout library evolution preserves plan immutability

**Read this if:**
- You're implementing workout editing
- You're building the publish flow
- You're rendering workouts in viewer apps

**Key principle:** Workouts are versioned; edits create new versions.

---

### [validation-invariants.md](./validation-invariants.md)
**What it defines:** Constraints that MUST hold at all times

**Read this if:**
- You're implementing save/publish logic
- You're writing validation code
- You're debugging data corruption

**Key principle:** Invalid data must never enter the system.

---

## Quick Start for Builders

**Before writing any code:**

1. Read [data-contract.md](./data-contract.md) in full
2. Understand which JSON files you'll touch
3. Read ownership rules for those files
4. Check "Forbidden Actions" section

**Before implementing publish:**

1. Read [immutability.md](./immutability.md)
2. Understand status transitions
3. Read [workout-versioning.md](./workout-versioning.md)
4. Understand copy-on-publish behavior

**Before implementing validation:**

1. Read [validation-invariants.md](./validation-invariants.md)
2. Implement checks for your feature area
3. Test with intentionally invalid data

---

## Quick Start for Viewers

**Before implementing athlete views:**

1. Read [data-contract.md](./data-contract.md) "BUILDER VS VIEWER BOUNDARIES"
2. Understand you are READ-ONLY
3. Read [workout-versioning.md](./workout-versioning.md) "VIEWER BEHAVIOR"
4. Implement versioned workout lookup

**Before storing athlete data:**

1. Check [data-contract.md](./data-contract.md) "DOES NOT OWN" sections
2. If it's athlete-specific, it stays local
3. Never sync to shared data
4. Store completion logs, zones, preferences locally only

---

## Design Principles (Non-Negotiable)

These truths underpin all governance documents:

1. **Season → Block → Week → Workout hierarchy is locked**
   - This is the mental model
   - Do not add parallel structures

2. **Builders write, viewers show**
   - Coaches create structure
   - Athletes consume structure
   - No athlete customization of shared data

3. **Published plans are immutable**
   - Athletes need stability
   - History must be accurate
   - Edits create new versions, never mutate old ones

4. **Workouts are reusable library items**
   - One workout, many references
   - Versioning enables safe reuse
   - No workout "ownership" by weeks

5. **Athlete-specific data never enters shared data**
   - Max HR, pace zones, completion logs: local only
   - Shared data is structure, not execution
   - Scaling is tiers, not customization

6. **RPE → HR% → PaceTag intensity hierarchy**
   - RPE is required anchor
   - HR% and PaceTag are optional context
   - No absolute pace calculations

7. **Events are context, never logic drivers**
   - Events exist independently
   - Blocks can reference events
   - Events never trigger auto-adjustments

8. **Metrics never drive structure**
   - Structure defines training
   - Metrics reflect execution
   - Volume, TSS, CTL: all derived, never stored

---

## What This System Is NOT

Read this before proposing new features:

❌ **Not TrainingPeaks**
- No auto-generated plans
- No TSS-driven planning
- No predictive modeling

❌ **Not Strava**
- No social feed
- No kudos or comments
- No public activity streams

❌ **Not a Calendar**
- Dates are boundaries, not scheduling
- No drag-and-drop rescheduling
- No "move workout to Tuesday" logic

❌ **Not a Planner**
- Coaches define structure manually
- No AI suggestions
- No auto-taper generation

❌ **Not Athlete-Customizable**
- Athletes view structure, not edit it
- No swapping workouts
- No "easier version" toggles

---

## Forbidden Additions

If you're tempted to add any of these, stop and re-read the docs:

❌ Volume totals in weeks.json or blocks.json
❌ Athlete completion flags in weeks.json
❌ Personal pace zones in workouts.json
❌ Calendar/scheduling logic in structure files
❌ Social features (comments, likes, sharing)
❌ Payment/subscription data in roster.json
❌ Event-driven plan mutations
❌ Auto-generated content
❌ Athlete-specific workout overrides
❌ Computed fields stored as data

**Rule:** If it's derived, compute it. If it's athlete-specific, store it locally. If it's not structure, it doesn't belong.

---

## When to Update These Docs

These documents should be updated when:

✅ A new JSON file is added (add to data-contract.md)
✅ A new validation rule is discovered (add to validation-invariants.md)
✅ A new immutability edge case is encountered (add to immutability.md)
✅ Workout versioning behavior is extended (update workout-versioning.md)

These documents should NOT be updated for:

❌ UI decisions
❌ Viewer-side features
❌ Builder tool UX
❌ Styling or presentation
❌ Performance optimizations
❌ External integrations

**Governance is about data structure and boundaries, not implementation details.**

---

## Enforcement

These rules are enforced by:

1. **Builder validation** — No invalid data can be saved or published
2. **Code review** — PRs that violate governance are rejected
3. **Automated tests** — Validation test suite checks all invariants
4. **Documentation review** — Schema changes require doc updates

**Violations are not negotiable.** If a feature requires breaking governance, the feature is wrong.

---

## Decision Authority

**For questions about governance:**

1. Check if the docs already answer it
2. If unclear, clarify the docs
3. If conflicting, governance wins over convenience

**For proposing changes to governance:**

1. Write RFC explaining why current rules don't work
2. Demonstrate the problem with real examples
3. Propose minimal change that preserves core principles
4. Get consensus before implementing

**Philosophy changes require extraordinary justification.**

---

## Success Criteria

These documents succeed when:

✅ A new engineer can determine where data belongs without asking
✅ A feature proposal is obviously in/out of scope
✅ Published plans remain stable for athletes
✅ Historical data is accurate and unchanging
✅ Coaches can reuse workouts safely
✅ Viewers never corrupt structure
✅ No "convenience" fields creep into shared data

**If you can violate a principle without the system stopping you, the system is broken.**

---

## Next Steps

**Phase 1:** Build Season Builder (structure authoring tool)

**Before starting:**
- [ ] Read all four governance docs
- [ ] Understand data-contract ownership
- [ ] Understand immutability lifecycle
- [ ] Understand workout versioning
- [ ] Review validation-invariants checklist

**During implementation:**
- [ ] Validate all user input against invariants
- [ ] Enforce immutability rules on publish
- [ ] Implement workout versioning on publish
- [ ] Test with intentionally invalid data
- [ ] Verify no computed fields are stored

**After implementation:**
- [ ] Test draft → publish → archive flow
- [ ] Verify published plans are frozen
- [ ] Verify workout edits create versions
- [ ] Document any new validation rules discovered

---

## Questions?

If these docs don't answer your question, the docs are incomplete.

**Fix:** Update the relevant doc with the answer, then proceed.

**This documentation is a living contract.** Keep it current, keep it authoritative, keep it boring.
