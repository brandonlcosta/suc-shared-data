const fs = require("fs");
const path = require("path");

let Ajv;
let addFormats;
try {
  Ajv = require("ajv");
  addFormats = require("ajv-formats");
} catch (err) {
  console.error("Missing dependencies for schema validation.");
  console.error("Run: npm install ajv ajv-formats");
  process.exit(1);
}

const root = process.cwd();
const ROUTES_DIR = path.join(root, "routes");

const canonicalSets = [
  {
    label: "season",
    dir: "seasons",
    schemaPath: "schemas/season.schema.json",
    refs: "blocks",
  },
  {
    label: "block",
    dir: "blocks",
    schemaPath: "schemas/block.schema.json",
    refs: "weeks",
  },
  {
    label: "week",
    dir: "weeks",
    schemaPath: "schemas/week.schema.json",
    refs: "workouts",
  },
  {
    label: "workout",
    dir: "workouts",
    schemaPath: "schemas/workout.schema.json",
    refs: null,
  },
  {
    label: "race-intel",
    dir: "race-intel",
    schemaPath: "schemas/race-intel.schema.json",
    refs: null,
  },
  {
    label: "route-media",
    dir: "route-media",
    schemaPath: "schemas/route-media.schema.json",
    refs: null,
  },
];

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`Invalid JSON in ${filePath}: ${err.message}`);
  }
}

function loadSchema(schemaPath) {
  const fullPath = path.join(root, schemaPath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing schema: ${schemaPath}`);
  }
  return readJson(fullPath);
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .map((name) => path.join(dirPath, name));
}

const ajv = new Ajv({ allErrors: false, strict: false });
addFormats(ajv);

const canonical = {};

for (const set of canonicalSets) {
  const dirPath = path.join(root, set.dir);
  const schema = loadSchema(set.schemaPath);
  const validate = ajv.compile(schema);

  const entries = new Map();
  const files = listJsonFiles(dirPath);

  for (const file of files) {
    const data = readJson(file);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      fail(`${set.label} file must be an object: ${file}`);
    }

    if (typeof data.id !== "string") {
      // Legacy or non-canonical file. Skip.
      continue;
    }

    const valid = validate(data);
    if (!valid) {
      const err = validate.errors && validate.errors[0];
      const detail = err ? `${err.instancePath || "<root>"} ${err.message}` : "unknown schema error";
      fail(`Schema validation failed for ${file}: ${detail}`);
    }

    if (entries.has(data.id)) {
      fail(`Duplicate ${set.label} id "${data.id}" in ${file}`);
    }

    entries.set(data.id, { file, data });
  }

  canonical[set.label] = entries;
}

function assertRefExists(parentLabel, childLabel, parentId, refId) {
  if (!canonical[childLabel].has(refId)) {
    fail(`${parentLabel} ${parentId} references missing ${childLabel} id "${refId}"`);
  }
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureUniqueIds(items, itemLabel, filePath) {
  const seen = new Set();
  for (const item of items) {
    const id = String(item?.id || "");
    if (!id) continue;
    if (seen.has(id)) {
      fail(`Duplicate ${itemLabel} id "${id}" in ${filePath}`);
    }
    seen.add(id);
  }
}

function compareTimelineEntries(left, right) {
  const startDelta = toFiniteNumber(left?.startMi, 0) - toFiniteNumber(right?.startMi, 0);
  if (startDelta !== 0) return startDelta;
  const endDelta = toFiniteNumber(left?.endMi, 0) - toFiniteNumber(right?.endMi, 0);
  if (endDelta !== 0) return endDelta;
  return String(left?.id || "").localeCompare(String(right?.id || ""));
}

function validateRouteMediaInvariants(routeMediaId, filePath, data) {
  const timeline = Array.isArray(data.timeline) ? data.timeline : [];
  const subtitles = Array.isArray(data.subtitles) ? data.subtitles : [];
  const markers = Array.isArray(data.markers) ? data.markers : [];

  ensureUniqueIds(timeline, "route-media timeline entry", filePath);
  ensureUniqueIds(subtitles, "route-media subtitle", filePath);
  ensureUniqueIds(markers, "route-media marker", filePath);

  for (const entry of timeline) {
    const startMi = toFiniteNumber(entry?.startMi, 0);
    const endMi = toFiniteNumber(entry?.endMi, startMi);
    if (startMi < 0 || endMi < 0) {
      fail(`route-media ${routeMediaId} has negative timeline miles in ${filePath}`);
    }
    if (endMi < startMi) {
      fail(`route-media ${routeMediaId} has timeline endMi < startMi in ${filePath}`);
    }
  }

  for (const subtitle of subtitles) {
    const startSec = toFiniteNumber(subtitle?.startSec, 0);
    const endSec = toFiniteNumber(subtitle?.endSec, startSec);
    if (startSec < 0 || endSec < 0) {
      fail(`route-media ${routeMediaId} has negative subtitle seconds in ${filePath}`);
    }
    if (endSec < startSec) {
      fail(`route-media ${routeMediaId} has subtitle endSec < startSec in ${filePath}`);
    }
  }

  const sortedTimeline = [...timeline].sort(compareTimelineEntries).map((item) => item.id);
  const originalTimeline = timeline.map((item) => item.id);
  if (sortedTimeline.join("|") !== originalTimeline.join("|")) {
    fail(
      `route-media ${routeMediaId} timeline is not deterministically ordered by startMi/endMi/id in ${filePath}`
    );
  }
}

for (const [id, entry] of canonical.season) {
  for (const blockId of entry.data.blocks) {
    assertRefExists("season", "block", id, blockId);
  }
}

for (const [id, entry] of canonical.block) {
  for (const weekId of entry.data.weeks) {
    assertRefExists("block", "week", id, weekId);
  }
}

for (const [id, entry] of canonical.week) {
  for (const workoutId of entry.data.workouts) {
    assertRefExists("week", "workout", id, workoutId);
  }
}

for (const [id, entry] of canonical["route-media"]) {
  validateRouteMediaInvariants(id, entry.file, entry.data);
}

function validateRoutePois() {
  const schema = loadSchema("schemas/route.pois.schema.json");
  const validate = ajv.compile(schema);

  if (!fs.existsSync(ROUTES_DIR)) {
    return;
  }

  const routeDirs = fs
    .readdirSync(ROUTES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const routeDirName of routeDirs) {
    const routeDirPath = path.join(ROUTES_DIR, routeDirName);
    const poisPath = path.join(routeDirPath, "route.pois.json");
    if (!fs.existsSync(poisPath)) continue;

    const data = readJson(poisPath);
    const valid = validate(data);
    if (!valid) {
      const err = validate.errors && validate.errors[0];
      const detail = err ? `${err.instancePath || "<root>"} ${err.message}` : "unknown schema error";
      fail(`Schema validation failed for ${poisPath}: ${detail}`);
    }
  }
}

validateRoutePois();

console.log("Canonical training data validation passed.");
