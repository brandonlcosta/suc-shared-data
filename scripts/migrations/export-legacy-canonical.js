require('dotenv').config();
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let createClient;
try {
  ({ createClient } = require("@supabase/supabase-js"));
} catch (err) {
  console.error("Missing dependency: @supabase/supabase-js");
  console.error("Install with: npm install @supabase/supabase-js");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUTPUT_ROOT = process.env.CANONICAL_EXPORT_DIR
  ? path.resolve(process.env.CANONICAL_EXPORT_DIR)
  : path.resolve(process.cwd(), "migration-output", "canonical-export");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLES = [
  "_legacy_routes",
  "_legacy_segments",
  "_legacy_events",
  "_legacy_event_route_segments",
  "_legacy_route_pois",
];

const STRIP_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  "owner_id",
  "user_id",
  "author_id",
  "editor_id",
]);

async function fetchAllRows(tableName) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(tableName).select("*").range(from, to);
    if (error) throw new Error(`Failed reading ${tableName}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, "utf8");
}

function pickFirst(obj, candidates, fallback = undefined) {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null) {
      return obj[key];
    }
  }
  return fallback;
}

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeId(value, prefix) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${prefix}-${String(value)}`;
  }
  if (isUuid(value)) {
    return `${prefix}-${String(value).toLowerCase()}`;
  }
  const digest = crypto.createHash("sha1").update(String(value || "")).digest("hex").slice(0, 12);
  return `${prefix}-${digest}`;
}

function cleanObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (STRIP_COLUMNS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function deriveRouteId(routeRow) {
  return normalizeId(
    pickFirst(routeRow, ["route_group_id", "route_id", "id", "slug", "code"]),
    "route"
  );
}

function deriveSegmentId(segmentRow) {
  return normalizeId(pickFirst(segmentRow, ["segment_id", "id", "slug", "code"]), "segment");
}

function deriveEventId(eventRow) {
  return normalizeId(pickFirst(eventRow, ["event_id", "id", "slug", "code"]), "event");
}

function buildRouteMeta(routeRow, segmentIds) {
  const routeId = deriveRouteId(routeRow);
  const variants = toArray(pickFirst(routeRow, ["variants", "variant_codes"], []));
  return {
    schema_version: "2.0.0",
    lifecycle: {
      state: "published",
      appended_at: new Date().toISOString(),
      source: "supabase-legacy-export",
    },
    route_id: routeId,
    name: pickFirst(routeRow, ["name", "route_name", "title"], routeId),
    location: pickFirst(routeRow, ["location", "region", "start_location_name"], ""),
    description: pickFirst(routeRow, ["description", "notes"], ""),
    route_type: pickFirst(routeRow, ["route_type", "type"], "training"),
    variants,
    segment_ids: [...segmentIds],
    source_legacy: cleanObject(routeRow),
  };
}

function buildSegment(segmentRow) {
  const segmentId = deriveSegmentId(segmentRow);
  return {
    schema_version: "1.0.0",
    lifecycle: {
      state: "published",
      appended_at: new Date().toISOString(),
      source: "supabase-legacy-export",
    },
    segment_id: segmentId,
    route_id: normalizeId(pickFirst(segmentRow, ["route_group_id", "route_id"]), "route"),
    name: pickFirst(segmentRow, ["name", "segment_name", "title"], segmentId),
    segment_type: pickFirst(segmentRow, ["segment_type", "type"], "unknown"),
    source_legacy: cleanObject(segmentRow),
  };
}

function buildEvent(eventRow, segmentIds) {
  const eventId = deriveEventId(eventRow);
  return {
    schema_version: "2.0.0",
    lifecycle: {
      state: "published",
      appended_at: new Date().toISOString(),
      source: "supabase-legacy-export",
    },
    event_id: eventId,
    name: pickFirst(eventRow, ["event_name", "name", "title"], eventId),
    description: pickFirst(eventRow, ["event_description", "description"], ""),
    event_type: pickFirst(eventRow, ["type", "event_type"], "training-run"),
    starts_at: pickFirst(eventRow, ["starts_at", "event_date"], null),
    start_location: {
      name: pickFirst(eventRow, ["start_location_name"], ""),
      url: pickFirst(eventRow, ["start_location_url"], ""),
      lat: pickFirst(eventRow, ["start_lat", "lat"], null),
      lng: pickFirst(eventRow, ["start_lng", "lng"], null),
    },
    route_group_ids: [],
    segment_ids: [...segmentIds],
    source_legacy: cleanObject(eventRow),
  };
}

function buildPois(routeId, poiRows) {
  return {
    schema_version: "1.0.0",
    routeGroupId: routeId,
    pois: poiRows.map((row) => {
      const raw = cleanObject(row);
      return {
        id: normalizeId(pickFirst(raw, ["poi_id", "id", "slug"]), "poi"),
        title: pickFirst(raw, ["title", "name", "label"], ""),
        type: pickFirst(raw, ["type", "poi_type"], "custom"),
        source_legacy: raw,
      };
    }),
  };
}

function mapBy(rows, keyFn) {
  const out = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(row);
  }
  return out;
}

function makeLegacyJoinIndexes(eventRouteSegmentsRows) {
  const eventRouteToSegments = new Map();

  for (const ers of eventRouteSegmentsRows) {
    const eventRouteKey = normalizeId(
      pickFirst(ers, ["event_route_id", "event_route_fk", "id"]),
      "event-route"
    );
    const segmentId = normalizeId(pickFirst(ers, ["segment_id", "route_segment_id"]), "segment");
    if (!eventRouteToSegments.has(eventRouteKey)) eventRouteToSegments.set(eventRouteKey, new Set());
    eventRouteToSegments.get(eventRouteKey).add(segmentId);
  }

  return { eventRouteToSegments };
}

async function main() {
  ensureDir(OUTPUT_ROOT);

  const [
    routesRows,
    segmentsRows,
    eventsRows,
    eventRouteSegmentsRows,
    routePoisRows,
  ] = await Promise.all(TABLES.map((t) => fetchAllRows(t)));

  const routeIdToSegments = new Map();
  const segmentDocs = [];
  for (const segmentRow of segmentsRows) {
    const seg = buildSegment(segmentRow);
    segmentDocs.push(seg);
    const routeId = seg.route_id;
    if (!routeIdToSegments.has(routeId)) routeIdToSegments.set(routeId, new Set());
    routeIdToSegments.get(routeId).add(seg.segment_id);
  }

  const { eventRouteToSegments } = makeLegacyJoinIndexes(eventRouteSegmentsRows);

  const routePoisByRoute = mapBy(routePoisRows, (r) =>
    normalizeId(pickFirst(r, ["route_group_id", "route_id"]), "route")
  );

  let routeCount = 0;
  for (const routeRow of routesRows) {
    const routeId = deriveRouteId(routeRow);
    const segmentIds = routeIdToSegments.get(routeId) || new Set();
    const routeMeta = buildRouteMeta(routeRow, segmentIds);
    const routeDir = path.join(OUTPUT_ROOT, "routes", routeId);
    writeJson(path.join(routeDir, "route.meta.json"), routeMeta);

    const pois = buildPois(routeId, routePoisByRoute.get(routeId) || []);
    writeJson(path.join(routeDir, "route.pois.json"), pois);

    const gpxVariants = pickFirst(routeRow, ["gpx_variants", "variants_gpx"], null);
    if (gpxVariants && typeof gpxVariants === "object") {
      for (const [variant, gpxText] of Object.entries(gpxVariants)) {
        if (typeof gpxText === "string" && gpxText.includes("<gpx")) {
          writeText(path.join(routeDir, "variants", `${variant}.gpx`), gpxText);
        }
      }
    }

    routeCount += 1;
  }

  let eventCount = 0;
  for (const eventRow of eventsRows) {
    const eventId = deriveEventId(eventRow);
    const segmentIds = new Set();
    const legacyEventRouteId = normalizeId(
      pickFirst(eventRow, ["event_route_id", "id"]),
      "event-route"
    );
    const segs = eventRouteToSegments.get(legacyEventRouteId);
    if (segs) {
      for (const sid of segs) segmentIds.add(sid);
    }

    const eventDoc = buildEvent(eventRow, segmentIds);
    writeJson(path.join(OUTPUT_ROOT, "events", `${eventDoc.event_id}.json`), eventDoc);
    eventCount += 1;
  }

  for (const segmentDoc of segmentDocs) {
    writeJson(path.join(OUTPUT_ROOT, "segments", `${segmentDoc.segment_id}.json`), segmentDoc);
  }

  const report = {
    generated_at: new Date().toISOString(),
    source_tables: {
      _legacy_routes: routesRows.length,
      _legacy_segments: segmentsRows.length,
      _legacy_events: eventsRows.length,
      _legacy_event_routes: 0,
      _legacy_event_route_segments: eventRouteSegmentsRows.length,
      _legacy_route_pois: routePoisRows.length,
    },
    output_counts: {
      routes: routeCount,
      events: eventCount,
      segments: segmentDocs.length,
    },
  };

  writeJson(path.join(OUTPUT_ROOT, "_export-report.json"), report);
  console.log(`Export complete: ${OUTPUT_ROOT}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
