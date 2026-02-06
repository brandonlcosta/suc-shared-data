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

console.log("Canonical training data validation passed.");
