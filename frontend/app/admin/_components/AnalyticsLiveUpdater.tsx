"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AnalyticsRange } from "@/frontend/lib/analytics";

type AnalyticsLiveUpdaterProps = {
  range: AnalyticsRange;
  initialLastEventAt: string | null;
  pollIntervalMs?: number;
};

export function AnalyticsLiveUpdater({
  range,
  initialLastEventAt,
  pollIntervalMs = 10_000,
}: AnalyticsLiveUpdaterProps) {
  const router = useRouter();
  const lastEventAtRef = useRef<string | null>(initialLastEventAt);
  const rangeRef = useRef<AnalyticsRange>(range);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  useEffect(() => {
    lastEventAtRef.current = initialLastEventAt;
  }, [initialLastEventAt]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const params = new URLSearchParams({ range: rangeRef.current });

        if (lastEventAtRef.current) {
          params.set("since", lastEventAtRef.current);
        }

        const response = await fetch(
          `/api/admin/analytics/latest?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          lastEventAt: string | null;
          hasNew: boolean;
        };

        if (cancelled) {
          return;
        }

        if (typeof payload.lastEventAt === "string") {
          lastEventAtRef.current = payload.lastEventAt;
        }

        if (payload.hasNew) {
          router.refresh();
        }
      } catch (error) {
        console.error("Failed to check for analytics updates", error);
      }
    };

    const interval = setInterval(poll, pollIntervalMs);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollIntervalMs, router]);

  return null;
}
