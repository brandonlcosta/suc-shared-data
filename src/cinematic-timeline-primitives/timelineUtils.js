function toFinite(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampMs(value, totalMs) {
  const safeTotal = Math.max(0, toFinite(totalMs, 0));
  return clamp(toFinite(value, 0), 0, safeTotal);
}

function sortSegments(segments) {
  return [...segments].sort((left, right) => {
    const startDelta = left.startMs - right.startMs;
    if (startDelta !== 0) return startDelta;
    const endDelta = left.endMs - right.endMs;
    if (endDelta !== 0) return endDelta;
    return String(left.id).localeCompare(String(right.id));
  });
}

function normalizeSegments(segments, totalDurationMs) {
  const safeDuration = Math.max(0, toFinite(totalDurationMs, 0));
  return sortSegments(segments).map((segment) => {
    const startMs = clampMs(segment.startMs, safeDuration);
    const endMs = clampMs(Math.max(startMs, toFinite(segment.endMs, startMs)), safeDuration);
    return {
      ...segment,
      startMs,
      endMs,
    };
  });
}

function resolveActiveSegment(timeline, timeMs) {
  if (!timeline || !Array.isArray(timeline.segments)) return null;
  const safeTime = clampMs(timeMs, timeline.totalDurationMs);
  return (
    timeline.segments.find((segment) => safeTime >= segment.startMs && safeTime <= segment.endMs) ||
    null
  );
}

function buildTimelineId(routeId, durationMs, mode) {
  const safeRouteId = String(routeId || "route").trim() || "route";
  const safeDuration = Math.max(0, Math.round(toFinite(durationMs, 0)));
  const safeMode = String(mode || "custom").trim() || "custom";
  return `${safeRouteId}-${safeMode}-${safeDuration}`;
}

export {
  toFinite,
  clamp,
  clampMs,
  sortSegments,
  normalizeSegments,
  resolveActiveSegment,
  buildTimelineId,
};
