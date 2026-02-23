// Phase 5 stub only: no runtime logic yet.

export type CanonicalRoute = {
  route_id: string;
  name: string;
  variants: string[];
  segment_ids: string[];
};

export type CanonicalEvent = {
  event_id: string;
  name: string;
  event_type: string;
  starts_at: string | null;
  route_group_ids: string[];
  segment_ids?: string[];
};

export type CanonicalChallenge = {
  challenge_id: string;
  name: string;
  status: "planned" | "active" | "completed" | "archived";
  route_group_ids?: string[];
};

export type CanonicalGraph = {
  routes: Map<string, CanonicalRoute>;
  events: Map<string, CanonicalEvent>;
  challenges: Map<string, CanonicalChallenge>;
};

export async function loadCanonicalGraph(_canonicalRoot: string): Promise<CanonicalGraph> {
  throw new Error("stub: implement file-system canonical loaders from suc-shared-data JSON.");
}

export function assertCanonicalGraphIntegrity(_graph: CanonicalGraph): void {
  throw new Error("stub: implement cross-entity integrity checks in broadcast preflight.");
}

