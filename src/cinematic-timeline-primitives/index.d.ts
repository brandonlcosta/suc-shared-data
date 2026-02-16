import type { CinematicTimeline, CinematicSegment } from "./types";

export declare function buildCinematicTimeline(input: {
  overlayModel: {
    routeId?: string;
    pois?: Array<{ id?: string; title?: string; label?: string; routePointIndex?: number; coordIndex?: number }>;
  } | null;
  durationMs: number;
  mode: "route-intel-default" | "custom";
}): CinematicTimeline;

export declare function sampleTimeline(): CinematicTimeline;

export declare function toFinite(value: unknown, fallback?: number): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function clampMs(value: unknown, totalMs: number): number;
export declare function sortSegments(segments: CinematicSegment[]): CinematicSegment[];
export declare function normalizeSegments(segments: CinematicSegment[], totalDurationMs: number): CinematicSegment[];
export declare function resolveActiveSegment(timeline: CinematicTimeline | null, timeMs: number): CinematicSegment | null;
export declare function buildTimelineId(routeId: string, durationMs: number, mode: string): string;
