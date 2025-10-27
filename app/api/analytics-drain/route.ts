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
  sessionId?: string;
  visitId?: string;
  url?: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
  };
  referrer?: string;
  client?: {
    ua?: string;
    ip?: string;
  };
};

type DrainPayload = {
  events?: DrainEvent[];
};

const TABLE_NAME = "vercel_analytics_events";

function normaliseEvent(event: DrainEvent) {
  const primaryId =
    typeof event.id === "string"
      ? event.id
      : typeof event.eventId === "string"
        ? event.eventId
        : null;

  const timestampValue =
    event.timestamp ?? event.occurredAt ?? event.occurred_at;

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

  let eventId = primaryId;

  if (!eventId) {
    const parts = [
      String(occurredAt.getTime()),
      typeof event.sessionId === "string" ? event.sessionId : "",
      typeof event.visitId === "string" ? event.visitId : "",
      typeof event.url === "string" ? event.url : "",
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


  const url = event.url ?? null;
  let path: string | null = null;

  if (typeof url === "string") {
    try {
      const parsed = new URL(url);
      path = parsed.pathname;
    } catch {
      // ignore malformed URL
    }
  }

  return {
    event_id: eventId,
    occurred_at: occurredAt.toISOString(),
    session_id: event.sessionId ?? null,
    visit_id: event.visitId ?? null,
    url,
    path,
    country: event.location?.country ?? null,
    city: event.location?.city ?? null,
    region: event.location?.region ?? null,
    referrer: event.referrer ?? null,
    user_agent: event.client?.ua ?? null,
    client_ip: event.client?.ip ?? null,
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

  let payload: DrainPayload;
  try {
    payload = JSON.parse(rawBodyText) as DrainPayload;
  } catch (error) {
    console.error("Failed to parse analytics drain payload", error);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const events = Array.isArray(payload.events)
    ? payload.events.map(normaliseEvent).filter(Boolean)
    : [];

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
