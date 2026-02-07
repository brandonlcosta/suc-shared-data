'use strict';

const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const COMPILED_DIR = path.join(ROOT, 'compiled');
const SHOW_ALL_POIS = process.env.SHOW_ALL_POIS === 'true';
let loggedShowAllPois = false;

const log = (message) => {
  console.log(`[SUC-SHARED-DATA] ${message}`);
};

function logShowAllPoisOnce() {
  if (!SHOW_ALL_POIS || loggedShowAllPois) return;
  console.log('[DEBUG] SHOW_ALL_POIS enabled — bypassing POI filters');
  loggedShowAllPois = true;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null;
    if (code === 'ENOENT') return fallback;
    throw error;
  }
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

async function loadWorkoutsMaster() {
  const filePath = path.join(ROOT, 'workouts', 'workouts.master.json');
  const parsed = await readJson(filePath);
  if (!parsed || !Array.isArray(parsed.workouts)) {
    throw new Error(`Invalid workouts.master.json: ${filePath}`);
  }
  return parsed.workouts;
}

async function loadTrainingContentMaster() {
  const filePath = path.join(ROOT, 'training-content', 'training-content.master.json');
  const parsed = await readJsonIfExists(filePath, { items: [] });
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error(`Invalid training-content.master.json: ${filePath}`);
  }
  return parsed.items;
}

async function loadGearReviewsMaster() {
  const filePath = path.join(ROOT, 'gear-reviews', 'gear-reviews.master.json');
  const parsed = await readJsonIfExists(filePath, { items: [] });
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error(`Invalid gear-reviews.master.json: ${filePath}`);
  }
  return parsed.items;
}

async function loadCrewStoriesMaster() {
  const filePath = path.join(ROOT, 'crew-stories', 'crew-stories.master.json');
  const parsed = await readJsonIfExists(filePath, { items: [] });
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error(`Invalid crew-stories.master.json: ${filePath}`);
  }
  return parsed.items;
}

async function loadLeaderboardsCurrent() {
  const filePath = path.join(ROOT, 'leaderboards', 'leaderboards.current.json');
  const parsed = await readJsonIfExists(filePath, { entries: [], updatedAt: null });
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(`Invalid leaderboards.current.json: ${filePath}`);
  }
  return parsed;
}

async function loadRecapsMaster() {
  const filePath = path.join(ROOT, 'recaps', 'recaps.master.json');
  const parsed = await readJsonIfExists(filePath, { weeks: [] });
  if (!parsed || !Array.isArray(parsed.weeks)) {
    throw new Error(`Invalid recaps.master.json: ${filePath}`);
  }
  return parsed.weeks;
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

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  if (value == null) return [];
  const str = String(value).trim();
  return str ? [str] : [];
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
    let rawVariant = poi.variants[key] ?? poi.variants[key.toLowerCase()];
    if (SHOW_ALL_POIS && !rawVariant) {
      const variantKeys = Object.keys(poi.variants);
      if (variantKeys.length > 0) {
        rawVariant = poi.variants[variantKeys[0]];
      }
    }
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

  if (SHOW_ALL_POIS) {
    logShowAllPoisOnce();
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
        const poiId = String(poi?.id ?? '');
        if (!poiId || highlightMap.has(poiId)) continue;

        const category = normalizePoiCategory(poi?.category ?? poi?.type ?? '');
        const distanceMi = selectPoiDistance(poi, variants);

        highlightMap.set(poiId, {
          id: poiId,
          title: String(poi?.title ?? ''),
          type: String(poi?.type ?? ''),
          category: category || undefined,
          description: typeof poi?.description === 'string' ? poi.description : undefined,
          notes: typeof poi?.notes === 'string' ? poi.notes : undefined,
          distanceMi: distanceMi ?? undefined
        });
      }
    }

    return Array.from(highlightMap.values());
  }

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

function normalizeTrainingItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const topics = normalizeStringArray(raw.topics);
  return {
    ...raw,
    id,
    type: raw.type || 'training',
    series: raw.series || null,
    part: Number.isFinite(raw.part) ? raw.part : raw.part ? Number(raw.part) : undefined,
    topics,
    tier: raw.tier || 'team',
    title: raw.title || '',
    summary: raw.summary || '',
    body: raw.body || ''
  };
}

function compileTrainingContent(items) {
  const normalized = items.map(normalizeTrainingItem).filter(Boolean);
  // Only include published items (filter out drafts)
  const published = normalized.filter((item) => item.status !== 'draft');
  const byTopic = new Map();
  const bySeries = new Map();

  for (const item of published) {
    const seriesKey = slugify(item.series);
    if (seriesKey) {
      if (!bySeries.has(seriesKey)) bySeries.set(seriesKey, []);
      bySeries.get(seriesKey).push(item);
    }

    for (const topic of item.topics || []) {
      const topicKey = slugify(topic);
      if (!topicKey) continue;
      if (!byTopic.has(topicKey)) byTopic.set(topicKey, []);
      byTopic.get(topicKey).push(item);
    }
  }

  for (const [, entries] of bySeries) {
    entries.sort((a, b) => (a.part || 0) - (b.part || 0));
  }

  return { index: published, byTopic, bySeries };
}

function normalizeGearReview(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  return {
    ...raw,
    id,
    type: raw.type || 'gear-review',
    category: raw.category || '',
    tags: normalizeStringArray(raw.tags),
    tier: raw.tier || 'public',
    summary: raw.summary || '',
    pros: Array.isArray(raw.pros) ? raw.pros : [],
    cons: Array.isArray(raw.cons) ? raw.cons : [],
    body: raw.body || ''
  };
}

function compileGearReviews(items) {
  const normalized = items.map(normalizeGearReview).filter(Boolean);
  const byCategory = new Map();
  for (const item of normalized) {
    const categoryKey = slugify(item.category);
    if (!categoryKey) continue;
    if (!byCategory.has(categoryKey)) byCategory.set(categoryKey, []);
    byCategory.get(categoryKey).push(item);
  }
  return { index: normalized, byCategory };
}

function normalizeCrewStory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;
  return {
    ...raw,
    id,
    type: raw.type || 'crew-story',
    person: raw.person || '',
    tags: normalizeStringArray(raw.tags),
    tier: raw.tier || 'public',
    summary: raw.summary || '',
    body: raw.body || ''
  };
}

function compileCrewStories(items) {
  const normalized = items.map(normalizeCrewStory).filter(Boolean);
  const byTag = new Map();
  for (const item of normalized) {
    for (const tag of item.tags || []) {
      const tagKey = slugify(tag);
      if (!tagKey) continue;
      if (!byTag.has(tagKey)) byTag.set(tagKey, []);
      byTag.get(tagKey).push(item);
    }
  }
  return { index: normalized, byTag };
}

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

async function main() {
  logShowAllPoisOnce();
  log('Compiling routes...');
  const eventsMaster = await loadEventsMaster();
  const selectedIds = await loadEventsSelection();
  const workoutsMaster = await loadWorkoutsMaster();

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

  log('Compiling training content...');
  const trainingItems = await loadTrainingContentMaster();
  const trainingCompiled = compileTrainingContent(trainingItems);
  await fs.mkdir(path.join(COMPILED_DIR, 'training', 'by-topic'), { recursive: true });
  await fs.mkdir(path.join(COMPILED_DIR, 'training', 'series'), { recursive: true });
  await fs.writeFile(
    path.join(COMPILED_DIR, 'training', 'index.json'),
    JSON.stringify(trainingCompiled.index, null, 2),
    'utf8'
  );
  for (const [topic, items] of trainingCompiled.byTopic) {
    await fs.writeFile(
      path.join(COMPILED_DIR, 'training', 'by-topic', `${topic}.json`),
      JSON.stringify(items, null, 2),
      'utf8'
    );
  }
  for (const [series, items] of trainingCompiled.bySeries) {
    await fs.writeFile(
      path.join(COMPILED_DIR, 'training', 'series', `${series}.json`),
      JSON.stringify(items, null, 2),
      'utf8'
    );
  }
  log('Wrote compiled/training/*');

  log('Compiling gear reviews...');
  const gearItems = await loadGearReviewsMaster();
  const gearCompiled = compileGearReviews(gearItems);
  await fs.mkdir(path.join(COMPILED_DIR, 'gear-reviews', 'by-category'), { recursive: true });
  await fs.writeFile(
    path.join(COMPILED_DIR, 'gear-reviews', 'index.json'),
    JSON.stringify(gearCompiled.index, null, 2),
    'utf8'
  );
  for (const [category, items] of gearCompiled.byCategory) {
    await fs.writeFile(
      path.join(COMPILED_DIR, 'gear-reviews', 'by-category', `${category}.json`),
      JSON.stringify(items, null, 2),
      'utf8'
    );
  }
  log('Wrote compiled/gear-reviews/*');

  log('Compiling crew stories...');
  const crewItems = await loadCrewStoriesMaster();
  const crewCompiled = compileCrewStories(crewItems);
  await fs.mkdir(path.join(COMPILED_DIR, 'crew-stories', 'by-tag'), { recursive: true });
  await fs.writeFile(
    path.join(COMPILED_DIR, 'crew-stories', 'index.json'),
    JSON.stringify(crewCompiled.index, null, 2),
    'utf8'
  );
  for (const [tag, items] of crewCompiled.byTag) {
    await fs.writeFile(
      path.join(COMPILED_DIR, 'crew-stories', 'by-tag', `${tag}.json`),
      JSON.stringify(items, null, 2),
      'utf8'
    );
  }
  log('Wrote compiled/crew-stories/*');

  log('Compiling leaderboards...');
  const leaderboards = await loadLeaderboardsCurrent();
  await fs.mkdir(path.join(COMPILED_DIR, 'leaderboards'), { recursive: true });
  await fs.writeFile(
    path.join(COMPILED_DIR, 'leaderboards', 'current.json'),
    JSON.stringify(leaderboards, null, 2),
    'utf8'
  );
  log('Wrote compiled/leaderboards/current.json');

  log('Compiling recaps...');
  const recaps = await loadRecapsMaster();
  await fs.mkdir(path.join(COMPILED_DIR, 'recaps', 'weekly'), { recursive: true });
  for (const recap of recaps) {
    if (!recap || !recap.date) continue;
    const dateKey = String(recap.date).trim();
    if (!dateKey) continue;
    await fs.writeFile(
      path.join(COMPILED_DIR, 'recaps', 'weekly', `${dateKey}.json`),
      JSON.stringify(recap, null, 2),
      'utf8'
    );
  }
  log('Wrote compiled/recaps/weekly/*');

  const meta = {
    lastBuildAt: new Date().toISOString(),
    commit: getGitSha(),
    counts: {
      routes: Object.keys(compiledRoutes.routes || {}).length,
      events: normalizedEvents.length,
      workouts: workoutsMaster.length
    }
  };
  await fs.writeFile(path.join(COMPILED_DIR, '_meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  log('Wrote compiled/_meta.json');

  log('Done.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
