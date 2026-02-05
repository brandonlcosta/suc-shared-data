'use strict';

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(ROOT, 'routes');
const POI_ID = 'start-finish';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseGpxPoints(raw) {
  if (!raw) return [];
  const points = [];

  const fullTag = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match = fullTag.exec(raw);
  while (match) {
    const lat = toNumber(match[1]);
    const lon = toNumber(match[2]);
    if (lat != null && lon != null) {
      points.push({ lat, lon });
    }
    match = fullTag.exec(raw);
  }

  if (points.length > 0) return points;

  const selfClosing = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*\/>/gi;
  let matchSelf = selfClosing.exec(raw);
  while (matchSelf) {
    const lat = toNumber(matchSelf[1]);
    const lon = toNumber(matchSelf[2]);
    if (lat != null && lon != null) {
      points.push({ lat, lon });
    }
    matchSelf = selfClosing.exec(raw);
  }

  return points;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function cumulativeDistancesMeters(points) {
  if (!points.length) return [];
  const distances = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
    distances.push(total);
  }
  return distances;
}

// no multi-hit logic needed for start/finish

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadRouteMeta(routeGroupId) {
  const metaPath = path.join(ROUTES_DIR, routeGroupId, 'route.meta.json');
  return readJson(metaPath);
}

async function loadRoutePois(routeGroupId) {
  const poisPath = path.join(ROUTES_DIR, routeGroupId, 'route.pois.json');
  try {
    const parsed = await readJson(poisPath);
    if (parsed && Array.isArray(parsed.pois)) return parsed;
  } catch {
    // ignore
  }
  return { routeGroupId, pois: [] };
}

async function loadGpx(routeGroupId, label) {
  const baseDir = path.join(ROUTES_DIR, routeGroupId);
  const routeId = `${routeGroupId}-${label}`;
  const candidates = [`${label}.gpx`, `${routeId}.gpx`];
  for (const name of candidates) {
    const filePath = path.join(baseDir, name);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
  }
  return null;
}

function buildStartFinishPlacements(points) {
  if (!points.length) return null;
  const distances = cumulativeDistancesMeters(points);
  const totalM = distances[distances.length - 1] ?? 0;
  const start = points[0];
  const end = points[points.length - 1];

  const placements = [
    {
      lat: start.lat,
      lon: start.lon,
      snapIndex: 0,
      distanceM: 0,
      distanceMi: 0,
      passIndex: 0,
    },
  ];

  if (totalM > 1 && points.length > 1) {
    placements.push({
      lat: end.lat,
      lon: end.lon,
      snapIndex: points.length - 1,
      distanceM: totalM,
      distanceMi: totalM / 1609.344,
      passIndex: 1,
    });
  }

  if (placements.length === 1) return placements[0];
  return placements;
}

async function ensureStartFinishForGroup(routeGroupId) {
  const meta = await loadRouteMeta(routeGroupId);
  const variants = Array.isArray(meta?.variants) ? meta.variants : [];
  if (!variants.length) return { routeGroupId, updated: false };

  const doc = await loadRoutePois(routeGroupId);
  const nextVariants = {};
  let drop = null;

  for (const rawLabel of variants) {
    const label = String(rawLabel).toUpperCase();
    const gpxRaw = await loadGpx(routeGroupId, label);
    if (!gpxRaw) continue;
    const points = parseGpxPoints(gpxRaw);
    const placement = buildStartFinishPlacements(points);
    if (!placement) continue;
    nextVariants[label] = placement;
    if (!drop && points.length) {
      drop = { lat: points[0].lat, lon: points[0].lon };
    }
  }

  if (!Object.keys(nextVariants).length || !drop) {
    return { routeGroupId, updated: false };
  }

  const existingIndex = doc.pois.findIndex((poi) => poi.id === POI_ID);
  const existing = existingIndex >= 0 ? doc.pois[existingIndex] : null;

  const poi = {
    id: POI_ID,
    title: 'Start / Finish',
    type: 'start-finish',
    system: true,
    locked: true,
    drop,
    variants: nextVariants,
  };

  if (existing && typeof existing === 'object') {
    if (existing.notes) poi.notes = existing.notes;
  }

  if (existingIndex >= 0) {
    doc.pois[existingIndex] = poi;
  } else {
    doc.pois.push(poi);
  }

  const poisPath = path.join(ROUTES_DIR, routeGroupId, 'route.pois.json');
  await fs.writeFile(poisPath, JSON.stringify(doc, null, 2), 'utf8');
  return { routeGroupId, updated: true };
}

async function main() {
  const entries = await fs.readdir(ROUTES_DIR, { withFileTypes: true });
  const routeGroupIds = entries.filter((d) => d.isDirectory()).map((d) => d.name);
  let updatedCount = 0;

  for (const routeGroupId of routeGroupIds) {
    try {
      const result = await ensureStartFinishForGroup(routeGroupId);
      if (result.updated) {
        updatedCount += 1;
        console.log(`[START_FINISH] Updated ${routeGroupId}`);
      }
    } catch (error) {
      console.warn(`[START_FINISH] Skipped ${routeGroupId}`, error);
    }
  }

  console.log(`[START_FINISH] Done. Updated ${updatedCount} route groups.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
