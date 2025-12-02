import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getLatestAnalyticsEvent,
  type AnalyticsRange,
} from "@/frontend/lib/analytics";
import { resolveAdminContext } from "@/app/admin/adminContext";

function normaliseRange(value: string | null): AnalyticsRange {
  if (value === "7d" || value === "30d") {
    return value;
  }

  return "24h";
}

export async function GET(request: NextRequest) {
  const adminContext = await resolveAdminContext();

  if (!adminContext.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = normaliseRange(
    request.nextUrl.searchParams.get("range")
  );
  const since = request.nextUrl.searchParams.get("since");

  const lastEventAt = await getLatestAnalyticsEvent(range);

  let hasNew = false;

  if (lastEventAt) {
    if (!since) {
      hasNew = true;
    } else {
      const lastEventTime = Date.parse(lastEventAt);
      const sinceTime = Date.parse(since);

      if (!Number.isNaN(lastEventTime) && !Number.isNaN(sinceTime)) {
        hasNew = lastEventTime > sinceTime;
      } else {
        hasNew = true;
      }
    }
  }

  return NextResponse.json({
    lastEventAt,
    hasNew,
  });
}
