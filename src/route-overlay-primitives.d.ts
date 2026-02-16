export type RouteOverlayTrackPoint = {
  lat: number;
  lon: number;
  ele?: number | null;
};

export type RouteOverlayMetrics = {
  distanceMiles: number[];
  vertGainFeet: number[];
  vertLossFeet: number[];
  gradePct: number[];
  totalMiles: number;
  totalGainFeet: number;
  totalLossFeet: number;
  steepestGradePct: number;
};

export type RouteOverlayPoi = {
  id: string;
  title: string;
  type: string;
  lat: number;
  lon: number;
  routePointIndex: number;
  coordIndex: number;
  iconKey: string;
  color: string;
  distanceMi: number;
  elevationFt: number;
};

export type RouteOverlayElevationModel = {
  elevationFeet: number[];
  metrics: RouteOverlayMetrics;
  pois: RouteOverlayPoi[];
};

export type RouteOverlayModel = {
  routeId: string;
  trackLengthMiles: number;
  track: RouteOverlayTrackPoint[];
  elevation: RouteOverlayElevationModel;
  pois: RouteOverlayPoi[];
};

export declare function normalizePoiIconKey(value: unknown): string;
export declare function getPoiColor(iconKey: unknown): string;
export declare function buildRouteOverlayModel(
  track: RouteOverlayTrackPoint[],
  pois: object[],
  options?: { routeId?: string }
): RouteOverlayModel;

export declare const POI_COLORS: Record<string, string>;
