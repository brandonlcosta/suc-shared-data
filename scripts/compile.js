'use strict';

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COMPILED_DIR = path.join(ROOT, 'compiled');

const log = (message) => {
  console.log(`[SUC-SHARED-DATA] ${message}`);
};

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function loadEventsMaster() {
  const filePath = path.join(ROOT, 'events', 'events.master.json');
  const parsed = await readJson(filePath);
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error(`Invalid events.master.json: ${filePath}`);
  }
  return parsed.events;
}

async function loadEventsSelection() {
  const filePath = path.join(ROOT, 'events', 'events.selection.json');
  const parsed = await readJson(filePath);
  if (!parsed || !Array.isArray(parsed.selectedEventIds)) {
    throw new Error(`Invalid events.selection.json: ${filePath}`);
  }
  return parsed.selectedEventIds;
}

function getEventId(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return raw.event_id || raw.eventId || raw.id || null;
}

function getRouteGroupIds(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.routeGroupIds)) return raw.routeGroupIds;
  if (Array.isArray(raw.route_group_ids)) return raw.route_group_ids;
  if (Array.isArray(raw.routeGroups)) return raw.routeGroups;
  if (Array.isArray(raw.route_groups)) return raw.route_groups;
  if (typeof raw.routeGroupId === 'string') return [raw.routeGroupId];
  if (typeof raw.route_group_id === 'string') return [raw.route_group_id];
  return [];
}

function normalizeEventForBroadcast(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    event_id: raw.event_id ?? raw.eventId ?? raw.id,
    event_name: raw.event_name ?? raw.eventName ?? raw.name,
    event_description: raw.event_description ?? raw.eventDescription ?? raw.description,
    event_date: raw.event_date ?? raw.eventDate,
    event_time: raw.event_time ?? raw.eventTime,
    start_location_name: raw.start_location_name ?? raw.startLocationName,
    start_location_url: raw.start_location_url ?? raw.startLocationUrl,
    start_lat:
      raw.start_lat ??
      (raw.startLocationCoordinates ? raw.startLocationCoordinates.lat : undefined),
    start_lng:
      raw.start_lng ??
      (raw.startLocationCoordinates ? raw.startLocationCoordinates.lng : undefined),
    publish: raw.publish,
    recurring: raw.recurring
  };
}

function eventsJsonExport(events, routes) {
  const output = events.map((event) => {
    const eventRoutes = routes
      .filter((route) => route.event_id === event.event_id)
      .map((route) => ({
        label: route.label,
        statsUrl: route.gpx_url,
        geojsonUrl: route.geojson_url
      }));

    const poiHighlights = Array.isArray(event.poi_highlights) ? event.poi_highlights : [];

    return {
      eventId: event.event_id,
      eventName: event.event_name,
      eventDescription: event.event_description,
      eventDate: event.event_date,
      eventTime: event.event_time,
      startLocationName: event.start_location_name,
      startLocationUrl: event.start_location_url,
      startLocationCoordinates: {
        lat: event.start_lat,
        lng: event.start_lng
      },
      routes: eventRoutes,
      ...(poiHighlights.length ? { poiHighlights } : {})
    };
  });

  return JSON.stringify(output, null, 2);
}

const ROUTE_COLOR_BY_LABEL = {
  MED: '#00FF99',
  LRG: '#13FFE2',
  XL: '#D000FF',
  XXL: '#FF5050',
  ROUTE: '#FFFFFF'
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeVariantKey(label) {
  return String(label).toUpperCase();
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

function parseGpxPoints(raw) {
  if (!raw) return [];
  const points = [];

  const fullTag = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match = fullTag.exec(raw);
  while (match) {
    const lat = toNumber(match[1]);
    const lon = toNumber(match[2]);
    const eleMatch = match[3].match(/<ele>([^<]+)<\/ele>/i);
    const ele = eleMatch ? toNumber(eleMatch[1]) : null;
    if (lat != null && lon != null) {
      points.push({ lat, lon, ele });
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
      points.push({ lat, lon, ele: null });
    }
    matchSelf = selfClosing.exec(raw);
  }

  return points;
}

function buildGeoJson(points, poiFeatures = []) {
  const features = [];
  if (points && points.length > 0) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map((pt) => [pt.lon, pt.lat])
      }
    });
  }

  if (poiFeatures.length) {
    features.push(...poiFeatures);
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

function computeStats(points) {
  if (!points || points.length === 0) {
    return {
      distanceMeters: 0,
      elevationGainMeters: 0,
      distanceSeries: [],
      elevationSeries: []
    };
  }

  const distanceSeries = [0];
  const elevationSeries = [];
  let distanceMeters = 0;
  let elevationGainMeters = 0;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const ele = point.ele ?? 0;
    elevationSeries.push(ele);

    if (i === 0) continue;
    const prev = points[i - 1];
    const segment = haversineMeters(prev, point);
    distanceMeters += segment;
    distanceSeries.push(distanceMeters);

    const prevEle = prev.ele ?? 0;
    const delta = ele - prevEle;
    if (delta > 0) elevationGainMeters += delta;
  }

  return {
    distanceMeters,
    elevationGainMeters,
    distanceSeries,
    elevationSeries
  };
}

async function readRouteMeta(routeGroupId) {
  const metaPath = path.join(ROOT, 'routes', routeGroupId, 'route.meta.json');
  const meta = await readJson(metaPath);
  if (!meta || !Array.isArray(meta.variants)) {
    throw new Error(`Invalid route.meta.json: ${metaPath}`);
  }
  return meta;
}

async function readRoutePois(routeGroupId) {
  const poisPath = path.join(ROOT, 'routes', routeGroupId, 'route.pois.json');
  try {
    const pois = await readJson(poisPath);
    if (!pois || !Array.isArray(pois.pois)) return null;
    return pois;
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null;
    if (code === 'ENOENT') return null;
    console.warn(`[SUC-SHARED-DATA] Failed to read route.pois.json for ${routeGroupId}`, error);
    return null;
  }
}

async function readGpx(routeGroupId, routeId, label) {
  const baseDir = path.join(ROOT, 'routes', routeGroupId);
  const candidates = [`${label}.gpx`, `${routeId}.gpx`];
  for (const name of candidates) {
    const filePath = path.join(baseDir, name);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      continue;
    }
  }
  throw new Error(`Missing GPX for ${routeId} in ${baseDir}`);
}

function buildRouteStats(routeGroupId, routeId, label, stats, pois) {
  const distanceMi = stats.distanceMeters / 1609.344;
  const distanceKm = stats.distanceMeters / 1000;
  const elevationM = stats.elevationGainMeters;
  const elevationFt = elevationM * 3.28084;

  return {
    id: routeId,
    label,
    name: `${label} Route`,
    description: '',
    color: ROUTE_COLOR_BY_LABEL[label] || '#FFFFFF',
    gpxUrl: `/gpx/${routeGroupId}/${routeId}.gpx`,
    geojsonUrl: `/routes/${routeId}.geojson`,
    statsUrl: `/routes/${routeId}.json`,
    distanceMi,
    distanceKm,
    elevationFt,
    elevationM,
    distanceSeries: stats.distanceSeries,
    elevationSeries: stats.elevationSeries,
    pois
  };
}

function normalizePoiVariant(raw) {
  if (!raw) return null;
  const lat = toNumber(raw.lat);
  const lon = toNumber(raw.lon);
  if (lat == null || lon == null) return null;

  const distanceMi = toNumber(raw.distanceMi);
  const distanceM = toNumber(raw.distanceM);
  const finalDistanceMi =
    distanceMi != null ? distanceMi : distanceM != null ? distanceM / 1609.344 : null;
  const finalDistanceM =
    distanceM != null ? distanceM : finalDistanceMi != null ? finalDistanceMi * 1609.344 : null;
  if (finalDistanceMi == null || finalDistanceM == null) return null;

  const snapIndex = Number.isFinite(raw.snapIndex) ? Math.max(0, Math.floor(raw.snapIndex)) : null;

  const passIndex = Number.isFinite(raw.passIndex)
    ? Math.max(0, Math.floor(raw.passIndex))
    : null;
  const direction =
    raw.direction === 'forward' || raw.direction === 'reverse' ? raw.direction : null;

  return {
    lat,
    lon,
    distanceMi: finalDistanceMi,
    distanceM: finalDistanceM,
    snapIndex,
    passIndex,
    direction
  };
}

function compilePoisForVariant(poisDoc, label) {
  if (!poisDoc || !Array.isArray(poisDoc.pois)) return [];
  const key = normalizeVariantKey(label);
  const compiled = [];

  for (const poi of poisDoc.pois) {
    if (!poi || !poi.variants) continue;
    const rawVariant = poi.variants[key] ?? poi.variants[key.toLowerCase()];
    const normalizedVariants = Array.isArray(rawVariant)
      ? rawVariant.map((entry) => normalizePoiVariant(entry)).filter(Boolean)
      : [normalizePoiVariant(rawVariant)].filter(Boolean);
    if (!normalizedVariants.length) continue;

    for (let i = 0; i < normalizedVariants.length; i += 1) {
      const normalized = normalizedVariants[i];
      compiled.push({
        id: String(poi.id ?? ''),
        poiId: String(poi.id ?? ''),
        title: String(poi.title ?? ''),
        type: String(poi.type ?? ''),
        variant: key,
        distanceMi: normalized.distanceMi,
        distanceM: normalized.distanceM,
        lat: normalized.lat,
        lon: normalized.lon,
        snapIndex: normalized.snapIndex,
        passIndex: normalized.passIndex ?? i,
        direction: normalized.direction ?? undefined,
        system: typeof poi.system === 'boolean' ? poi.system : undefined,
        locked: typeof poi.locked === 'boolean' ? poi.locked : undefined,
        notes: typeof poi.notes === 'string' ? poi.notes : undefined
      });
    }
  }

  return compiled;
}

const DEFAULT_EVENT_POI_CONFIG = {
  showPOIs: true,
  poiCategories: ['parking', 'water', 'hazard', 'view'],
  maxPOIsPerEvent: 4
};

const CATEGORY_ALIASES = new Map([['viewpoint', 'view']]);

function normalizePoiCategory(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();
  if (CATEGORY_ALIASES.has(raw)) return CATEGORY_ALIASES.get(raw);
  if (raw.includes('view')) return 'view';
  return raw;
}

function isPoiHighlighted(poi, allowedCategories) {
  if (!poi || typeof poi !== 'object') return false;
  if (poi.isHighlight === true) return true;
  const category = normalizePoiCategory(poi.category ?? poi.type ?? '');
  return category ? allowedCategories.includes(category) : false;
}

function collectPoiDistances(variantEntry) {
  if (!variantEntry) return [];
  if (Array.isArray(variantEntry)) {
    return variantEntry.map((entry) => toNumber(entry?.distanceMi)).filter((val) => val != null);
  }
  const distance = toNumber(variantEntry.distanceMi);
  return distance != null ? [distance] : [];
}

function selectPoiDistance(poi, variantLabels) {
  if (!poi || !poi.variants) return null;
  const distances = [];
  for (const label of variantLabels) {
    const key = normalizeVariantKey(label);
    const variantEntry = poi.variants[key] ?? poi.variants[key.toLowerCase()];
    distances.push(...collectPoiDistances(variantEntry));
  }
  if (!distances.length) return null;
  return Math.min(...distances);
}

async function compileEventPoiHighlights(event, routeGroupCache, config) {
  const eventId = getEventId(event);
  const routeGroupIds = getRouteGroupIds(event);
  if (!eventId || !routeGroupIds.length) return [];

  const allowedCategories = (config.poiCategories || []).map(normalizePoiCategory);
  const highlightMap = new Map();

  for (const routeGroupId of routeGroupIds) {
    let cached = routeGroupCache.get(routeGroupId);
    if (!cached) {
      cached = {
        meta: readRouteMeta(routeGroupId),
        pois: readRoutePois(routeGroupId)
      };
      routeGroupCache.set(routeGroupId, cached);
    }

    // eslint-disable-next-line no-await-in-loop
    const resolvedMeta = await cached.meta;
    // eslint-disable-next-line no-await-in-loop
    const resolvedPois = await cached.pois;

    const variants = (resolvedMeta && resolvedMeta.variants) || [];
    if (!resolvedPois || !Array.isArray(resolvedPois.pois)) continue;

    for (const poi of resolvedPois.pois) {
      if (!isPoiHighlighted(poi, allowedCategories)) continue;
      const poiId = String(poi.id ?? '');
      if (!poiId || highlightMap.has(poiId)) continue;

      const category = normalizePoiCategory(poi.category ?? poi.type ?? '');
      const distanceMi = selectPoiDistance(poi, variants);

      highlightMap.set(poiId, {
        id: poiId,
        title: String(poi.title ?? ''),
        type: String(poi.type ?? ''),
        category: category || undefined,
        description: typeof poi.description === 'string' ? poi.description : undefined,
        notes: typeof poi.notes === 'string' ? poi.notes : undefined,
        distanceMi: distanceMi ?? undefined
      });
    }
  }

  return Array.from(highlightMap.values()).slice(0, config.maxPOIsPerEvent);
}

function buildPoiFeatures(pois) {
  return pois.map((poi) => ({
    type: 'Feature',
    properties: {
      id: poi.id,
      poiId: poi.poiId ?? poi.id,
      title: poi.title,
      type: poi.type,
      variant: poi.variant,
      distanceMi: poi.distanceMi,
      distanceM: poi.distanceM,
      passIndex: poi.passIndex ?? 0,
      direction: poi.direction,
      system: poi.system ?? false,
      locked: poi.locked ?? false
    },
    geometry: {
      type: 'Point',
      coordinates: [poi.lon, poi.lat]
    }
  }));
}

async function compileRoutesForEvents(selectedEvents) {
  if (!selectedEvents || selectedEvents.length === 0) {
    return { routes: [], compiledRoutes: { routes: {} }, poiHighlightsByEvent: {} };
  }

  const routes = [];
  const compiledRoutes = { routes: {} };
  const routeGroupCache = new Map();
  const poiHighlightsByEvent = {};

  for (const event of selectedEvents) {
    const eventId = getEventId(event);
    if (!eventId) continue;

    const routeGroupIds = getRouteGroupIds(event);
    if (!routeGroupIds.length) {
      console.warn(`[SUC-SHARED-DATA] No route groups defined for ${eventId}`);
      continue;
    }

    for (const routeGroupId of routeGroupIds) {
      if (!routeGroupCache.has(routeGroupId)) {
        routeGroupCache.set(routeGroupId, {
          meta: readRouteMeta(routeGroupId),
          pois: readRoutePois(routeGroupId)
        });
      }

      const cached = routeGroupCache.get(routeGroupId);
      // eslint-disable-next-line no-await-in-loop
      const meta = await cached.meta;
      // eslint-disable-next-line no-await-in-loop
      const poisDoc = await cached.pois;
      const variants = meta.variants || [];

      for (const rawLabel of variants) {
        const label = String(rawLabel).toUpperCase();
        const routeId = `${routeGroupId}-${label}`;
        const gpxRaw = await readGpx(routeGroupId, routeId, label);
        const points = parseGpxPoints(gpxRaw);
        const stats = computeStats(points);
        const variantPois = compilePoisForVariant(poisDoc, label);
        const poiFeatures = buildPoiFeatures(variantPois);
        const geojson = buildGeoJson(points, poiFeatures);
        const compiledStats = buildRouteStats(routeGroupId, routeId, label, stats, variantPois);

        compiledRoutes.routes[routeId] = {
          stats: compiledStats,
          geojson
        };

        routes.push({
          route_id: routeId,
          event_id: eventId,
          label,
          distance_miles: compiledStats.distanceMi,
          vert_feet: compiledStats.elevationFt,
          gpx_url: compiledStats.statsUrl,
          geojson_url: compiledStats.geojsonUrl
        });
      }
    }

    if (DEFAULT_EVENT_POI_CONFIG.showPOIs) {
      // eslint-disable-next-line no-await-in-loop
      const highlights = await compileEventPoiHighlights(
        event,
        routeGroupCache,
        DEFAULT_EVENT_POI_CONFIG
      );
      if (highlights.length) {
        poiHighlightsByEvent[eventId] = highlights;
      }
    }
  }

  return { routes, compiledRoutes, poiHighlightsByEvent };
}

async function main() {
  log('Compiling routes...');
  const eventsMaster = await loadEventsMaster();
  const selectedIds = await loadEventsSelection();

  const selectedEvents = eventsMaster.filter((event) => {
    const eventId = getEventId(event);
    return eventId && selectedIds.includes(eventId);
  });

  const missingIds = selectedIds.filter(
    (id) => !eventsMaster.some((event) => getEventId(event) === id)
  );
  if (missingIds.length > 0) {
    console.warn(`[SUC-SHARED-DATA] Missing events for ids: ${missingIds.join(', ')}`);
  }

  log('Compiling POIs...');
  const { routes, compiledRoutes, poiHighlightsByEvent } =
    await compileRoutesForEvents(selectedEvents);

  log('Compiling events...');
  const normalizedEvents = selectedEvents.map(normalizeEventForBroadcast);
  const eventsJson = eventsJsonExport(
    normalizedEvents.map((event) => ({
      ...event,
      poi_highlights: poiHighlightsByEvent[event.event_id] ?? []
    })),
    routes
  );

  await fs.mkdir(COMPILED_DIR, { recursive: true });
  await fs.writeFile(
    path.join(COMPILED_DIR, 'routes.json'),
    JSON.stringify(compiledRoutes, null, 2),
    'utf8'
  );
  log('Wrote compiled/routes.json');

  await fs.writeFile(path.join(COMPILED_DIR, 'events.json'), eventsJson, 'utf8');
  log('Wrote compiled/events.json');

  log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
