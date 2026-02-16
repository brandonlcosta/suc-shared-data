import { buildTimelineId, normalizeSegments, toFinite } from "./timelineUtils.js";

function sortPois(pois) {
  return [...pois].sort((left, right) => {
    const leftIndex = Number(left.routePointIndex ?? left.coordIndex ?? 0);
    const rightIndex = Number(right.routePointIndex ?? right.coordIndex ?? 0);
    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    return String(left.id || "").localeCompare(String(right.id || ""));
  });
}

function buildDefaultSegment(durationMs) {
  return {
    id: "seg-0",
    startMs: 0,
    endMs: Math.max(0, Math.round(toFinite(durationMs, 0))),
    cameraMode: "follow",
    overlay: {
      showElevation: true,
      showMetrics: true,
      showPoiCallouts: true,
    },
  };
}

function buildPoiSegments(pois, durationMs) {
  const safeDuration = Math.max(0, Math.round(toFinite(durationMs, 0)));
  if (!pois.length || safeDuration <= 0) return [buildDefaultSegment(safeDuration)];
  const ordered = sortPois(pois);
  const segmentSpan = safeDuration / Math.max(1, ordered.length);
  return ordered.map((poi, index) => {
    const startMs = Math.round(index * segmentSpan);
    const endMs = Math.round((index + 1) * segmentSpan);
    return {
      id: `poi-${poi.id || index}`,
      startMs,
      endMs,
      cameraMode: "follow",
      overlay: {
        showElevation: true,
        showMetrics: true,
        showPoiCallouts: true,
      },
      activePoiIds: [String(poi.id || "")],
      caption: poi.title || poi.label || undefined,
    };
  });
}

export function buildCinematicTimeline({ overlayModel, durationMs, mode }) {
  const safeDuration = Math.max(0, Math.round(toFinite(durationMs, 0)));
  const routeId = overlayModel?.routeId || "route";
  const resolvedMode = mode === "route-intel-default" ? "route-intel-default" : "custom";

  const segments =
    resolvedMode === "custom"
      ? buildPoiSegments(overlayModel?.pois || [], safeDuration)
      : [buildDefaultSegment(safeDuration)];

  const timeline = {
    timelineId: buildTimelineId(routeId, safeDuration, resolvedMode),
    totalDurationMs: safeDuration,
    segments,
  };

  return {
    ...timeline,
    segments: normalizeSegments(timeline.segments, timeline.totalDurationMs),
  };
}
