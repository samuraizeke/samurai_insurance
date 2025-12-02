import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/frontend/lib/supabaseServerClient";

export const runtime = "nodejs";

type DrainEvent = {
  id?: string;
  eventId?: string;
  timestamp?: number;
  occurredAt?: string | number;
  occurred_at?: string | number;
  receivedAt?: string | number;
  sessionId?: string | number;
  visitId?: string | number;
  visitorId?: string | number;
  deviceId?: string | number;
  url?: string;
  origin?: string;
  path?: string;
  eventType?: string;
  eventName?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  geo?: {
    country?: string;
    city?: string;
    region?: string;
    countryCode?: string;
    country_code?: string;
    countryName?: string;
    country_name?: string;
    regionCode?: string;
    region_code?: string;
    regionName?: string;
    region_name?: string;
  };
  context?: {
    location?: Record<string, unknown>;
    geo?: Record<string, unknown>;
  };
  referrer?: string;
  client?: {
    ua?: string;
    ip?: string;
    userAgent?:
    | string
    | {
      ua?: string;
      raw?: string;
      value?: string;
      name?: string;
    };
    headers?: Record<string, unknown>;
  };
  userAgent?: string;
  user_agent?:
  | string
  | {
    ua?: string;
    raw?: string;
    value?: string;
    name?: string;
  };
  ip?: string;
  clientIp?: string;
  headers?: Record<string, unknown>;
  properties?: {
    url?: string;
    path?: string;
    pathname?: string;
    referrer?: string;
    headers?: Record<string, unknown>;
    geo?: Record<string, unknown>;
    location?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

const TABLE_NAME = "vercel_analytics_events";
const NESTED_EVENT_KEYS = ["events", "data", "payload", "body"] as const;

function isDrainEventArray(value: unknown): value is DrainEvent[] {
  return Array.isArray(value);
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractEvents(value: unknown): DrainEvent[] {
  if (isDrainEventArray(value)) {
    return value.filter(
      (event): event is DrainEvent =>
        !!event && typeof event === "object" && !Array.isArray(event)
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const key of NESTED_EVENT_KEYS) {
    const candidate = (value as Record<string, unknown>)[key];

    if (!candidate) {
      continue;
    }

    if (isDrainEventArray(candidate)) {
      return candidate.filter(
        (event): event is DrainEvent =>
          !!event && typeof event === "object" && !Array.isArray(event)
      );
    }

    if (typeof candidate === "object") {
      const nested = extractEvents(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = toTrimmedString(item);
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidateKeys = ["ua", "raw", "value", "name", "label"];

  for (const key of candidateKeys) {
    if (key in value) {
      const result = toTrimmedString(value[key]);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

function firstNonNullString(
  ...values: Array<unknown>
): string | null {
  for (const value of values) {
    const result = toTrimmedString(value);
    if (result) {
      return result;
    }
  }

  return null;
}

function extractHeaderValue(
  headers: unknown,
  headerName: string
): string | null {
  if (!isRecord(headers)) {
    return null;
  }

  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return toTrimmedString(value);
    }
  }

  return null;
}

function normaliseKeyName(key: string) {
  return key.toLowerCase().replace(/[^a-z]/g, "");
}

function findNestedString(
  value: unknown,
  keyMatchers: string[],
  depth = 0
): string | null {
  if (depth > 10) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findNestedString(item, keyMatchers, depth + 1);
      if (result) {
        return result;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const normalisedMatchers = keyMatchers.map(normaliseKeyName);

  for (const [key, candidate] of Object.entries(value)) {
    const normalisedKey = normaliseKeyName(key);

    if (normalisedMatchers.includes(normalisedKey)) {
      const result = toTrimmedString(candidate);
      if (result) {
        return result;
      }
    }

    const nestedResult = findNestedString(candidate, keyMatchers, depth + 1);
    if (nestedResult) {
      return nestedResult;
    }
  }

  return null;
}

function normaliseCountryValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    try {
      const formatter = new Intl.DisplayNames(["en"], { type: "region" });
      const formatted = formatter.of(trimmed.toUpperCase());
      if (formatted) {
        return formatted;
      }
    } catch {
      // Ignore formatter errors and fall through.
    }
  }

  if (trimmed.toLowerCase() === "unknown") {
    return "Unknown";
  }

  return trimmed;
}

function extractLocationField(
  event: DrainEvent,
  field: "country" | "city" | "region"
): string | null {
  const sources: Array<Record<string, unknown> | null> = [
    isRecord(event.location) ? event.location : null,
    isRecord(event.geo) ? event.geo : null,
    event.context && isRecord(event.context.location)
      ? event.context.location
      : null,
    event.context && isRecord(event.context.geo) ? event.context.geo : null,
    event.properties && isRecord(event.properties.location)
      ? (event.properties.location as Record<string, unknown>)
      : null,
    event.properties && isRecord(event.properties.geo)
      ? (event.properties.geo as Record<string, unknown>)
      : null,
  ];

  const keyVariants = new Set<string>([
    field,
    `${field}Name`,
    `${field}_name`,
  ]);

  if (field === "country") {
    ["countryCode", "country_code", "code"].forEach((variant) =>
      keyVariants.add(variant)
    );
  }

  if (field === "region") {
    ["regionCode", "region_code", "state", "stateCode", "state_code"].forEach(
      (variant) => keyVariants.add(variant)
    );
  }

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keyVariants) {
      if (!(key in source)) {
        continue;
      }

      const value = toTrimmedString(source[key]);

      if (value) {
        if (field === "country") {
          return normaliseCountryValue(value);
        }

        return value;
      }
    }

    // Some providers use nested objects like { country: { name: "..." } }
    if (field in source && isRecord(source[field])) {
      const nested = toTrimmedString(source[field]);
      if (nested) {
        if (field === "country") {
          return normaliseCountryValue(nested);
        }
        return nested;
      }
    }
  }

  return null;
}

function normaliseIdentifier(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function normaliseEvent(event: DrainEvent) {
  const primaryId =
    typeof event.id === "string"
      ? event.id
      : typeof event.eventId === "string"
        ? event.eventId
        : null;

  const timestampValue =
    event.timestamp ??
    event.occurredAt ??
    event.occurred_at ??
    event.receivedAt;

  let occurredAt: Date | null = null;

  if (typeof timestampValue === "number") {
    occurredAt =
      timestampValue > 9_999_999_999
        ? new Date(timestampValue)
        : new Date(timestampValue * 1000);
  } else if (typeof timestampValue === "string") {
    occurredAt = new Date(timestampValue);
  }

  if (!occurredAt || Number.isNaN(occurredAt.getTime())) {
    return null;
  }

  const sessionId = normaliseIdentifier(event.sessionId);
  const visitId =
    normaliseIdentifier(event.visitId) ??
    normaliseIdentifier(event.visitorId) ??
    normaliseIdentifier(event.deviceId);
  const origin =
    typeof event.origin === "string" && event.origin.trim().length > 0
      ? event.origin.trim()
      : null;
  const basePath = normaliseIdentifier(event.path);

  let url =
    (typeof event.url === "string" && event.url.trim().length > 0
      ? event.url
      : null) ??
    (typeof event.properties?.url === "string" &&
      event.properties.url.trim().length > 0
      ? event.properties.url
      : null);

  let path: string | null =
    basePath ??
    (typeof event.properties?.path === "string" &&
      event.properties.path.trim().length > 0
      ? event.properties.path
      : null) ??
    (typeof event.properties?.pathname === "string" &&
      event.properties.pathname.trim().length > 0
      ? event.properties.pathname
      : null);

  if (!url && origin && (path ?? "").length > 0) {
    try {
      const candidatePath = path!.startsWith("/") ? path! : `/${path!}`;
      url = new URL(candidatePath, origin).toString();
    } catch {
      // ignore malformed URL
    }
  }

  if (!url && origin) {
    url = origin;
  }

  if (typeof url === "string" && path === null) {
    try {
      const parsed = new URL(url);
      path = parsed.pathname;
    } catch {
      // ignore malformed URL
    }
  }

  let eventId = primaryId;

  if (!eventId) {
    const parts = [
      String(occurredAt.getTime()),
      sessionId ?? "",
      visitId ?? "",
      url ?? "",
      path ?? "",
      origin ?? "",
      typeof event.eventType === "string" ? event.eventType : "",
      typeof event.eventName === "string" ? event.eventName : "",
    ]
      .map((part) => (typeof part === "string" ? part.trim() : part))
      .filter((part) => typeof part === "string" && part.length > 0) as string[];

    if (parts.length > 0) {
      eventId = createHash("sha1").update(parts.join("|")).digest("hex");
    }
  }

  if (!eventId) {
    return null;
  }

  const country = extractLocationField(event, "country");
  const city = extractLocationField(event, "city");
  const region = extractLocationField(event, "region");

  const referrer = firstNonNullString(
    event.referrer,
    event.properties?.referrer,
    extractHeaderValue(event.headers, "referer"),
    extractHeaderValue(event.headers, "referrer"),
    event.properties
      ? extractHeaderValue(event.properties.headers, "referer")
      : null,
    event.properties
      ? extractHeaderValue(event.properties.headers, "referrer")
      : null
  );

  const userAgent = firstNonNullString(
    event.client?.ua,
    event.client?.userAgent,
    event.userAgent,
    (event as unknown as Record<string, unknown>)["user_agent"],
    event.client && isRecord(event.client)
      ? (event.client as Record<string, unknown>)["user_agent"]
      : null,
    event.client && isRecord(event.client.userAgent)
      ? (event.client.userAgent as Record<string, unknown>).ua
      : null,
    extractHeaderValue(event.client?.headers, "user-agent"),
    extractHeaderValue(event.headers, "user-agent"),
    event.properties
      ? extractHeaderValue(event.properties.headers, "user-agent")
      : null
  );

  const resolvedUserAgent =
    userAgent ??
    findNestedString(event.context, ["userAgent", "user_agent", "ua"]) ??
    findNestedString(event.properties, ["userAgent", "user_agent", "ua"]) ??
    findNestedString(event, ["userAgent", "user_agent", "ua"]);

  const clientIp = firstNonNullString(
    event.client?.ip,
    event.ip,
    event.clientIp,
    extractHeaderValue(event.client?.headers, "x-forwarded-for"),
    extractHeaderValue(event.headers, "x-forwarded-for"),
    event.properties
      ? extractHeaderValue(event.properties.headers, "x-forwarded-for")
      : null
  );

  return {
    event_id: eventId,
    occurred_at: occurredAt.toISOString(),
    session_id: sessionId,
    visit_id: visitId,
    url,
    path,
    country,
    city,
    region,
    referrer,
    user_agent: resolvedUserAgent,
    client_ip: clientIp,
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.VERCEL_ANALYTICS_DRAIN_SECRET;

  if (!secret) {
    console.error("Missing VERCEL_ANALYTICS_DRAIN_SECRET");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("x-vercel-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature header" },
      { status: 401 }
    );
  }

  let rawBodyText: string;
  try {
    rawBodyText = await request.text();
  } catch (error) {
    console.error("Failed to read request body", error);
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const rawBodyBuffer = Buffer.from(rawBodyText, "utf8");
  const hmac = createHmac("sha1", secret).update(rawBodyBuffer);
  const expectedHex = hmac.digest("hex");
  const expectedBase64 = Buffer.from(expectedHex, "hex").toString("base64");
  const provided = signature.trim();

  const candidates = [
    expectedHex,
    `sha1=${expectedHex}`,
    expectedBase64,
    `sha1=${expectedBase64}`,
  ];

  const providedBuffer = Buffer.from(provided, "utf8");

  const isValidSignature = candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "utf8");

    return (
      candidateBuffer.length === providedBuffer.length &&
      timingSafeEqual(candidateBuffer, providedBuffer)
    );
  });

  if (!isValidSignature) {
    return NextResponse.json(
      {
        error: "Invalid signature",
        code: "invalid_signature",
      },
      { status: 403 }
    );
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawBodyText);
  } catch (error) {
    console.error("Failed to parse analytics drain payload", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const events = extractEvents(parsedPayload)
    .map(normaliseEvent)
    .filter(isDefined);

  if (events.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(events, { onConflict: "event_id" });

    if (error) {
      console.error("Failed to upsert analytics events", error);
      return NextResponse.json(
        {
          error: "Failed to store events",
          details: error.message ?? error.code ?? null,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error storing analytics events", error);
    return NextResponse.json(
      {
        error: "Failed to store events",
        details:
          error &&
            typeof error === "object" &&
            "message" in error &&
            typeof (error as { message?: unknown }).message === "string"
            ? (error as { message: string }).message
            : null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ processed: events.length });
}
