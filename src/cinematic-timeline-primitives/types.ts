export type CinematicSegment = {
  id: string;
  startMs: number;
  endMs: number;
  cameraMode: "static" | "follow" | "flyover";
  speedMultiplier?: number;
  overlay: {
    showElevation?: boolean;
    showMetrics?: boolean;
    showPoiCallouts?: boolean;
  };
  activePoiIds?: string[];
  caption?: string;
};

export type CinematicTimeline = {
  timelineId: string;
  totalDurationMs: number;
  segments: CinematicSegment[];
};
