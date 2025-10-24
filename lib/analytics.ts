import { createSupabaseServerClient } from "./supabaseServerClient";

const ANALYTICS_TABLE = "vercel_analytics_events";

type RawAnalyticsRow = {
  event_id: string;
  visit_id: string | null;
  session_id: string | null;
  occurred_at: string;
};

export type AnalyticsSummary = {
  visitors: number | null;
  pageViews: number | null;
  lastEventAt: string | null;
  error?: string;
};

export async function getAnalyticsSummaryFromDrain(
  hours = 24
): Promise<AnalyticsSummary> {
  const supabase = createSupabaseServerClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from(ANALYTICS_TABLE)
    .select("event_id, visit_id, session_id, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("Failed to load analytics events", error);
    return {
      visitors: null,
      pageViews: null,
      lastEventAt: null,
      error: "Unable to load analytics data right now.",
    };
  }

  const rows = (data ?? []) as RawAnalyticsRow[];

  if (rows.length === 0) {
    return {
      visitors: 0,
      pageViews: 0,
      lastEventAt: null,
    };
  }

  const visitorIds = new Set<string>();

  for (const row of rows) {
    const uniqueId = row.visit_id ?? row.session_id ?? row.event_id;
    visitorIds.add(uniqueId);
  }

  const pageViews = rows.length;
  const visitors = visitorIds.size;
  const lastEventAt = rows[0]?.occurred_at ?? null;

  return {
    visitors,
    pageViews,
    lastEventAt,
  };
}
