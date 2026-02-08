# SUC-OS Anti-Patterns

This document catalogs architectural violations and practices that undermine the SUC-OS design principles.

**Purpose**: Prevent architectural decay by explicitly defining what NOT to do.

**Audience**: All contributors, especially AI coding agents.

---

## Table of Contents

- [Data Flow Violations](#data-flow-violations)
- [Schema Violations](#schema-violations)
- [State Management Violations](#state-management-violations)
- [Git Violations](#git-violations)
- [Security Violations](#security-violations)

---

## Data Flow Violations

### Anti-Pattern 1: Reverse Data Flow

**Description**: Data flowing backward in the pipeline (viewers → broadcast → shared-data).

**Why this is bad**: Violates unidirectional flow principle, creates circular dependencies.

**Examples**:

❌ **Viewer writing to canonical data**:
```javascript
// suc-workout-viewer/src/api/workouts.js
export async function updateWorkout(id, data) {
  // Directly updating suc-shared-data via API
  await fetch(`/api/admin/workouts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}
```

❌ **Broadcast authoring content**:
```javascript
// suc-broadcast/compile.js
function generateMissingWorkouts() {
  // Auto-generating workouts and saving to shared-data
  const workout = createDefaultWorkout();
  fs.writeFileSync('../suc-shared-data/workouts/auto-generated.json', JSON.stringify(workout));
}
```

**Correct approach**:

✅ **All writes go through studio**:
```javascript
// User edits in studio
// Studio validates
// Studio commits to shared-data
// Broadcast recompiles
// Viewer displays updated data
```

---

### Anti-Pattern 2: Bypassing the Pipeline

**Description**: Components directly reading from `suc-shared-data` instead of consuming from `suc-broadcast`.

**Why this is bad**: Tight coupling, breaks abstraction, makes it impossible to change data formats.

**Examples**:

❌ **Viewer reading raw data**:
```javascript
// suc-route-viewer/src/api/routes.js
import routes from '../../../suc-shared-data/routes/routes.json';  // ❌ Direct import
```

❌ **Broadcast serving raw files**:
```javascript
// suc-broadcast/server.js
app.get('/api/routes/all', (req, res) => {
  // Serving raw shared-data without compilation
  res.sendFile('../suc-shared-data/routes/all.json');  // ❌ No transformation
});
```

**Correct approach**:

✅ **Broadcast compiles and serves**:
```javascript
// suc-broadcast/compile.js
const routes = readSharedData('routes/*.json');
const compiled = routes.map(r => ({
  id: r.id,
  name: r.name,
  distance: r.distance,
  difficulty: r.difficulty
}));
writeOutput('dist/api/v1/routes/all.json', compiled);
```

---

## Schema Violations

### Anti-Pattern 3: Publishing Without Validation

**Description**: Committing data to `suc-shared-data` without validating against schemas.

**Why this is bad**: Breaks broadcast compilation, causes runtime errors.

**Examples**:

❌ **Manual file creation**:
```bash
cd suc-shared-data
echo '{"id":"bad","type":"workout"}' > workouts/bad.json  # Missing required fields
git add workouts/bad.json
git commit -m "Add workout"
```

❌ **Studio with validation disabled**:
```javascript
// suc-studio/src/publish.js
function publish(workout) {
  // if (validateSchema(workout)) {  // ❌ Validation commented out
    commitToSharedData(workout);
  // }
}
```

**Correct approach**:

✅ **Studio always validates**:
```javascript
// suc-studio/src/publish.js
function publish(workout) {
  const valid = validateSchema(workout, 'workout.json');

  if (!valid.success) {
    throw new Error(`Validation failed: ${valid.errors.join(', ')}`);
  }

  commitToSharedData(workout);
}
```

---

### Anti-Pattern 4: Breaking Schema Changes Without Versioning

**Description**: Removing or renaming schema fields without migration.

**Why this is bad**: Breaks existing data, breaks broadcast, breaks viewers.

**Examples**:

❌ **Removing required field**:
```json
// schemas/workout.json (OLD)
{
  "required": ["id", "type", "name", "distance", "difficulty"]
}

// schemas/workout.json (NEW)
{
  "required": ["id", "type", "name", "distance"]  // ❌ Removed difficulty
}
```

❌ **Renaming field without migration**:
```json
// OLD: { "distance": 10 }
// NEW: { "distanceMiles": 10 }  // ❌ Renamed without migrating data
```

**Correct approach**:

✅ **Add new field, deprecate old**:
```json
// Step 1: Add new field as optional
{
  "properties": {
    "distance": { "type": "number", "deprecated": true },
    "distanceMiles": { "type": "number" }
  }
}

// Step 2: Migrate data over time
// Step 3: Remove old field after transition
```

---

## State Management Violations

### Anti-Pattern 5: Storing State in Broadcast

**Description**: Broadcast storing mutable state in databases instead of being stateless.

**Why this is bad**: Violates stateless principle, makes broadcast non-rebuildable.

**Examples**:

❌ **Broadcast with persistent database**:
```javascript
// suc-broadcast/compile.js
const db = new Database('broadcast.db');

function compileRoutes(routes) {
  // Storing canonical data in database
  routes.forEach(route => {
    db.insert('routes', route);  // ❌ Storing state
  });
}
```

❌ **Broadcast caching compilation state**:
```javascript
// suc-broadcast/cache.js
const cache = {
  lastCompiled: {},
  compiledRoutes: []
};

function compile() {
  if (cache.lastCompiled.routes > Date.now() - 3600000) {
    return cache.compiledRoutes;  // ❌ Returning stale cached state
  }
}
```

**Correct approach**:

✅ **Broadcast is stateless**:
```javascript
// suc-broadcast/compile.js
function compile() {
  // Read from shared-data (input)
  const routes = readSharedData('routes/*.json');

  // Compile (pure transformation)
  const compiled = transformRoutes(routes);

  // Write output (ephemeral, can be regenerated)
  writeOutput('dist/api/v1/routes/all.json', compiled);
}
```

---

## Git Violations

### Anti-Pattern 6: Deleting Historical Data

**Description**: Using `git rm` to delete files instead of marking as deprecated.

**Why this is bad**: Breaks audit trail, makes rollback impossible.

**Examples**:

❌ **Deleting route**:
```bash
cd suc-shared-data
git rm routes/old-trail.json
git commit -m "Delete old trail"
git push
```

❌ **Force-pushing to remove history**:
```bash
git push --force  # ❌ Rewrites history
```

**Correct approach**:

✅ **Mark as deprecated**:
```bash
# Edit route in studio
# Set visibility = "archived"
# Or add "deprecated": true
# Publish (creates new commit, preserves history)
```

---

### Anti-Pattern 7: Committing Unvalidated Data

**Description**: Committing JSON files that don't match schemas.

**Why this is bad**: Breaks broadcast compilation, CI fails.

**Examples**:

❌ **Bypassing studio**:
```bash
cd suc-shared-data
echo '{"id": "bad", "type": "workout"}' > workouts/bad.json  # Missing fields
git add workouts/bad.json
git commit -m "Add workout"
```

**Correct approach**:

✅ **Studio validates robustly**:
```javascript
import Ajv from 'ajv';
import schema from '../schemas/workout.json';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

function validateWorkout(workout) {
  const valid = validate(workout);

  if (!valid) {
    throw new ValidationError(validate.errors);
  }

  return true;
}
```

---

## Security Violations

### Anti-Pattern 8: Exposing Internal Data

**Description**: Broadcasting sensitive fields to public viewers.

**Why this is bad**: Leaks private information, violates privacy.

**Examples**:

❌ **Broadcasting unfiltered data**:
```javascript
// suc-broadcast/compile.js
function compileRoster() {
  const athletes = readSharedData('roster/*.json');

  // ❌ Exposing emails, phone numbers
  writeOutput('dist/api/v1/roster/all.json', athletes);
}
```

**Correct approach**:

✅ **Broadcast filters sensitive fields**:
```javascript
// suc-broadcast/compile.js
function compileRoster() {
  const athletes = readSharedData('roster/*.json');

  // Filter to public fields only
  const publicRoster = athletes
    .filter(a => a.visibility === 'public')
    .map(a => ({
      id: a.id,
      name: a.name,
      bio: a.bio
      // ✅ Omit email, phone, address
    }));

  writeOutput('dist/api/v1/roster/public.json', publicRoster);
}
```

---

### Anti-Pattern 9: Hardcoded Secrets

**Description**: Committing API keys or credentials to repos.

**Why this is bad**: Security breach, credentials leaked in git history.

**Examples**:

❌ **Hardcoded API key**:
```javascript
// suc-route-viewer/src/config.js
export const MAPBOX_TOKEN = 'pk.actual_secret_token_12345';  // ❌ Committed to git
```

❌ **Credentials in .env committed**:
```bash
# .env (committed to repo)
AWS_SECRET_KEY=actual_secret_key  // ❌ Exposed
```

**Correct approach**:

✅ **Use environment variables**:
```javascript
// suc-route-viewer/src/config.js
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
```

✅ **Add .env to .gitignore**:
```
# .gitignore
.env
.env.local
.env.production
```

---

## Summary of Anti-Patterns

| # | Anti-Pattern | Correct Approach |
|---|--------------|------------------|
| 1 | Reverse data flow | Maintain unidirectional flow |
| 2 | Bypassing pipeline | Always consume from broadcast |
| 3 | Publishing without validation | Always validate against schemas |
| 4 | Breaking schema changes | Version schemas, migrate data |
| 5 | Storing state in broadcast | Keep broadcast stateless |
| 6 | Deleting historical data | Mark as deprecated |
| 7 | Committing unvalidated data | Validate in studio |
| 8 | Exposing internal data | Filter sensitive fields |
| 9 | Hardcoded secrets | Use environment variables |

---

**Enforcement Strategy**:

1. **Code Review**: Check for anti-patterns in PRs
2. **Documentation**: Link to this doc in all READMEs
3. **Training**: Onboard contributors with anti-pattern review

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07
