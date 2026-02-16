/**
 * Route Overlay Primitives
 *
 * Shared math + normalization helpers used by Studio previews and Broadcast renderers.
 * Pure functions only. No rendering, no I/O.
 */

const FEET_PER_METER = 3.28084;

// POI type color mapping (aligned with broadcast + route viewer)
const POI_COLORS = {
  water: "#4fc3f7",
  out_and_back: "#f59e0b",
  turnaround: "#f97316",
  fork: "#a78bfa",
  aid: "#7dff89",
  viewpoint: "#38bdf8",
  summit: "#ffb347",
  danger: "#ff6b6b",
  climb: "#f6c453",
  note: "#c0c6d6",
  default: "#c0c6d6",
};

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLon = toRad((b.lon || 0) - (a.lon || 0));
  const lat1 = toRad(a.lat || 0);
  const lat2 = toRad(b.lat || 0);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371000 * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function normalizePoiType(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizePoiIconKey(value) {
  const normalized = normalizePoiType(value).replace(/[\s_]+/g, "-");
  if (normalized === "aid-station" || normalized === "aidstation") return "aid";
  if (normalized === "hazard") return "danger";
  if (normalized === "view") return "viewpoint";
  if (normalized === "water-tap" || normalized === "water_tap") return "water";
  if (normalized === "turn") return "fork";
  if (normalized === "summit" || normalized === "climb") return normalized;
  if (normalized === "out-and-back") return "out_and_back";
  if (normalized === "out_and_back") return "out_and_back";
  if (normalized === "turnaround") return "turnaround";
  if (normalized === "note") return "note";
  if (normalized === "water") return "water";
  if (normalized === "fork") return "fork";
  if (normalized === "viewpoint") return "viewpoint";
  return POI_COLORS[normalized] ? normalized : "default";
}

export function getPoiColor(iconKey) {
  const normalized = normalizePoiIconKey(iconKey);
  return POI_COLORS[normalized] || POI_COLORS.default;
}

function normalizeTrackPoint(raw) {
  if (!raw || typeof raw !== "object") return { lat: 0, lon: 0, ele: null };
  const lat = toNumber(raw.lat ?? raw.latitude ?? raw.y ?? 0) ?? 0;
  const lon = toNumber(raw.lon ?? raw.lng ?? raw.longitude ?? raw.x ?? 0) ?? 0;
  const ele = toNumber(raw.ele ?? raw.elevation ?? raw.z ?? raw.altitude ?? null);
  return { lat, lon, ele };
}

function buildElevationFeet(track) {
  const raw = track.map((point) => {
    if (point.ele == null || !Number.isFinite(point.ele)) return null;
    return Number(point.ele) * FEET_PER_METER;
  });
  if (raw.length === 0) return [];
  let last = 0;
  return raw.map((entry) => {
    if (entry == null) return last;
    last = entry;
    return entry;
  });
}

function buildRouteMetrics(track, elevationFeet) {
  const distanceMiles = new Array(track.length).fill(0);
  const vertGainFeet = new Array(track.length).fill(0);
  const vertLossFeet = new Array(track.length).fill(0);
  const gradePct = new Array(track.length).fill(0);
  let maxAbsGrade = 0;

  for (let i = 1; i < track.length; i += 1) {
    const segmentMeters = haversineMeters(track[i - 1], track[i]);
    const segmentMiles = segmentMeters / 1609.344;
    distanceMiles[i] = distanceMiles[i - 1] + segmentMiles;

    const riseFeet = (elevationFeet[i] || 0) - (elevationFeet[i - 1] || 0);
    if (riseFeet > 0) vertGainFeet[i] = vertGainFeet[i - 1] + riseFeet;
    else vertGainFeet[i] = vertGainFeet[i - 1];

    if (riseFeet < 0) vertLossFeet[i] = vertLossFeet[i - 1] + Math.abs(riseFeet);
    else vertLossFeet[i] = vertLossFeet[i - 1];

    const window = 8;
    const start = Math.max(0, i - window);
    const runMiles = distanceMiles[i] - distanceMiles[start];
    if (runMiles > 0) {
      const riseWindow = (elevationFeet[i] || 0) - (elevationFeet[start] || 0);
      const pct = (riseWindow / (runMiles * 5280)) * 100;
      gradePct[i] = pct;
      maxAbsGrade = Math.max(maxAbsGrade, Math.abs(pct));
    } else {
      gradePct[i] = gradePct[i - 1];
    }
  }

  const totalMiles = distanceMiles[distanceMiles.length - 1] || 0;
  const totalGainFeet = vertGainFeet[vertGainFeet.length - 1] || 0;
  const totalLossFeet = vertLossFeet[vertLossFeet.length - 1] || 0;

  return {
    distanceMiles,
    vertGainFeet,
    vertLossFeet,
    gradePct,
    totalMiles,
    totalGainFeet,
    totalLossFeet,
    steepestGradePct: maxAbsGrade,
  };
}

function projectPoiMetrics(pois, track, metrics, elevationFeet) {
  const safePois = Array.isArray(pois) ? pois : [];
  if (!track.length) return [];

  return safePois
    .map((poi, index) => {
      if (!poi || typeof poi !== "object") return null;
      const lat = toNumber(poi.lat ?? poi.latitude);
      const lon = toNumber(poi.lon ?? poi.lng ?? poi.longitude);
      let routePointIndex = Number.isFinite(poi.routePointIndex)
        ? Math.floor(Number(poi.routePointIndex))
        : null;

      if (routePointIndex == null || routePointIndex < 0 || routePointIndex >= track.length) {
        if (lat == null || lon == null) return null;
        let bestIdx = 0;
        let bestMeters = Infinity;
        for (let i = 0; i < track.length; i += 1) {
          const meters = haversineMeters({ lat, lon }, track[i]);
          if (meters < bestMeters) {
            bestMeters = meters;
            bestIdx = i;
          }
        }
        routePointIndex = bestIdx;
      }

      const iconKey = normalizePoiIconKey(poi.iconKey ?? poi.type ?? "default");
      return {
        id: String(poi.id ?? `poi-${index}`),
        title: String(poi.title ?? poi.label ?? "POI"),
        type: String(poi.type ?? "default"),
        lat: Number.isFinite(lat) ? Number(lat) : track[routePointIndex].lat,
        lon: Number.isFinite(lon) ? Number(lon) : track[routePointIndex].lon,
        routePointIndex,
        coordIndex: routePointIndex,
        iconKey,
        color: getPoiColor(iconKey),
        distanceMi: metrics.distanceMiles[routePointIndex] || 0,
        elevationFt: elevationFeet[routePointIndex] || 0,
      };
    })
    .filter(Boolean);
}

/**
 * Build the shared overlay model from track + POIs.
 * @param {Array<{lat:number, lon:number, ele?:number|null}>} track
 * @param {Array<object>} pois
 * @param {object} [options]
 * @param {string} [options.routeId]
 */
export function buildRouteOverlayModel(track, pois, options = {}) {
  const normalizedTrack = Array.isArray(track) ? track.map(normalizeTrackPoint) : [];
  const elevationFeet = buildElevationFeet(normalizedTrack);
  const metrics = buildRouteMetrics(normalizedTrack, elevationFeet);
  const projectedPois = projectPoiMetrics(pois, normalizedTrack, metrics, elevationFeet);

  return {
    routeId: String(options.routeId || ""),
    trackLengthMiles: metrics.totalMiles || 0,
    track: normalizedTrack,
    elevation: {
      elevationFeet,
      metrics,
      pois: projectedPois,
    },
    pois: projectedPois,
  };
}

export { POI_COLORS };
