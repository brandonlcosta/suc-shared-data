import { promises as fs } from 'fs';
import path from 'path';
import { SHARED_DATA_ROOT, getEventId, getRouteGroupIds } from './canonical.js';

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
  return String(label ?? '').toUpperCase();
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
  if (points.length > 0) {
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
  if (points.length === 0) {
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

async function readJson(filePath, label) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) {
      throw new Error(`[BROADCAST] Empty ${label} at ${filePath}`);
    }
    return JSON.parse(raw);
  } catch (error) {
    const code = error?.code;
    if (code === 'ENOENT') {
      throw new Error(`[BROADCAST] Missing ${label} at ${filePath}`);
    }
    throw new Error(`[BROADCAST] Failed to read ${label} at ${filePath}`);
  }
}

async function readRouteMeta(routeGroupId) {
  const metaPath = path.join(SHARED_DATA_ROOT, 'routes', routeGroupId, 'route.meta.json');
  const meta = await readJson(metaPath, 'route.meta.json');
  if (!meta || !Array.isArray(meta.variants)) {
    throw new Error(`[BROADCAST] Invalid route.meta.json at ${metaPath}`);
  }
  return meta;
}

async function readRoutePois(routeGroupId) {
  const poisPath = path.join(SHARED_DATA_ROOT, 'routes', routeGroupId, 'route.pois.json');
  try {
    const pois = await readJson(poisPath, 'route.pois.json');
    if (!pois || !Array.isArray(pois.pois)) return null;
    return pois;
  } catch (error) {
    const code = error?.code;
    if (code === 'ENOENT') return null;
    console.warn(`[BROADCAST] Failed to read route.pois.json for ${routeGroupId}`, error);
    return null;
  }
}

async function readGpx(routeGroupId, routeId, label) {
  const baseDir = path.join(SHARED_DATA_ROOT, 'routes', routeGroupId);
  const candidates = [`${label}.gpx`, `${routeId}.gpx`];
  for (const name of candidates) {
    const filePath = path.join(baseDir, name);
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
  }
  throw new Error(`[BROADCAST] Missing GPX for ${routeId} in ${baseDir}`);
}

function buildRouteStats(routeGroupId, routeId, label, stats, pois, options) {
  const routesBase = (options.routesBaseUrl ?? '/routes').replace(/\/$/, '');
  const gpxBase = (options.gpxBaseUrl ?? '/gpx').replace(/\/$/, '');
  const distanceMi = stats.distanceMeters / 1609.344;
  const distanceKm = stats.distanceMeters / 1000;
  const elevationM = stats.elevationGainMeters;
  const elevationFt = elevationM * 3.28084;

  return {
    id: routeId,
    routeGroupId,
    label,
    name: `${label} Route`,
    description: '',
    color: ROUTE_COLOR_BY_LABEL[label] || ROUTE_COLOR_BY_LABEL.ROUTE,
    gpxUrl: `${gpxBase}/${routeGroupId}/${routeId}.gpx`,
    geojsonUrl: `${routesBase}/${routeId}.geojson`,
    statsUrl: `${routesBase}/${routeId}.json`,
    distanceMi,
    distanceKm,
    elevationFt,
    elevationM,
    distanceSeries: stats.distanceSeries,
    elevationSeries: stats.elevationSeries,
    pois: pois ?? []
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

  const snapIndex = Number.isFinite(raw.snapIndex)
    ? Math.max(0, Math.floor(raw.snapIndex))
    : null;

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

async function compileRouteGroup(routeGroupId, options = {}) {
  const meta = await readRouteMeta(routeGroupId);
  const poisDoc = await readRoutePois(routeGroupId);
  const variants = meta.variants || [];

  const compiled = [];
  for (const rawLabel of variants) {
    const label = normalizeVariantKey(rawLabel);
    const routeId = `${routeGroupId}-${label}`;
    const gpxRaw = await readGpx(routeGroupId, routeId, label);
    const points = parseGpxPoints(gpxRaw);
    const stats = computeStats(points);
    const variantPois = compilePoisForVariant(poisDoc, label);
    const poiFeatures = buildPoiFeatures(variantPois);
    const geojson = buildGeoJson(points, poiFeatures);
    const compiledStats = buildRouteStats(routeGroupId, routeId, label, stats, variantPois, options);

    compiled.push({
      stats: compiledStats,
      geojson,
      gpxContent: gpxRaw
    });
  }

  return compiled;
}

async function compileRoutesForEvents(events, options = {}) {
  if (!Array.isArray(events)) {
    throw new Error('[BROADCAST] compileRoutesForEvents expected an array of events.');
  }

  const compiledRoutes = { routes: {} };
  const routes = [];
  const routeGroupCache = new Map();

  for (const event of events) {
    const eventId = getEventId(event);
    if (!eventId) {
      console.warn('[BROADCAST] Event missing eventId:', event);
      continue;
    }

    const routeGroupIds = getRouteGroupIds(event);
    if (!routeGroupIds.length) {
      console.warn(`[BROADCAST] No route groups defined for ${eventId}`);
      continue;
    }

    for (const routeGroupId of routeGroupIds) {
      if (!routeGroupCache.has(routeGroupId)) {
        const compiled = await compileRouteGroup(routeGroupId, options);
        routeGroupCache.set(routeGroupId, compiled);
      }

      const compiledVariants = routeGroupCache.get(routeGroupId) ?? [];
      for (const variant of compiledVariants) {
        const routeId = variant.stats.id;
        if (!compiledRoutes.routes[routeId]) {
          compiledRoutes.routes[routeId] = variant;
        }
        routes.push({
          route_id: routeId,
          event_id: eventId,
          label: variant.stats.label,
          distance_miles: variant.stats.distanceMi,
          vert_feet: variant.stats.elevationFt,
          gpx_url: variant.stats.statsUrl,
          geojson_url: variant.stats.geojsonUrl
        });
      }
    }
  }

  return { routes, compiledRoutes };
}

export { compileRouteGroup, compileRoutesForEvents };
