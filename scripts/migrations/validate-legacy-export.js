/* eslint-disable no-console */
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
const exportRoot = process.env.CANONICAL_EXPORT_DIR
  ? path.resolve(process.env.CANONICAL_EXPORT_DIR)
  : path.resolve(root, "migration-output", "canonical-export");

const reportPath = process.env.MIGRATION_REPORT_PATH
  ? path.resolve(process.env.MIGRATION_REPORT_PATH)
  : path.resolve(root, "migration-output", "migration-report.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .map((name) => path.join(dirPath, name))
    .filter((p) => fs.statSync(p).isFile() && p.toLowerCase().endsWith(".json"));
}

function listRouteMetaFiles(routesRoot) {
  if (!fs.existsSync(routesRoot)) return [];
  const files = [];
  for (const routeId of fs.readdirSync(routesRoot)) {
    const filePath = path.join(routesRoot, routeId, "route.meta.json");
    if (fs.existsSync(filePath)) files.push(filePath);
  }
  return files;
}

function validateFiles(ajv, schemaPath, files, label) {
  const schema = readJson(path.resolve(root, schemaPath));
  const validate = ajv.compile(schema);
  const errors = [];
  const docs = [];
  for (const filePath of files) {
    const doc = readJson(filePath);
    if (!validate(doc)) {
      const err = validate.errors && validate.errors[0];
      errors.push({
        severity: "error",
        type: "schema_validation",
        entity: label,
        file: filePath,
        detail: err ? `${err.instancePath || "<root>"} ${err.message}` : "unknown schema error",
      });
      continue;
    }
    docs.push({ filePath, doc });
  }
  return { docs, errors };
}

function ensureUniqueId(docs, idKey, entityName) {
  const seen = new Map();
  const issues = [];
  for (const { filePath, doc } of docs) {
    const id = doc[idKey];
    if (seen.has(id)) {
      issues.push({
        severity: "error",
        type: "duplicate_id",
        entity: entityName,
        id,
        file: filePath,
        first_seen_in: seen.get(id),
      });
    } else {
      seen.set(id, filePath);
    }
  }
  return { issues, seen };
}

function pushIssue(list, issue) {
  list.push(issue);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const routeFiles = listRouteMetaFiles(path.join(exportRoot, "routes"));
  const segmentFiles = listFiles(path.join(exportRoot, "segments"));
  const eventFiles = listFiles(path.join(exportRoot, "events"));

  const routeResult = validateFiles(ajv, "schemas/route.schema.json", routeFiles, "route");
  const segmentResult = validateFiles(ajv, "schemas/segment.schema.json", segmentFiles, "segment");
  const eventResult = validateFiles(ajv, "schemas/event.schema.json", eventFiles, "event");

  const findings = [...routeResult.errors, ...segmentResult.errors, ...eventResult.errors];

  const routeIds = ensureUniqueId(routeResult.docs, "route_id", "route");
  const segmentIds = ensureUniqueId(segmentResult.docs, "segment_id", "segment");
  const eventIds = ensureUniqueId(eventResult.docs, "event_id", "event");
  findings.push(...routeIds.issues, ...segmentIds.issues, ...eventIds.issues);

  const routeSet = new Set([...routeIds.seen.keys()]);
  const segmentSet = new Set([...segmentIds.seen.keys()]);

  const referencedRouteIds = new Set();
  const referencedSegmentIds = new Set();

  for (const { filePath, doc } of routeResult.docs) {
    const ids = Array.isArray(doc.segment_ids) ? doc.segment_ids : [];
    for (const segmentId of ids) {
      referencedSegmentIds.add(segmentId);
      if (!segmentSet.has(segmentId)) {
        pushIssue(findings, {
          severity: "error",
          type: "orphaned_segment_reference",
          entity: "route",
          id: doc.route_id,
          file: filePath,
          missing_segment_id: segmentId,
        });
      }
    }
  }

  for (const { filePath, doc } of eventResult.docs) {
    const routeIdsForEvent = Array.isArray(doc.route_group_ids) ? doc.route_group_ids : [];
    for (const routeId of routeIdsForEvent) {
      referencedRouteIds.add(routeId);
      if (!routeSet.has(routeId)) {
        pushIssue(findings, {
          severity: "error",
          type: "event_missing_route",
          entity: "event",
          id: doc.event_id,
          file: filePath,
          missing_route_id: routeId,
        });
      }
    }

    const segIdsForEvent = Array.isArray(doc.segment_ids) ? doc.segment_ids : [];
    for (const segmentId of segIdsForEvent) {
      referencedSegmentIds.add(segmentId);
      if (!segmentSet.has(segmentId)) {
        pushIssue(findings, {
          severity: "error",
          type: "event_missing_segment",
          entity: "event",
          id: doc.event_id,
          file: filePath,
          missing_segment_id: segmentId,
        });
      }
    }
  }

  for (const routeId of routeSet) {
    if (!referencedRouteIds.has(routeId)) {
      pushIssue(findings, {
        severity: "warning",
        type: "orphaned_route",
        entity: "route",
        id: routeId,
      });
    }
  }

  for (const segmentId of segmentSet) {
    if (!referencedSegmentIds.has(segmentId)) {
      pushIssue(findings, {
        severity: "warning",
        type: "orphaned_segment",
        entity: "segment",
        id: segmentId,
      });
    }
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  const report = {
    generated_at: new Date().toISOString(),
    export_root: exportRoot,
    counts: {
      routes: routeResult.docs.length,
      segments: segmentResult.docs.length,
      events: eventResult.docs.length,
      errors: errorCount,
      warnings: warningCount,
    },
    findings,
    status: errorCount > 0 ? "failed" : "passed",
  };

  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Validation ${report.status}. Report: ${reportPath}`);
  if (errorCount > 0) process.exit(2);
}

main();

