# SUC-OS Developer Onboarding

This guide will get you from zero to running the full SUC-OS pipeline locally in under 30 minutes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Running Locally](#running-locally)
- [Verifying the Pipeline](#verifying-the-pipeline)
- [Common Issues](#common-issues)
- [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

Install these before proceeding:

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | v18+ | [nvm](https://github.com/nvm-sh/nvm): `nvm install 18` |
| npm | v9+ | Comes with Node.js |
| Git | v2.30+ | [Download](https://git-scm.com/downloads) |

### Recommended Software

| Tool | Purpose |
|------|---------|
| VS Code | Code editor with JSON schema validation |
| GitHub CLI | Easier PR management: `gh pr create` |

### Verify Installation

```bash
node --version   # Should be v18.x or higher
npm --version    # Should be 9.x or higher
git --version    # Should be 2.30 or higher
```

---

## Repository Setup

SUC-OS is a multi-repo platform. You need all three repositories:

### Current Structure

```
Projects/
├── suc-shared-data/    (Data layer - source of truth)
├── suc-studio/         (Authoring layer)
└── suc-broadcast/      (Pipeline layer)
```

Since you already have these repos cloned, let's verify and install dependencies:

### Step 1: Install Dependencies

Install dependencies for each repo:

```bash
# suc-shared-data
cd c:\Users\Brandon\Desktop\Projects\suc-shared-data
npm install

# suc-studio
cd c:\Users\Brandon\Desktop\Projects\suc-studio
npm install

# suc-broadcast
cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
npm install
```

---

## Running Locally

Run repos in this order: Broadcast → Studio

### Terminal 1: Run suc-broadcast (Pipeline)

Broadcast must run first because studio depends on it for validation feedback.

```bash
cd c:\Users\Brandon\Desktop\Projects\suc-broadcast

# Compile data (first time)
npm run compile

# Start server
npm run dev
```

**Expected output**:
```
✓ Compiled workouts
✓ Compiled routes
✓ Compiled events
✓ Server running at http://localhost:3001
```

**Verify**:
```bash
curl http://localhost:3001/api/v1/workouts/all.json
# Should return JSON with workouts
```

---

### Terminal 2: Run suc-studio (Authoring)

```bash
cd c:\Users\Brandon\Desktop\Projects\suc-studio
npm run dev
```

**Expected output**:
```
VITE ready in 500ms
➜  Local:   http://localhost:5173/
```

**Verify**: Open [http://localhost:5173](http://localhost:5173) in browser. You should see the authoring interface.

---

### Terminal 3: Run Viewer (Optional)

If you have a viewer repo:

```bash
cd c:\Users\Brandon\Desktop\Projects\suc-workout-viewer
npm run dev
```

**Verify**: Open viewer URL and confirm it displays workout data.

---

## Verifying the Pipeline

Test the full data flow from authoring to viewing.

### End-to-End Test

1. **Create content in studio**
   - Open [http://localhost:5173](http://localhost:5173)
   - Navigate to "Workouts"
   - Click "New Workout"
   - Fill in:
     - Name: "Test Easy Run"
     - Date: Today's date
     - Type: "Easy"
     - Distance: "5mi"
     - Pace: "8:30/mi"
   - Click "Publish"

2. **Verify file created**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-shared-data
   git status
   # Should show new file: workouts/test-easy-run-YYYY-MM-DD.json

   cat workouts/test-easy-run-*.json
   # Should show valid JSON
   ```

3. **Recompile broadcast**
   ```bash
   cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
   npm run compile
   # Should detect new workout and recompile
   ```

4. **Verify in API**
   ```bash
   curl http://localhost:3001/api/v1/workouts/all.json | grep "Test Easy Run"
   # Should return the new workout
   ```

**If all steps work**: Your pipeline is functioning correctly! ✓

---

## Common Issues

### Issue 1: Broadcast Can't Find suc-shared-data

**Symptom**:
```
Error: ENOENT: no such file or directory
```

**Cause**: `SHARED_DATA_PATH` is incorrect in `suc-broadcast/.env`

**Fix**:
```bash
cd c:\Users\Brandon\Desktop\Projects\suc-broadcast
cat .env
# Verify path is correct

# Update .env:
echo "SHARED_DATA_PATH=../suc-shared-data" > .env
```

---

### Issue 2: Studio Can't Connect to Broadcast

**Symptom**: Studio shows "Failed to connect to API" or validation doesn't work

**Cause**: Broadcast server not running, or wrong API URL

**Fix**:
```bash
# Step 1: Verify broadcast is running
curl http://localhost:3001/health
# Should return: {"status": "ok"}

# Step 2: Check studio .env
cd c:\Users\Brandon\Desktop\Projects\suc-studio
cat .env.local
# Verify VITE_API_URL=http://localhost:3001
```

---

### Issue 3: Schema Validation Fails

**Symptom**:
```
Error: Validation failed for workouts/test-workout.json
  - Missing required property: 'distance'
```

**Cause**: JSON file doesn't match schema

**Fix**:
```bash
cd c:\Users\Brandon\Desktop\Projects\suc-shared-data

# Option 1: Fix manually
code workouts/test-workout.json
# Add missing "distance" field

# Option 2: Delete and recreate in studio
rm workouts/test-workout.json
# Use studio to recreate with all required fields
```

---

### Issue 4: Port Already in Use

**Symptom**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Cause**: Another process is using the port

**Fix**:
```bash
# Windows: Find and kill process
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or: Use different port
set PORT=3010 && npm run dev
```

---

### Issue 5: Git Push Fails from Studio

**Symptom**:
```
Error: Git push failed: Permission denied
```

**Cause**: Git credentials not configured

**Fix**:
```bash
# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# If using SSH, verify key is added to GitHub
ssh -T git@github.com
```

---

## Next Steps

Now that you're set up:

1. **Read architecture docs**:
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the system design
   - [DATA_FLOW.md](./DATA_FLOW.md) - Learn how data moves through the pipeline

2. **Learn common workflows**:
   - [CONTRIBUTOR_WORKFLOW.md](./CONTRIBUTOR_WORKFLOW.md) - How to add content, make changes

3. **Understand constraints**:
   - [ANTI_PATTERNS.md](./ANTI_PATTERNS.md) - What NOT to do

4. **Practice**:
   - Create a new route in studio
   - Add a training tip
   - Update a workout
   - Verify changes appear in API

---

## Quick Reference

| Task | Command | Location |
|------|---------|----------|
| Compile broadcast | `npm run compile` | suc-broadcast |
| Run broadcast API | `npm run dev` | suc-broadcast |
| Run studio | `npm run dev` | suc-studio |
| Validate schemas | `npm run validate` | suc-shared-data |
| View git status | `git status` | suc-shared-data |

---

**Maintained by**: SUC-OS Technical Documentation Team
**Last updated**: 2025-02-07
