'use strict';

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPILED_DIR = path.join(ROOT, 'compiled');
const EXPORTS_DIR = path.join(ROOT, 'exports');

// Parse CLI args
const ARGS = process.argv.slice(2);
const VALIDATE_MODE = ARGS.includes('--validate');

const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64'
);
const ROUTES_ROOT = path.join(ROOT, 'routes');
const COORD_DECIMALS = 7;
const FLOAT_EPSILON = 1e-12;
const ROUTE_TIER_ORDER = ['MED', 'LRG', 'XL', 'XXL'];

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

async function readRouteGpx(routeGroupId, variant, routeId) {
  const baseDir = path.join(ROUTES_ROOT, routeGroupId);
  const candidates = [
    `${String(variant || '').toUpperCase()}.gpx`,
    `${routeId}.gpx`
  ];
  for (const fileName of candidates) {
    const filePath = path.join(baseDir, fileName);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null;
      if (code !== 'ENOENT') throw error;
    }
  }
  return null;
}

function normalizeRoutesPayload(routesPayload) {
  if (Array.isArray(routesPayload)) return routesPayload;
  if (routesPayload && Array.isArray(routesPayload.routes)) return routesPayload.routes;
  if (!routesPayload || typeof routesPayload !== 'object') return [];
  const map = routesPayload.routes && typeof routesPayload.routes === 'object'
    ? routesPayload.routes
    : {};
  return Object.entries(map).map(([routeId, value]) => ({
    routeId,
    ...(value || {})
  }));
}

function normalizeEventsPayload(eventsPayload) {
  if (Array.isArray(eventsPayload)) return eventsPayload;
  if (eventsPayload && Array.isArray(eventsPayload.events)) return eventsPayload.events;
  return [];
}

function normalizeRawRouteInput(route) {
  const routeId = String(
    route.routeId || route.route_id || route.id || ''
  ).trim();
  const routeGroupId = String(
    route.routeGroupId || route.route_group_id || ''
  ).trim();
  const variant = String(route.variant || route.label || '').trim().toUpperCase();
  return { routeId, routeGroupId, variant };
}

function normalizeLineString(input) {
  const coordinates = Array.isArray(input && input.coordinates) ? input.coordinates : [];
  const deduped = [];
  for (const coord of coordinates) {
    if (!Array.isArray(coord) || coord.length < 2) continue;
    const lng = toNumber(coord[0]);
    const lat = toNumber(coord[1]);
    if (lng == null || lat == null) continue;
    const next = [lng, lat];
    if (deduped.length === 0) {
      deduped.push(next);
      continue;
    }
    const prev = deduped[deduped.length - 1];
    if (Math.abs(prev[0] - next[0]) > FLOAT_EPSILON || Math.abs(prev[1] - next[1]) > FLOAT_EPSILON) {
      deduped.push(next);
    }
  }
  return { type: 'LineString', coordinates: deduped };
}

function buildEdgeHash(start, end) {
  const a = `${start[0].toFixed(COORD_DECIMALS)},${start[1].toFixed(COORD_DECIMALS)}`;
  const b = `${end[0].toFixed(COORD_DECIMALS)},${end[1].toFixed(COORD_DECIMALS)}`;
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function inferRouteTier(routeId) {
  const normalized = String(routeId || '').trim().toUpperCase();
  if (!normalized) return null;
  const direct = ROUTE_TIER_ORDER.find((tier) => normalized === tier || normalized.endsWith(`-${tier}`));
  if (direct) return direct;
  const segment = normalized.match(/(?:^|[-_])(MED|LRG|XL|XXL)(?:$|[-_])/);
  return segment ? segment[1] : null;
}

function compareRouteTiers(a, b) {
  const aIndex = ROUTE_TIER_ORDER.indexOf(a);
  const bIndex = ROUTE_TIER_ORDER.indexOf(b);
  const aRank = aIndex >= 0 ? aIndex : ROUTE_TIER_ORDER.length;
  const bRank = bIndex >= 0 ? bIndex : ROUTE_TIER_ORDER.length;
  if (aRank !== bRank) return aRank - bRank;
  return a.localeCompare(b);
}

function buildForkLabel(outgoingSectionIds, sectionMap, routeTierByRouteId) {
  if (!outgoingSectionIds || outgoingSectionIds.size < 2) return null;
  const tiers = new Set();
  for (const sectionId of outgoingSectionIds) {
    const section = sectionMap.get(sectionId);
    if (!section || !Array.isArray(section.routeIds)) continue;
    for (const routeId of section.routeIds) {
      const tier = routeTierByRouteId.get(routeId) || inferRouteTier(routeId);
      if (tier) tiers.add(tier);
    }
  }
  if (tiers.size < 2) return null;
  const ordered = [...tiers].sort(compareRouteTiers);
  return `${ordered.join(' / ')} Split`;
}

function compileCorridorGraph(rawRoutes) {
  const routes = rawRoutes.map((route) => ({
    id: route.id,
    sectionSequence: [],
    geometry: normalizeLineString(route.geometry),
    tier: typeof route.tier === 'string' ? route.tier.toUpperCase() : undefined
  }));
  const routeTierByRouteId = new Map(
    routes
      .filter((route) => typeof route.tier === 'string' && route.tier)
      .map((route) => [route.id, route.tier])
  );

  const edges = [];
  for (const route of routes) {
    const coords = route.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i += 1) {
      edges.push({
        id: `${route.id}:${i}`,
        routeId: route.id,
        segmentIndex: i,
        start: [coords[i][0], coords[i][1]],
        end: [coords[i + 1][0], coords[i + 1][1]],
        hash: buildEdgeHash(coords[i], coords[i + 1])
      });
    }
  }

  const edgeIndexSets = new Map();
  for (const edge of edges) {
    const set = edgeIndexSets.get(edge.hash) || new Set();
    set.add(edge.routeId);
    edgeIndexSets.set(edge.hash, set);
  }
  const edgeIndex = new Map(
    [...edgeIndexSets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hash, set]) => [hash, [...set].sort((a, b) => a.localeCompare(b))])
  );

  const sections = [];
  const sectionByKey = new Map();
  const routeSectionSequences = {};
  for (const route of routes.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const routeEdges = edges.filter((edge) => edge.routeId === route.id).sort((a, b) => a.segmentIndex - b.segmentIndex);
    const sectionIds = [];
    if (routeEdges.length > 0) {
      let runStart = 0;
      for (let i = 1; i <= routeEdges.length; i += 1) {
        const prevSet = routeEdges[i - 1] ? (edgeIndex.get(routeEdges[i - 1].hash) || []) : [];
        const nextSet = routeEdges[i] ? (edgeIndex.get(routeEdges[i].hash) || []) : [];
        const boundary = i === routeEdges.length || prevSet.join(',') !== nextSet.join(',');
        if (!boundary) continue;
        const run = routeEdges.slice(runStart, i);
        const group = (edgeIndex.get(run[0].hash) || []).join(',');
        const edgeHashes = run.map((edge) => edge.hash);
        const forward = edgeHashes.join('>');
        const reverse = edgeHashes.slice().reverse().join('>');
        const canonicalHashes = forward <= reverse ? forward : reverse;
        const key = `${group}::${canonicalHashes}`;
        let sectionId = sectionByKey.get(key);
        if (!sectionId) {
          sectionId = `sec_${sectionByKey.size + 1}`;
          sectionByKey.set(key, sectionId);
          const coordinates = [
            { lng: run[0].start[0], lat: run[0].start[1] },
            ...run.map((edge) => ({ lng: edge.end[0], lat: edge.end[1] }))
          ];
          const lengthMeters = run.reduce((sum, edge) => sum + haversineMeters(edge.start, edge.end), 0);
          sections.push({
            id: sectionId,
            geometry: { coordinates },
            routeIds: (edgeIndex.get(run[0].hash) || []).slice().sort((a, b) => a.localeCompare(b)),
            lengthMeters
          });
        }
        sectionIds.push(sectionId);
        runStart = i;
      }
    }
    routeSectionSequences[route.id] = sectionIds;
    route.sectionSequence = sectionIds;
  }

  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const nodeMap = new Map();
  for (const route of routes.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const sequence = routeSectionSequences[route.id] || [];
    if (sequence.length === 0) continue;
    for (let i = 0; i < sequence.length; i += 1) {
      const section = sectionMap.get(sequence[i]);
      if (!section || !Array.isArray(section.geometry.coordinates) || section.geometry.coordinates.length < 2) continue;
      const first = section.geometry.coordinates[0];
      const last = section.geometry.coordinates[section.geometry.coordinates.length - 1];
      const entry = [first.lng, first.lat];
      const exit = [last.lng, last.lat];

      const entryKey = `${entry[0].toFixed(COORD_DECIMALS)},${entry[1].toFixed(COORD_DECIMALS)}`;
      const exitKey = `${exit[0].toFixed(COORD_DECIMALS)},${exit[1].toFixed(COORD_DECIMALS)}`;

      const entryNode = nodeMap.get(entryKey) || {
        coordinate: { lng: entry[0], lat: entry[1] },
        connected: new Set(),
        incoming: new Set(),
        outgoing: new Set(),
        start: false,
        end: false
      };
      entryNode.connected.add(section.id);
      entryNode.outgoing.add(section.id);
      if (i === 0) entryNode.start = true;
      nodeMap.set(entryKey, entryNode);

      const exitNode = nodeMap.get(exitKey) || {
        coordinate: { lng: exit[0], lat: exit[1] },
        connected: new Set(),
        incoming: new Set(),
        outgoing: new Set(),
        start: false,
        end: false
      };
      exitNode.connected.add(section.id);
      exitNode.incoming.add(section.id);
      if (i === sequence.length - 1) exitNode.end = true;
      nodeMap.set(exitKey, exitNode);
    }
  }

  const nodes = [];
  for (const [key, value] of [...nodeMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const outgoingSignatures = [...value.outgoing]
      .map((sectionId) => {
        const section = sectionMap.get(sectionId);
        return section ? section.routeIds.slice().sort((a, b) => a.localeCompare(b)).join(',') : '';
      })
      .filter(Boolean);
    const isFork = value.outgoing.size >= 2 && new Set(outgoingSignatures).size >= 2;
    const isMerge = value.incoming.size >= 2 && value.outgoing.size === 1;
    const type = isFork ? 'fork' : isMerge ? 'merge' : value.start ? 'start' : value.end ? 'end' : null;
    if (!type) continue;
    const forkLabel =
      type === 'fork' ? buildForkLabel(value.outgoing, sectionMap, routeTierByRouteId) : null;
    nodes.push({
      id: `node_${nodes.length + 1}`,
      coordinate: value.coordinate,
      type,
      connectedSectionIds: [...value.connected].sort((a, b) => a.localeCompare(b)),
      ...(forkLabel ? { label: forkLabel } : {})
    });
  }

  return {
    routes,
    sections: sections.sort((a, b) => a.id.localeCompare(b.id)),
    nodes,
    edges: edges.sort((a, b) => a.id.localeCompare(b.id))
  };
}

async function writeCorridorGraph(baseDir, corridorGraph) {
  await fs.writeFile(
    path.join(baseDir, 'corridorGraph.json'),
    `${JSON.stringify(corridorGraph, null, 2)}\n`,
    'utf8'
  );
}

// ============================================================================
// Corridor Graph Validation (used with --validate flag)
// ============================================================================

const VALIDATION_TOLERANCE_METERS = 5;

function haversineValidation(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function coordToLonLat(coord) {
  return [coord.lng, coord.lat];
}

function coordDistance(a, b) {
  return haversineValidation(coordToLonLat(a), coordToLonLat(b));
}

function validateCorridorGraph(graph) {
  const errors = [];

  // Build lookups
  const sectionById = new Map(graph.sections.map((s) => [s.id, s]));
  const routeById = new Map(graph.routes.map((r) => [r.id, r]));

  // B) Geometry sanity
  for (const section of graph.sections) {
    const coords = section.geometry?.coordinates ?? [];
    if (coords.length < 2) {
      errors.push(`[GEOMETRY] Section ${section.id} has < 2 coordinates`);
    }
    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number' ||
          Number.isNaN(coord.lat) || Number.isNaN(coord.lng)) {
        errors.push(`[GEOMETRY] Section ${section.id} has invalid coordinate at index ${i}`);
      }
    }
    if (coords.length >= 2 && section.lengthMeters <= 0) {
      errors.push(`[GEOMETRY] Section ${section.id} has non-positive length: ${section.lengthMeters}`);
    }
  }

  // Validate node coordinates
  for (const node of graph.nodes) {
    const coord = node.coordinate;
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number' ||
        Number.isNaN(coord.lat) || Number.isNaN(coord.lng)) {
      errors.push(`[GEOMETRY] Node ${node.id} has invalid coordinate`);
    }
  }

  // C) Topology checks
  for (const route of graph.routes) {
    for (const sectionId of route.sectionSequence) {
      if (!sectionById.has(sectionId)) {
        errors.push(`[TOPOLOGY] Route ${route.id} references non-existent section ${sectionId}`);
      }
    }
  }

  for (const section of graph.sections) {
    for (const routeId of section.routeIds) {
      if (!routeById.has(routeId)) {
        errors.push(`[TOPOLOGY] Section ${section.id} references non-existent route ${routeId}`);
      }
    }
  }

  for (const node of graph.nodes) {
    for (const sectionId of node.connectedSectionIds) {
      if (!sectionById.has(sectionId)) {
        errors.push(`[TOPOLOGY] Node ${node.id} references non-existent section ${sectionId}`);
      }
    }
  }

  // Route path continuity
  for (const route of graph.routes) {
    if (route.sectionSequence.length < 2) continue;
    for (let i = 0; i < route.sectionSequence.length - 1; i++) {
      const currSection = sectionById.get(route.sectionSequence[i]);
      const nextSection = sectionById.get(route.sectionSequence[i + 1]);
      if (!currSection || !nextSection) continue;

      const currCoords = currSection.geometry?.coordinates ?? [];
      const nextCoords = nextSection.geometry?.coordinates ?? [];
      if (currCoords.length < 2 || nextCoords.length < 2) continue;

      const currStart = currCoords[0];
      const currEnd = currCoords[currCoords.length - 1];
      const nextStart = nextCoords[0];
      const nextEnd = nextCoords[nextCoords.length - 1];

      const distances = [
        coordDistance(currEnd, nextStart),
        coordDistance(currEnd, nextEnd),
        coordDistance(currStart, nextStart),
        coordDistance(currStart, nextEnd),
      ];
      const minDist = Math.min(...distances);

      if (minDist > VALIDATION_TOLERANCE_METERS) {
        errors.push(`[TOPOLOGY] Route ${route.id} discontinuity at section ${i}: ${route.sectionSequence[i]} -> ${route.sectionSequence[i + 1]} (${minDist.toFixed(1)}m gap)`);
      }
    }
  }

  // E) Shared-section correctness
  const routeSectionSets = new Map();
  for (const route of graph.routes) {
    routeSectionSets.set(route.id, new Set(route.sectionSequence));
  }

  for (const section of graph.sections) {
    if (section.routeIds.length > 1) {
      for (const routeId of section.routeIds) {
        const routeSections = routeSectionSets.get(routeId);
        if (!routeSections || !routeSections.has(section.id)) {
          errors.push(`[SHARED] Section ${section.id} claims route ${routeId} but route doesn't contain section`);
        }
      }
    }
  }

  // Check for duplicate IDs
  const sectionIds = new Set();
  for (const section of graph.sections) {
    if (sectionIds.has(section.id)) {
      errors.push(`[SHARED] Duplicate section ID: ${section.id}`);
    }
    sectionIds.add(section.id);
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`[SHARED] Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  return errors;
}

// Track all generated corridor graphs for validation
const generatedCorridorGraphs = [];
// Track written file paths for end-to-end validation
const writtenCorridorGraphPaths = [];

async function buildRawRoutesForEntries(routeEntries) {
  const dedup = new Map();
  for (const entry of routeEntries) {
    const normalized = normalizeRawRouteInput(entry || {});
    if (!normalized.routeId || !normalized.routeGroupId || !normalized.variant) continue;
    dedup.set(normalized.routeId, normalized);
  }

  const routes = [];
  for (const route of dedup.values()) {
    const gpxRaw = await readRouteGpx(route.routeGroupId, route.variant, route.routeId);
    if (!gpxRaw) continue;
    const points = parseGpxPoints(gpxRaw);
    if (points.length < 2) continue;
    routes.push({
      id: route.routeId,
      tier: route.variant,
      geometry: {
        type: 'LineString',
        coordinates: points.map((point) => [point.lon, point.lat])
      },
      sectionSequence: []
    });
  }
  return routes;
}

async function readJsonIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null;
    if (code === 'ENOENT') return fallback;
    throw error;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeAssetSet(baseDir, caption) {
  await ensureDir(baseDir);
  await Promise.all([
    fs.writeFile(path.join(baseDir, 'cover.png'), PLACEHOLDER_PNG),
    fs.writeFile(path.join(baseDir, 'quote.png'), PLACEHOLDER_PNG),
    fs.writeFile(path.join(baseDir, 'caption.txt'), caption || '', 'utf8')
  ]);
}

async function exportRouteAssets(routesPayload) {
  const routeCardsDir = path.join(EXPORTS_DIR, 'route-cards');
  const elevationDir = path.join(EXPORTS_DIR, 'elevation-profiles');
  await ensureDir(routeCardsDir);
  await ensureDir(elevationDir);

  const routeEntries = normalizeRoutesPayload(routesPayload);
  const routeEntryById = new Map();
  for (const route of routeEntries) {
    const normalized = normalizeRawRouteInput(route);
    if (!normalized.routeId) continue;
    routeEntryById.set(normalized.routeId, route);
  }

  for (const [routeId, route] of routeEntryById.entries()) {
    const stats = route && route.stats ? route.stats : route;
    const caption = `${stats.name || routeId} | ${Math.round(stats.distanceMi || 0)} mi`;
    const routeCardDir = path.join(routeCardsDir, routeId);
    const elevationProfileDir = path.join(elevationDir, routeId);
    await writeAssetSet(routeCardDir, caption);
    await writeAssetSet(elevationProfileDir, caption);

    const rawRoutes = await buildRawRoutesForEntries([route]);
    if (rawRoutes.length > 0) {
      const corridorGraph = compileCorridorGraph(rawRoutes);
      await Promise.all([
        writeCorridorGraph(routeCardDir, corridorGraph),
        writeCorridorGraph(elevationProfileDir, corridorGraph)
      ]);
      if (VALIDATE_MODE) {
        generatedCorridorGraphs.push({ label: `route:${routeId}`, graph: corridorGraph });
        writtenCorridorGraphPaths.push({
          label: `route:${routeId}`,
          path: path.join(routeCardDir, 'corridorGraph.json')
        });
      }
    }
  }
}

async function exportEventAssets(eventsPayload, routesPayload) {
  const baseDir = path.join(EXPORTS_DIR, 'event-recaps');
  await ensureDir(baseDir);

  const routes = normalizeRoutesPayload(routesPayload);
  const routeLookup = new Map();
  for (const route of routes) {
    const normalized = normalizeRawRouteInput(route || {});
    if (!normalized.routeId) continue;
    routeLookup.set(normalized.routeId, route);
    routeLookup.set(`${normalized.routeGroupId}::${normalized.variant}`, route);
  }

  const events = normalizeEventsPayload(eventsPayload);
  for (const event of events) {
    const id = event && (event.eventId || event.event_id || event.id);
    if (!id) continue;
    const caption = `${event.eventName || event.event_name || id} | ${event.eventDate || ''}`.trim();
    const eventDir = path.join(baseDir, String(id));
    await writeAssetSet(eventDir, caption);

    const refs = Array.isArray(event.routeRefs) ? event.routeRefs : [];
    const matchedRoutes = refs
      .map((ref) => {
        const routeGroupId = String((ref && ref.routeGroupId) || '').trim();
        const variant = String((ref && ref.variant) || '').trim().toUpperCase();
        const directId = String((ref && ref.routeId) || '').trim();
        if (directId && routeLookup.has(directId)) return routeLookup.get(directId);
        if (!routeGroupId || !variant) return null;
        return routeLookup.get(`${routeGroupId}::${variant}`) || null;
      })
      .filter(Boolean);
    const rawRoutes = await buildRawRoutesForEntries(matchedRoutes);
    if (rawRoutes.length > 0) {
      const corridorGraph = compileCorridorGraph(rawRoutes);
      await writeCorridorGraph(eventDir, corridorGraph);
      if (VALIDATE_MODE) {
        generatedCorridorGraphs.push({ label: `event:${id}`, graph: corridorGraph });
        writtenCorridorGraphPaths.push({
          label: `event:${id}`,
          path: path.join(eventDir, 'corridorGraph.json')
        });
      }
    }
  }
}

async function exportGearReviewAssets(reviews) {
  const baseDir = path.join(EXPORTS_DIR, 'gear-review-quotes');
  await ensureDir(baseDir);
  for (const review of reviews || []) {
    if (!review || !review.id) continue;
    const caption = `${review.id} | ${review.summary || ''}`.trim();
    await writeAssetSet(path.join(baseDir, String(review.id)), caption);
  }
}

async function exportCrewStoryAssets(stories) {
  const baseDir = path.join(EXPORTS_DIR, 'crew-story-quotes');
  await ensureDir(baseDir);
  for (const story of stories || []) {
    if (!story || !story.id) continue;
    const caption = `${story.person || story.id} | ${story.summary || ''}`.trim();
    await writeAssetSet(path.join(baseDir, String(story.id)), caption);
  }
}

async function main() {
  await ensureDir(EXPORTS_DIR);

  const routesPayload = await readJsonIfExists(path.join(COMPILED_DIR, 'routes.json'), {
    routes: {}
  });
  const eventsPayload = await readJsonIfExists(path.join(COMPILED_DIR, 'events.json'), []);
  const gearPayload = await readJsonIfExists(
    path.join(COMPILED_DIR, 'gear-reviews', 'index.json'),
    []
  );
  const crewPayload = await readJsonIfExists(
    path.join(COMPILED_DIR, 'crew-stories', 'index.json'),
    []
  );

  await exportRouteAssets(routesPayload);
  await exportEventAssets(eventsPayload, routesPayload);
  await exportGearReviewAssets(gearPayload);
  await exportCrewStoryAssets(crewPayload);

  console.log('[SUC-SHARED-DATA] Media exports generated.');

  // Run validation if --validate flag is passed
  if (VALIDATE_MODE) {
    console.log('\n[SUC-SHARED-DATA] Running corridor graph validation...');
    let totalErrors = 0;
    const allErrors = [];

    // Phase 1: Validate in-memory graphs
    console.log('[SUC-SHARED-DATA] Phase 1: Validating in-memory graphs...');
    for (const { label, graph } of generatedCorridorGraphs) {
      const errors = validateCorridorGraph(graph);
      if (errors.length > 0) {
        totalErrors += errors.length;
        allErrors.push({ label: `${label} (in-memory)`, errors });
      }
    }

    // Phase 2: End-to-end validation - read back from disk and re-validate
    console.log('[SUC-SHARED-DATA] Phase 2: End-to-end validation (read from disk)...');
    for (const { label, path: filePath } of writtenCorridorGraphPaths) {
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const readGraph = JSON.parse(raw);
        const errors = validateCorridorGraph(readGraph);
        if (errors.length > 0) {
          totalErrors += errors.length;
          allErrors.push({ label: `${label} (from disk)`, errors });
        }
      } catch (readError) {
        totalErrors += 1;
        allErrors.push({
          label: `${label} (from disk)`,
          errors: [`Failed to read/parse: ${readError.message}`]
        });
      }
    }

    console.log(`[SUC-SHARED-DATA] Validated ${generatedCorridorGraphs.length} in-memory + ${writtenCorridorGraphPaths.length} from disk.`);

    if (totalErrors > 0) {
      console.error(`\n[SUC-SHARED-DATA] VALIDATION FAILED: ${totalErrors} errors found.\n`);
      for (const { label, errors } of allErrors) {
        console.error(`  ${label}:`);
        for (const err of errors) {
          console.error(`    ${err}`);
        }
      }
      process.exit(1);
    } else {
      console.log('[SUC-SHARED-DATA] All corridor graphs passed validation.');
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
