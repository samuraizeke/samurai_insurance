import { createSupabaseServerClient } from "./supabaseServerClient";

const ANALYTICS_TABLE = "vercel_analytics_events";

const RANGE_TO_HOURS = {
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
} as const;

export type AnalyticsRange = keyof typeof RANGE_TO_HOURS;

type RawAnalyticsRow = {
  event_id: string;
  visit_id: string | null;
  session_id: string | null;
  occurred_at: string;
  url: string | null;
  path: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  referrer: string | null;
  user_agent: string | null;
};

export type AnalyticsTrendPoint = {
  label: string;
  value: number;
  timestamp: string;
};

export type AnalyticsBreakdownEntry = {
  label: string;
  value: number;
  percent: number;
};

export type AnalyticsSummary = {
  visitors: number | null;
  pageViews: number | null;
  lastEventAt: string | null;
  error?: string;
};

export type AnalyticsDashboard = {
  range: AnalyticsRange;
  summary: {
    visitors: number;
    pageViews: number;
    activeVisitors: number;
    bounceRate: number;
    lastEventAt: string | null;
  };
  trend: AnalyticsTrendPoint[];
  breakdowns: {
    pages: AnalyticsBreakdownEntry[];
    referrers: AnalyticsBreakdownEntry[];
    countries: AnalyticsBreakdownEntry[];
    devices: AnalyticsBreakdownEntry[];
    operatingSystems: AnalyticsBreakdownEntry[];
    browsers: AnalyticsBreakdownEntry[];
    hostnames: AnalyticsBreakdownEntry[];
    utmSources: AnalyticsBreakdownEntry[];
  };
  error?: string;
};

type VisitorSetMap = Map<string, Set<string>>;

function ensureVisitorSet(map: VisitorSetMap, key: string) {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  return map.get(key)!;
}

function toBreakdown(
  map: VisitorSetMap,
  totalVisitors: number,
  limit = 6
): AnalyticsBreakdownEntry[] {
  if (totalVisitors <= 0) {
    return [];
  }

  return Array.from(map.entries())
    .filter(([, visitors]) => visitors.size > 0)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([label, visitors]) => ({
      label,
      value: visitors.size,
      percent: visitors.size / totalVisitors,
    }));
}

function normalisePath(path: string | null, url: string | null) {
  if (path && path.trim()) {
    return path;
  }

  if (url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname || "/";
    } catch {
      return "/";
    }
  }

  return "/";
}

function normaliseHostname(url: string | null) {
  if (!url) {
    return "Unknown";
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") || "Unknown";
  } catch {
    return "Unknown";
  }
}

function normaliseReferrer(referrer: string | null) {
  if (!referrer) {
    return "Direct / None";
  }

  try {
    const parsed = new URL(referrer);
    return parsed.hostname.replace(/^www\./, "") || "Direct / None";
  } catch {
    return referrer;
  }
}

function detectDevice(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown";
  }

  const ua = userAgent.toLowerCase();

  if (/\b(bot|crawl|spider)\b/.test(ua)) {
    return "Bot";
  }

  if (/\b(tablet|ipad)\b/.test(ua)) {
    return "Tablet";
  }

  if (/\b(mobile|iphone|android(?!.*tablet)|windows phone)\b/.test(ua)) {
    return "Mobile";
  }

  return "Desktop";
}

function detectOperatingSystem(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown";
  }

  if (/windows nt/i.test(userAgent)) {
    return "Windows";
  }

  if (/mac os x|macintosh/i.test(userAgent)) {
    return "Mac";
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  if (/cros/i.test(userAgent)) {
    return "Chrome OS";
  }

  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Other";
}

function detectBrowser(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown";
  }

  if (/edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) {
    return "Opera";
  }

  if (/firefox/i.test(userAgent)) {
    return "Firefox";
  }

  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    return "Safari";
  }

  if (/chrome|crios|chromium/i.test(userAgent)) {
    return "Chrome";
  }

  if (/msie|trident/i.test(userAgent)) {
    return "Internet Explorer";
  }

  return "Other";
}

function bucketConfiguration(hours: number) {
  if (hours <= 24) {
    return {
      bucketDurationMs: 60 * 60 * 1000,
      labelFormatter: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
      }),
    };
  }

  return {
    bucketDurationMs: 24 * 60 * 60 * 1000,
    labelFormatter: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

function parseUtmLabel(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const source = parsed.searchParams.get("utm_source");
    const campaign = parsed.searchParams.get("utm_campaign");
    const medium = parsed.searchParams.get("utm_medium");

    if (source || campaign || medium) {
      const parts = [source, campaign, medium]
        .filter(Boolean)
        .map((value) => value!.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return null;
      }

      return parts.join(" • ");
    }

    return null;
  } catch {
    return null;
  }
}

export async function getLatestAnalyticsEvent(
  range: AnalyticsRange = "24h"
): Promise<string | null> {
  const hours = RANGE_TO_HOURS[range] ?? RANGE_TO_HOURS["24h"];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from(ANALYTICS_TABLE)
    .select("occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch latest analytics event", error);
    return null;
  }

  return typeof data?.occurred_at === "string" ? data.occurred_at : null;
}

export async function getAnalyticsDashboard(
  range: AnalyticsRange = "24h"
): Promise<AnalyticsDashboard> {
  const hours = RANGE_TO_HOURS[range] ?? RANGE_TO_HOURS["24h"];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from(ANALYTICS_TABLE)
    .select(
      "event_id, visit_id, session_id, occurred_at, url, path, country, city, region, referrer, user_agent"
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: true })
    .limit(20000);

  if (error) {
    console.error("Failed to load analytics events", error);
    return {
      range,
      summary: {
        visitors: 0,
        pageViews: 0,
        activeVisitors: 0,
        bounceRate: 0,
        lastEventAt: null,
      },
      trend: [],
      breakdowns: {
        pages: [],
        referrers: [],
        countries: [],
        devices: [],
        operatingSystems: [],
        browsers: [],
        hostnames: [],
        utmSources: [],
      },
      error: "Unable to load analytics data right now.",
    };
  }

  const rows = (data ?? []) as RawAnalyticsRow[];

  if (rows.length === 0) {
    return {
      range,
      summary: {
        visitors: 0,
        pageViews: 0,
        activeVisitors: 0,
        bounceRate: 0,
        lastEventAt: null,
      },
      trend: [],
      breakdowns: {
        pages: [],
        referrers: [],
        countries: [],
        devices: [],
        operatingSystems: [],
        browsers: [],
        hostnames: [],
        utmSources: [],
      },
    };
  }

  const visitorIds = new Set<string>();
  const visitCounts = new Map<string, number>();
  const pageVisitors: VisitorSetMap = new Map();
  const hostnameVisitors: VisitorSetMap = new Map();
  const referrerVisitors: VisitorSetMap = new Map();
  const countryVisitors: VisitorSetMap = new Map();
  const deviceVisitors: VisitorSetMap = new Map();
  const osVisitors: VisitorSetMap = new Map();
  const browserVisitors: VisitorSetMap = new Map();
  const utmVisitors: VisitorSetMap = new Map();

  const nowMs = Date.now();
  const activeWindowMs = nowMs - 5 * 60 * 1000;
  const activeVisitorIds = new Set<string>();

  const { bucketDurationMs, labelFormatter } = bucketConfiguration(hours);
  const rangeEndMs = nowMs;
  const bucketCount = Math.max(
    1,
    Math.ceil((hours * 60 * 60 * 1000) / bucketDurationMs)
  );
  const bucketStartMs = rangeEndMs - bucketCount * bucketDurationMs;

  const bucketVisitors = Array.from({ length: bucketCount }, () => new Set<string>());
  const bucketTimestamps: number[] = [];

  for (let index = 0; index < bucketCount; index++) {
    bucketTimestamps.push(bucketStartMs + index * bucketDurationMs);
  }

  let lastEventAt: string | null = null;

  for (const row of rows) {
    const visitorId = row.visit_id ?? row.session_id ?? row.event_id;
    const occurredAtMs = Date.parse(row.occurred_at);

    if (Number.isNaN(occurredAtMs)) {
      continue;
    }

    lastEventAt = row.occurred_at;
    visitorIds.add(visitorId);

    visitCounts.set(visitorId, (visitCounts.get(visitorId) ?? 0) + 1);

    if (occurredAtMs >= activeWindowMs) {
      activeVisitorIds.add(visitorId);
    }

    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.max(
        0,
        Math.floor((occurredAtMs - bucketStartMs) / bucketDurationMs)
      )
    );

    const bucketSet = bucketVisitors[bucketIndex];
    bucketSet.add(visitorId);

    const path = normalisePath(row.path, row.url);
    ensureVisitorSet(pageVisitors, path).add(visitorId);

    const hostname = normaliseHostname(row.url);
    ensureVisitorSet(hostnameVisitors, hostname).add(visitorId);

    const referrer = normaliseReferrer(row.referrer);
    ensureVisitorSet(referrerVisitors, referrer).add(visitorId);

    const country =
      row.country && row.country.trim().length > 0 ? row.country : "Unknown";
    ensureVisitorSet(countryVisitors, country).add(visitorId);

    const device = detectDevice(row.user_agent);
    ensureVisitorSet(deviceVisitors, device).add(visitorId);

    const os = detectOperatingSystem(row.user_agent);
    ensureVisitorSet(osVisitors, os).add(visitorId);

    const browser = detectBrowser(row.user_agent);
    ensureVisitorSet(browserVisitors, browser).add(visitorId);

    const utmLabel = parseUtmLabel(row.url);
    if (utmLabel) {
      ensureVisitorSet(utmVisitors, utmLabel).add(visitorId);
    }
  }

  const totalVisits = visitCounts.size;
  const bounces = Array.from(visitCounts.values()).filter(
    (count) => count === 1
  ).length;
  const bounceRate = totalVisits === 0 ? 0 : bounces / totalVisits;

  const trend: AnalyticsTrendPoint[] = bucketVisitors.map((set, index) => {
    const timestamp = new Date(bucketTimestamps[index]).toISOString();
    return {
      label: labelFormatter.format(new Date(bucketTimestamps[index])),
      value: set.size,
      timestamp,
    };
  });

  const totalVisitors = visitorIds.size;

  return {
    range,
    summary: {
      visitors: totalVisitors,
      pageViews: rows.length,
      activeVisitors: activeVisitorIds.size,
      bounceRate,
      lastEventAt,
    },
    trend,
    breakdowns: {
      pages: toBreakdown(pageVisitors, totalVisitors),
      referrers: toBreakdown(referrerVisitors, totalVisitors),
      countries: toBreakdown(countryVisitors, totalVisitors),
      devices: toBreakdown(deviceVisitors, totalVisitors),
      operatingSystems: toBreakdown(osVisitors, totalVisitors),
      browsers: toBreakdown(browserVisitors, totalVisitors),
      hostnames: toBreakdown(hostnameVisitors, totalVisitors),
      utmSources: toBreakdown(utmVisitors, totalVisitors),
    },
  };
}

export async function getAnalyticsSummaryFromDrain(
  hours = 24
): Promise<AnalyticsSummary> {
  const range =
    hours === RANGE_TO_HOURS["24h"]
      ? "24h"
      : hours === RANGE_TO_HOURS["7d"]
        ? "7d"
        : hours === RANGE_TO_HOURS["30d"]
          ? "30d"
          : "24h";

  const dashboard = await getAnalyticsDashboard(range);

  if (dashboard.error) {
    return {
      visitors: null,
      pageViews: null,
      lastEventAt: dashboard.summary.lastEventAt,
      error: dashboard.error,
    };
  }

  return {
    visitors: dashboard.summary.visitors,
    pageViews: dashboard.summary.pageViews,
    lastEventAt: dashboard.summary.lastEventAt,
  };
}
