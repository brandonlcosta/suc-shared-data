// Phase 5 stub only: endpoint payload contracts and adapter signatures.

export type RoutesAllResponse = {
  generated_at: string;
  routes: Array<{
    route_id: string;
    name: string;
    variants: string[];
    segment_ids: string[];
  }>;
};

export type EventsUpcomingResponse = {
  generated_at: string;
  events: Array<{
    event_id: string;
    name: string;
    event_type: string;
    starts_at: string | null;
    route_group_ids: string[];
  }>;
};

export type ChallengesActiveResponse = {
  generated_at: string;
  challenges: Array<{
    challenge_id: string;
    name: string;
    status: "active";
    route_group_ids: string[];
  }>;
};

export function buildRoutesAllJson(): RoutesAllResponse {
  throw new Error("stub: source from canonical graph only (no Supabase).");
}

export function buildEventsUpcomingJson(): EventsUpcomingResponse {
  throw new Error("stub: source from canonical graph only (no Supabase).");
}

export function buildChallengesActiveJson(): ChallengesActiveResponse {
  throw new Error("stub: source from canonical graph only (no Supabase).");
}

