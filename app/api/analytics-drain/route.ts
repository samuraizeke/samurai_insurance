import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

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
  };
  referrer?: string;
  client?: {
    ua?: string;
    ip?: string;
    userAgent?: string;
  };
  userAgent?: string;
  ip?: string;
  clientIp?: string;
  properties?: {
    url?: string;
    path?: string;
    pathname?: string;
    referrer?: string;
    [key: string]: unknown;
  };
};

const TABLE_NAME = "vercel_analytics_events";
const NESTED_EVENT_KEYS = ["events", "data", "payload", "body"] as const;

function isDrainEventArray(value: unknown): value is DrainEvent[] {
  return Array.isArray(value);
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

  return {
    event_id: eventId,
    occurred_at: occurredAt.toISOString(),
    session_id: sessionId,
    visit_id: visitId,
    url,
    path,
    country:
      event.location?.country ??
      event.geo?.country ??
      null,
    city:
      event.location?.city ??
      event.geo?.city ??
      null,
    region:
      event.location?.region ??
      event.geo?.region ??
      null,
    referrer:
      event.referrer ??
      (typeof event.properties?.referrer === "string"
        ? event.properties.referrer
        : null) ??
      null,
    user_agent:
      event.client?.ua ??
      event.client?.userAgent ??
      (typeof event.userAgent === "string" ? event.userAgent : null) ??
      null,
    client_ip:
      event.client?.ip ??
      (typeof event.ip === "string" ? event.ip : null) ??
      (typeof event.clientIp === "string" ? event.clientIp : null) ??
      null,
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
