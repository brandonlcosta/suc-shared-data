import { buildCinematicTimeline } from "./buildCinematicTimeline.js";

export function sampleTimeline() {
  return buildCinematicTimeline({
    overlayModel: {
      routeId: "sample-route",
      trackLengthMiles: 26.2,
      track: [],
      elevation: { elevationFeet: [], metrics: { distanceMiles: [], vertGainFeet: [], vertLossFeet: [], gradePct: [], totalMiles: 26.2, totalGainFeet: 0, totalLossFeet: 0, steepestGradePct: 0 }, pois: [] },
      pois: [
        { id: "poi-1", title: "Aid 1", type: "aid", lat: 0, lon: 0, routePointIndex: 0, coordIndex: 0, iconKey: "aid", color: "#7dff89", distanceMi: 0, elevationFt: 0 },
        { id: "poi-2", title: "Summit", type: "summit", lat: 0, lon: 0, routePointIndex: 10, coordIndex: 10, iconKey: "summit", color: "#ffb347", distanceMi: 5, elevationFt: 1200 },
      ],
    },
    durationMs: 90000,
    mode: "custom",
  });
}
