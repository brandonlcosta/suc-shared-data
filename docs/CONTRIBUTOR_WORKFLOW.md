# SUC-OS Contributor Workflows

This document describes standard procedures for adding, modifying, and managing content in SUC-OS.

## Table of Contents

- [Content Workflows](#content-workflows)
- [Schema Workflows](#schema-workflows)
- [Recovery Workflows](#recovery-workflows)
- [Anti-Patterns Summary](#anti-patterns-summary)

---

## Content Workflows

### Workflow 1: Add a New Workout

**Scenario**: You want to create a new tempo workout.

**Estimated time**: 3 minutes

#### Steps

1. **Open suc-studio**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-studio
   npm run dev
   # Opens http://localhost:5173
   ```

2. **Create workout**
   - Navigate to "Workouts"
   - Click "New Workout"
   - Fill in fields:
     - **Name**: "Tempo Run - 8mi"
     - **Date**: Select date
     - **Type**: "Tempo"
     - **Distance**: 8
     - **Pace**: "7:30"
     - **Description**: "8 miles at tempo pace..."

3. **Validate**
   - Studio automatically validates against `schemas/workout.json`
   - Fix any errors shown in UI

4. **Publish**
   - Click "Publish"
   - Studio writes to `suc-shared-data/workouts/tempo-8mi-YYYY-MM-DD.json`
   - Studio commits and pushes to git

5. **Recompile**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   ```

6. **Verify**
   - Check API: `curl http://localhost:3001/api/v1/workouts/all.json`
   - Confirm new workout appears

---

### Workflow 2: Add a New Route

**Scenario**: You have a GPX file from a new trail run.

**Estimated time**: 5 minutes

#### Steps

1. **Prepare GPX file**
   - Export from Garmin/Strava as `new-trail.gpx`
   - Ensure file is valid GPX 1.1 format

2. **Open suc-studio**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-studio
   npm run dev
   ```

3. **Create route**
   - Navigate to "Routes"
   - Click "New Route"
   - Upload GPX file (drag & drop)
   - Fill metadata:
     - **Name**: "New Trail Loop"
     - **Description**: "Scenic 10-mile loop..."
     - **Difficulty**: "Moderate"

4. **Validate & Publish**
   - Studio validates route metadata and GPX
   - Click "Publish"
   - Studio creates:
     - `suc-shared-data/routes/new-trail-loop.json`
     - `suc-shared-data/routes/new-trail-loop.gpx`

5. **Recompile**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   ```

---

### Workflow 3: Update Existing Content

**Scenario**: A workout's difficulty needs to be changed.

**Estimated time**: 2 minutes

#### Steps

1. **Open in studio**
   - Navigate to "Workouts"
   - Find workout by name or date
   - Click "Edit"

2. **Update field**
   - Change "Difficulty" from "Easy" to "Moderate"
   - Click "Save & Publish"

3. **Studio updates file**
   - Overwrites `suc-shared-data/workouts/workout-id.json`
   - Updates `updatedAt` timestamp
   - Commits with message: "Update workout difficulty"

4. **Recompile**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   ```

---

### Workflow 4: Deprecate Content (Without Deleting)

**Scenario**: An old route is no longer maintained.

**Estimated time**: 3 minutes

#### Steps

1. **Open in studio**
   - Navigate to "Routes"
   - Find route
   - Click "Edit"

2. **Mark deprecated**
   - Change "Visibility" to "archived"
   - Or check "Deprecated" checkbox
   - Add note: "Trail no longer maintained as of 2025-02-07"

3. **Publish**
   - Studio updates JSON (does NOT delete)
   - File remains in `suc-shared-data` for historical record

4. **Update broadcast filter**
   - Ensure broadcast filters out deprecated routes
   - Recompile

5. **Verify**
   - Route no longer appears in API
   - But still exists in git history

**Important**: DO NOT delete files from `suc-shared-data`. Always deprecate.

---

## Schema Workflows

### Workflow 5: Add a New Schema Field

**Scenario**: You want to add `estimatedTime` to workouts.

**Estimated time**: 15 minutes

#### Steps

1. **Update schema**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-shared-data
   code schemas/workout.json
   ```

   Add new field:
   ```json
   {
     "properties": {
       "estimatedTime": {
         "type": "string",
         "pattern": "^\\d+:\\d{2}:\\d{2}$",
         "description": "Estimated duration (HH:MM:SS)"
       }
     }
   }
   ```

   **Note**: Make it optional (not in `required` array) for backward compatibility.

2. **Test schema**
   ```bash
   npm run validate
   # Should pass (existing data doesn't have field, but that's OK)
   ```

3. **Commit schema**
   ```bash
   git add schemas/workout.json
   git commit -m "Add estimatedTime field to workout schema"
   git push
   ```

4. **Update studio UI**
   - Add input field for `estimatedTime` in workout form

5. **Update broadcast** (if needed)
   - Add processing logic for new field

6. **Test end-to-end**
   - Create workout with `estimatedTime` in studio
   - Verify it appears in API

---

## Recovery Workflows

### Workflow 6: Rollback a Bad Publish

**Scenario**: You published a workout with incorrect data.

**Estimated time**: 2 minutes

#### Steps

1. **Identify bad commit**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-shared-data
   git log --oneline -- workouts/
   # Find commit hash
   ```

2. **Revert commit**
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```

3. **Recompile broadcast**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   ```

4. **Verify**
   - Check API to confirm bad data is gone

---

### Workflow 7: Fix Broadcast Compilation Error

**Scenario**: Broadcast compilation fails due to a code bug.

**Estimated time**: 5 minutes

#### Steps

1. **Check error logs**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   # Read error message
   ```

2. **Fix bug**
   - Edit compilation script
   - Fix the issue (e.g., null pointer, missing reference)

3. **Test locally**
   ```bash
   npm run compile
   # Verify outputs are correct
   ```

4. **Commit fix**
   ```bash
   git add src/
   git commit -m "Fix compilation bug"
   git push
   ```

---

## Anti-Patterns Summary

### ❌ DO NOT Author Data Directly in suc-shared-data

**Why**: No validation, breaks audit trail

**Instead**: Always use `suc-studio`

**Example of violation**:
```bash
# ❌ NEVER DO THIS
cd suc-shared-data
echo '{"id":"bad","type":"workout"}' > workouts/bad.json
git add workouts/bad.json
git commit -m "Add workout"
```

**Correct approach**:
```bash
# ✅ DO THIS
cd suc-studio
npm run dev
# Use UI to create workout
```

---

### ❌ DO NOT Delete Files from suc-shared-data

**Why**: Breaks git history, removes audit trail

**Instead**: Mark as deprecated

**Example of violation**:
```bash
# ❌ NEVER DO THIS
git rm routes/old-trail.json
git commit -m "Delete old trail"
```

**Correct approach**:
```json
// ✅ DO THIS
{
  "id": "old-trail",
  "deprecated": true,
  "visibility": "archived"
}
```

---

### ❌ DO NOT Push Unvalidated Data

**Why**: Breaks broadcast compilation

**Instead**: Always validate in studio

**Example of violation**:
```bash
# ❌ BAD: Skipping validation
cp ~/workout.json workouts/
git add workouts/workout.json
git commit -m "Add workout"
```

**Correct approach**:
```bash
# ✅ GOOD: Studio validates
cd suc-studio
# Use UI which validates before publish
```

---

### ❌ DO NOT Store Canonical Data in Broadcast

**Why**: Creates dual sources of truth

**Instead**: Broadcast reads from shared-data only

**Example of violation**:
```javascript
// ❌ BAD: Broadcast storing data
const db = new Database();
db.insert('routes', routeData);
```

**Correct approach**:
```javascript
// ✅ GOOD: Broadcast reads and compiles
const routes = readFromSharedData('routes/*.json');
const compiled = transformRoutes(routes);
writeOutput('dist/api/routes/all.json', compiled);
```

---

## Quick Reference

| Task | Tool | Command |
|------|------|---------|
| Add content | suc-studio | UI → Create → Publish |
| Update content | suc-studio | UI → Edit → Publish |
| Deprecate content | suc-studio | UI → Mark archived |
| Validate data | suc-shared-data | `npm run validate` |
| Recompile | suc-broadcast | `npm run compile` |
| Rollback | suc-shared-data | `git revert <hash>` |
| Add schema field | suc-shared-data | Edit `schemas/*.json` |

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07
