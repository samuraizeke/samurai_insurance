import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const runtime = "nodejs";

type DrainEvent = {
  id?: string;
  timestamp?: number;
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
  if (!event.id || typeof event.id !== "string") {
    return null;
  }

  if (
    event.timestamp === undefined ||
    (typeof event.timestamp !== "number" && typeof event.timestamp !== "string")
  ) {
    return null;
  }

  const occurredAt =
    typeof event.timestamp === "number"
      ? new Date(event.timestamp)
      : new Date(event.timestamp);

  if (Number.isNaN(occurredAt.getTime())) {
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
    event_id: event.id,
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
  let payload: DrainPayload;
  try {
    payload = (await request.json()) as DrainPayload;
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
