## Status
- Historical (archived)
## Scope
- Canonical data layer (suc-shared-data)

# SUC-OS Data Flow

This document describes the exact lifecycle of data from creation to consumption in SUC-OS.

## Table of Contents

- [Pipeline Overview](#pipeline-overview)
- [Step-by-Step Flow](#step-by-step-flow)
- [Triggers and Automation](#triggers-and-automation)
- [Latency Expectations](#latency-expectations)
- [Failure Modes](#failure-modes)
- [Rollback Strategy](#rollback-strategy)
- [Data Contracts](#data-contracts)

---

## Pipeline Overview

Data flows through four distinct stages:

```
Authoring → Publication → Compilation → Consumption
(Studio)    (Shared-Data)  (Broadcast)    (Viewers)
```

Each stage has specific responsibilities and outputs.

---

## Step-by-Step Flow

### Stage 1: Authoring (suc-studio)

**Actor**: Coach, content creator, or admin
**Tool**: suc-studio (web UI)
**Duration**: Variable (human time)

**Process**:

1. **Open authoring interface**
   ```bash
   cd suc-studio
   npm run dev
   # Opens http://localhost:5173
   ```

2. **Create new entity**
   - Select entity type (workout, route, event, tip, etc.)
   - Fill required fields
   - Attach files if needed (GPX for routes)

3. **Validate against schema**
   - Studio runs AJV validation against `schemas/[entity-type].json`
   - If validation fails, display errors in UI
   - User corrects errors and re-validates

4. **Preview (optional)**
   - Studio can render preview of how entity will appear in viewers
   - No data is published yet

5. **Publish**
   - User clicks "Publish"
   - Studio generates JSON file with unique ID
   - Studio commits to local git in `suc-shared-data`
   - Studio pushes to remote

**Output**: Git commit in `suc-shared-data` containing validated JSON/GPX/GeoJSON

**Example**:
```bash
# Studio creates file: ../suc-shared-data/workouts/tempo-2025-02-07.json
# Studio runs:
cd ../suc-shared-data
git add workouts/tempo-2025-02-07.json
git commit -m "Add tempo workout for 2025-02-07"
git push origin main
```

---

### Stage 2: Publication (suc-shared-data)

**Actor**: Git repository + CI/CD (GitHub Actions)
**Tool**: GitHub, schema validation scripts
**Duration**: 10-30 seconds

**Process**:

1. **Receive push from studio**
   - GitHub receives commit from `suc-studio`
   - Triggers CI workflow on push to main

2. **Run validation CI**
   ```yaml
   # .github/workflows/validate.yml
   on:
     push:
       branches: [main]

   jobs:
     validate-schemas:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Install dependencies
           run: npm install
         - name: Validate all JSON files
           run: npm run validate
   ```

3. **Schema validation**
   - CI loads all schemas from `schemas/`
   - Validates each JSON file against its schema
   - Checks referential integrity (e.g., workouts reference valid blocks)
   - Checks uniqueness (no duplicate IDs)

4. **Pass/Fail**
   - If validation passes: Merge to main
   - If validation fails: Block merge, notify author

5. **Trigger webhook** (if configured)
   - On successful merge to main, trigger `suc-broadcast` recompilation

**Output**: Validated, merged commit in `suc-shared-data` main branch

**Example CI Output**:
```
✓ Validating workouts/tempo-2025-02-07.json against schemas/workout.json
✓ Checking references: block-id exists
✓ Checking uniqueness: workout-id is unique
✓ All validations passed
```

---

### Stage 3: Compilation (suc-broadcast)

**Actor**: Automated pipeline (Node.js script)
**Tool**: suc-broadcast compilation engine
**Duration**: 1-5 minutes (depends on dataset size)

**Process**:

1. **Detect changes**
   - Manual trigger: `npm run compile` in suc-broadcast
   - Or: Watch `suc-shared-data` directory for changes
   - Or: Webhook from GitHub (future)

2. **Determine what to recompile**
   ```javascript
   // Incremental compilation (optional optimization)
   const changedFiles = getGitDiff();

   const needsWorkoutRecompile = changedFiles.some(f =>
     f.startsWith('workouts/') || f.startsWith('blocks/') || f.startsWith('seasons/')
   );
   ```

3. **Ingest canonical data**
   ```javascript
   // Read from suc-shared-data
   const workouts = loadJSON('../suc-shared-data/workouts/*.json');
   const blocks = loadJSON('../suc-shared-data/blocks/*.json');
   const routes = loadJSON('../suc-shared-data/routes/*.json');
   ```

4. **Compile outputs**

   **Example: Weekly workout calendar**
   ```javascript
   // Group workouts by week
   const workoutsByWeek = groupBy(workouts, w => getWeek(w.date));

   // For week 2025-W05, compile all workouts
   const week05 = workoutsByWeek['2025-W05'];

   // Denormalize: embed block metadata
   const enrichedWorkouts = week05.map(workout => ({
     ...workout,
     block: blocks.find(b => b.id === workout.blockId)
   }));

   // Write output
   writeJSON('dist/api/v1/workouts/2025-W05.json', {
     version: '1.0',
     generated: new Date().toISOString(),
     week: '2025-W05',
     workouts: enrichedWorkouts
   });
   ```

5. **Deploy outputs**
   - Copy `dist/` to CDN or hosting
   - Or: Serve via local dev server during development

**Output**: Consumer-ready JSON files in `dist/api/`

**Example Outputs**:
```
dist/api/v1/
├── routes/
│   ├── all.json
│   └── by-difficulty.json
├── workouts/
│   ├── 2025-W05.json
│   ├── 2025-W06.json
│   └── all.json
└── events/
    └── upcoming.json
```

---

### Stage 4: Consumption (Viewers)

**Actor**: End user (athlete, public visitor)
**Tool**: suc-route-viewer or suc-workout-viewer
**Duration**: Instant (HTTP GET from local server)

**Process**:

1. **User visits app**
   - Navigate to viewer (e.g., `http://localhost:3000`)

2. **App fetches data**
   ```javascript
   // suc-workout-viewer/src/api/workouts.js
   export async function getWorkoutsForWeek(week) {
     const response = await fetch(`http://localhost:3001/api/v1/workouts/${week}.json`);

     if (!response.ok) {
       throw new Error(`Failed to fetch workouts: ${response.status}`);
     }

     const data = await response.json();
     return data;
   }
   ```

3. **App renders UI**
   ```javascript
   // suc-workout-viewer/src/components/WeeklyCalendar.jsx
   function WeeklyCalendar({ week }) {
     const [workouts, setWorkouts] = useState([]);

     useEffect(() => {
       getWorkoutsForWeek(week).then(data => {
         setWorkouts(data.workouts);
       });
     }, [week]);

     return (
       <div className="calendar">
         {workouts.map(workout => (
           <WorkoutCard key={workout.id} workout={workout} />
         ))}
       </div>
     );
   }
   ```

4. **User interacts**
   - Filter workouts by type
   - Search for specific content
   - Click for detail views
   - All interactions are read-only

**Output**: Rendered HTML/CSS/JS in user's browser

---

## Triggers and Automation

### What Triggers Recompilation?

| Trigger | Mechanism | When |
|---------|-----------|------|
| Manual compile | CLI command | On-demand during development |
| File watcher | Detect file changes | When shared-data files change |
| Git push | Webhook (future) | After merge to main |
| Scheduled rebuild | Cron job (future) | Daily for drift detection |

### Current Development Flow

**Manual** (recommended for local development):
```bash
# 1. Make changes in studio, publish to shared-data
cd suc-studio
# Create content, click publish

# 2. Recompile broadcast
cd ../suc-broadcast
npm run compile

# 3. Restart broadcast server (if needed)
npm run dev

# 4. Refresh viewer
# Viewer will fetch new data automatically
```

---

## Latency Expectations

### End-to-End Timing (Local Development)

From "Author clicks Publish" to "Viewer shows new content":

| Step | Duration | Cumulative |
|------|----------|------------|
| Studio validates and commits | 2-5s | 5s |
| Git push (local) | 1-2s | 7s |
| Manual recompile trigger | 0s | 7s |
| Broadcast compilation | 10-30s | 37s |
| Viewer refetch | 1-2s | 39s |

**Total latency**: ~30-60 seconds in local development

### Production (Future)

| Step | Duration | Cumulative |
|------|----------|------------|
| Studio validates and commits | 5-10s | 10s |
| Git push to GitHub | 5-10s | 20s |
| CI validates schemas | 20-30s | 50s |
| Webhook triggers broadcast | 5-10s | 60s |
| Broadcast recompiles | 60-300s | 360s (6min) |
| CDN cache invalidation | 30-60s | 420s (7min) |

**Total latency**: 3-8 minutes (production)

---

## Failure Modes

### Failure Point 1: Studio Validation Fails

**Symptom**: Studio shows error message, blocks publish

**Cause**: Data doesn't match schema (missing required field, invalid format, etc.)

**Recovery**:
1. User corrects data in studio
2. Re-validates
3. Publishes when valid

**Impact**: None. Data never reaches `suc-shared-data`.

---

### Failure Point 2: Broadcast Compilation Fails

**Symptom**: Broadcast script exits with error, outputs not updated

**Cause**: Unexpected data format, missing references, compilation logic bug

**Recovery**:
1. Check error logs
2. If data issue: Fix in studio, republish
3. If code issue: Fix broadcast compilation logic
4. Re-run compilation

**Impact**: Viewers serve stale data until fixed. No downtime.

**Example Error**:
```
Error: Cannot read property 'name' of undefined
  at compileWorkouts (compile.js:42)

Caused by: Workout references non-existent block ID 'block-999'
```

**Fix**:
```bash
# Option 1: Fix in studio
cd suc-studio
# Edit workout to reference valid block ID
# Republish

# Option 2: Fix in shared-data directly (emergency only)
cd suc-shared-data
# Edit workout JSON to reference valid block ID
git add workouts/tempo-2025-02-07.json
git commit -m "Fix block reference"
git push
```

---

### Failure Point 3: Viewer Fetch Fails

**Symptom**: User sees "Failed to load data" or empty UI

**Cause**: Broadcast server not running, network issue, invalid URL

**Recovery**:
1. Check that broadcast server is running
2. Verify API endpoint URL in viewer config
3. Check browser console for errors

**Impact**: Degraded UX, but no data corruption.

**Example Code**:
```javascript
// Graceful degradation
try {
  const data = await fetch(apiUrl);
  setWorkouts(data.workouts);
} catch (error) {
  console.error('Fetch failed:', error);
  setError('Unable to load workouts. Please check that broadcast server is running.');
}
```

---

## Rollback Strategy

### Scenario: Bad Data Published

**Problem**: A workout with incorrect pacing was published.

**Solution**:

1. **Identify bad commit**
   ```bash
   cd suc-shared-data
   git log --oneline -- workouts/
   # Find commit hash, e.g., abc1234
   ```

2. **Revert commit**
   ```bash
   git revert abc1234
   git push origin main
   ```

3. **Recompile broadcast**
   ```bash
   cd ../suc-broadcast
   npm run compile
   ```

4. **Verify in viewer**
   - Refresh viewer
   - Confirm bad workout is gone or corrected

**Timeline**: 1-2 minutes

---

### Scenario: Broadcast Compilation Logic Bug

**Problem**: Broadcast has a bug producing invalid JSON.

**Solution**:

1. **Fix broadcast code**
   ```bash
   cd suc-broadcast
   # Fix bug in compile script
   ```

2. **Test locally**
   ```bash
   npm run compile
   # Verify outputs are correct
   ```

3. **Commit fix**
   ```bash
   git add src/compile.js
   git commit -m "Fix compilation bug"
   git push
   ```

4. **Redeploy**
   - In development: Restart server
   - In production: Deploy to hosting

**Timeline**: 5-15 minutes

---

## Data Contracts

### suc-shared-data → suc-broadcast

**Contract**: All JSON files must match schemas in `suc-shared-data/schemas/`

**Required Fields** (all entities):
- `id` (string, unique)
- `type` (string, entity type)
- `createdAt` (ISO 8601 timestamp)
- `updatedAt` (ISO 8601 timestamp)

**Optional Fields**:
- `deprecated` (boolean, defaults to false)
- `visibility` (enum: "public", "team", "archived")

**Enforcement**:
- Studio validates before publish
- Broadcast validates on ingest (defensive)

---

### suc-broadcast → viewers

**Contract**: API responses include metadata envelope

**Format**:
```json
{
  "version": "1.0",
  "generated": "2025-02-07T10:30:00Z",
  "endpoint": "/v1/workouts/2025-W05",
  "count": 5,
  "data": [ /* actual content */ ]
}
```

**Guarantees**:
- All fields in `data` match the schema contract
- `count` matches `data.length` (for arrays)
- `generated` timestamp is UTC ISO 8601

**Enforcement**:
- Broadcast includes metadata in all responses
- Viewers validate response shape (defensive)

---

## Summary

**Data flows**:
1. Author in studio → Validate → Commit to shared-data
2. Shared-data stores canonical data
3. Broadcast ingests → Compiles → Serves to viewers
4. Viewer fetches → Renders → Displays to user

**Key Properties**:
- Unidirectional (no backward flow)
- Schema-validated at every stage
- Fully recoverable (git history)
- Deterministic (same input = same output)
- Latency: 30-60 seconds (local dev), 3-8 minutes (production)

**Failure handling**:
- Validation failures block publish (no bad data)
- Compilation failures serve stale data (no downtime)
- Rollbacks are git reverts (no data loss)

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07

