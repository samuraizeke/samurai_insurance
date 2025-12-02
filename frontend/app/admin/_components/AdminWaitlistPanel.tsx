"use client";

import { useMemo, useState } from "react";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { LineChart } from "@mui/x-charts/LineChart";
import type { AnalyticsRange, AnalyticsTrendPoint } from "@/lib/analytics";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";
import { AnalyticsRangeSelector } from "./AnalyticsRangeSelector";

export type WaitlistEntrySummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  source: string | null;
  createdAt: string | null;
};

type AdminWaitlistPanelProps = {
  entries: WaitlistEntrySummary[];
  loadError?: string;
  trend: AnalyticsTrendPoint[];
  trendError?: string;
  analyticsRange: AnalyticsRange;
};

const joinedFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const RANGE_DESCRIPTION: Record<AnalyticsRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const WAITLIST_CHART_COLOR = "#de5e48";

export function AdminWaitlistPanel({
  entries,
  loadError,
  trend,
  trendError,
  analyticsRange,
}: AdminWaitlistPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const fullName = [entry.firstName, entry.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const email = entry.email?.toLowerCase() ?? "";
      const source = entry.source?.toLowerCase() ?? "";

      if (fullName.includes(normalizedQuery)) {
        return true;
      }

      if (email.includes(normalizedQuery)) {
        return true;
      }

      if (source.includes(normalizedQuery)) {
        return true;
      }

      return false;
    });
  }, [entries, normalizedQuery]);

  const displayEntries = useMemo(
    () =>
      filteredEntries.map((entry, index) => {
        const joined =
          entry.createdAt && !Number.isNaN(Date.parse(entry.createdAt))
            ? joinedFormatter.format(new Date(entry.createdAt))
            : "—";
        const fullName =
          [entry.firstName, entry.lastName].filter(Boolean).join(" ") ||
          entry.email ||
          "—";
        const source = entry.source || "—";
        const key = entry.id || entry.email || `waitlist-${index}`;

        return {
          key,
          fullName,
          email: entry.email,
          source,
          joined,
        };
      }),
    [filteredEntries]
  );

  const visibleCount = displayEntries.length;
  const totalCount = entries.length;

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#333333]">
            Waitlist analytics
          </h2>
          <p className="mt-2 text-sm text-[#333333]/65">
            {RANGE_DESCRIPTION[analyticsRange]}
          </p>
        </div>

        <AnalyticsRangeSelector value={analyticsRange} />
      </div>

      <div className="rounded-2xl border border-[#333333]/20 bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#333333]/70">
              Waitlist sign-up trend
            </h3>
            <p className="mt-1 text-sm text-[#333333]/65">
              New sign-ups across {RANGE_DESCRIPTION[analyticsRange].toLowerCase()}
            </p>
          </div>
          <span className="text-xs text-[#333333]/55">
            Peak:{" "}
            {formatNumber(
              Math.max(
                0,
                ...trend.map((point) => point.value)
              )
            )}{" "}
            sign-ups
          </span>
        </div>
        {trendError ? (
          <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
            {trendError}
          </p>
        ) : (
          <div className="mt-6">
            <WaitlistLineChart data={trend} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#333333]/20 bg-white p-6 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className={`${alteHaasGrotesk.className} text-lg font-semibold text-[#333333]`}
            >
              Waitlist
            </h2>
            <p className="mt-1 text-sm text-[#333333]/65">
              Review everyone who has signed up and where they came from.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end sm:text-right">
            <label htmlFor="waitlist-search" className="sr-only">
              Search waitlist
            </label>
            <input
              id="waitlist-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search waitlist..."
              className="waitlist-search-input min-w-[220px] rounded-full border border-[#333333]/20 bg-[#f7f6f3] px-4 py-2 text-sm text-[#333333] placeholder:text-[#333333]/35 focus:border-[#de5e48]/60 focus:outline-none focus:ring-2 focus:ring-[#de5e48]/40"
            />
            <span className="text-xs font-medium uppercase tracking-wide text-[#333333]/55">
              {visibleCount} of {totalCount}{" "}
              {totalCount === 1 ? "person" : "people"}
            </span>
          </div>
        </div>

        {loadError ? (
          <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        ) : displayEntries.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table
              className={`${workSans.className} w-full table-auto text-left text-sm text-[#333333]/85`}
            >
              <thead className="text-xs uppercase tracking-wide text-[#333333]/55">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {displayEntries.map((entry) => (
                  <tr
                    key={entry.key}
                    className="border-t border-[#333333]/10 last:border-b last:border-[#333333]/10"
                  >
                    <td className="px-3 py-3 text-[#333333]">{entry.fullName}</td>
                    <td className="px-3 py-3">
                      {entry.email ? (
                        <a
                          href={`mailto:${entry.email}`}
                          className="text-[#de5e48] underline-offset-2 hover:underline"
                        >
                          {entry.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-[#333333]/75">
                      {entry.source}
                    </td>
                    <td className="px-3 py-3 text-[#333333]/75">
                      {entry.joined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[#333333]/65">
            No one has joined the waitlist yet.
          </p>
        )}
      </div>
    </section>
  );
}

function WaitlistLineChart({ data }: { data: AnalyticsTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-[#333333]/20 bg-[#f7f6f3] text-sm text-[#333333]/55">
        Not enough sign-ups to chart yet.
      </div>
    );
  }

  const dataset = data.map((point) => ({
    label: point.label,
    value: point.value,
    timestamp: point.timestamp,
  }));

  const showMarks = dataset.length <= 24;

  const chartStyles = {
    [`& .${axisClasses.root}`]: {
      [`& .${axisClasses.tick}`]: {
        stroke: "rgba(51, 51, 51, 0.2)",
      },
      [`& .${axisClasses.line}`]: {
        stroke: "rgba(51, 51, 51, 0.2)",
      },
      [`& .${axisClasses.tickLabel}`]: {
        fill: "rgba(51, 51, 51, 0.7)",
        fontSize: 12,
        fontFamily: "var(--font-work-sans)",
      },
    },
    [`& .${axisClasses.bottom} .${axisClasses.tickLabel}`]: {
      transform: "translateY(6px)",
    },
    [`& .${axisClasses.left} .${axisClasses.tickLabel}`]: {
      transform: "translateX(-8px)",
    },
    "& .MuiChartsGrid-line": {
      stroke: "rgba(51, 51, 51, 0.1)",
      strokeDasharray: "4 6",
    },
    "& .MuiLineElement-root": {
      strokeWidth: 3,
      filter: "drop-shadow(0px 0px 14px rgba(222, 94, 72, 0.35))",
    },
    "& .MuiAreaElement-root": {
      fill: "rgba(222, 94, 72, 0.18)",
    },
    "& .MuiMarkElement-root": {
      stroke: WAITLIST_CHART_COLOR,
      strokeWidth: 2.5,
      fill: "#ffffff",
    },
  } as const;

  return (
    <LineChart
      height={220}
      dataset={dataset}
      xAxis={[
        {
          dataKey: "label",
          scaleType: "point",
          tickLabelStyle: { fontSize: 12 },
        },
      ]}
      yAxis={[
        {
          min: 0,
          tickLabelStyle: { fontSize: 12 },
        },
      ]}
      series={[
        {
          id: "signups",
          dataKey: "value",
          color: WAITLIST_CHART_COLOR,
          area: true,
          showMark: showMarks,
          curve: "monotoneX",
        },
      ]}
      margin={{ top: 20, right: 16, bottom: 40, left: 44 }}
      grid={{ vertical: false, horizontal: true }}
      axisHighlight={{ x: "line", y: "none" }}
      hideLegend
      skipAnimation
      slotProps={{
        tooltip: {
          trigger: "axis",
        },
      }}
      sx={chartStyles}
    />
  );
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
