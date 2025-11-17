'use client';

import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { LineChart } from "@mui/x-charts/LineChart";
import type {
  AnalyticsBreakdownEntry,
  AnalyticsDashboard,
  AnalyticsRange,
  AnalyticsTrendPoint,
} from "@/lib/analytics";
import { alteHaasGrotesk } from "@/lib/fonts";
import { AnalyticsRangeSelector } from "./AnalyticsRangeSelector";
import { AnalyticsLiveUpdater } from "./AnalyticsLiveUpdater";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

type AdminAnalyticsPanelProps = {
  analyticsRange: AnalyticsRange;
  analyticsDashboard: AnalyticsDashboard;
  waitlistSummary: WaitlistSummary;
  onShowWaitlist?: () => void;
};

const RANGE_DESCRIPTION: Record<AnalyticsRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const VISITORS_CHART_COLOR = "#de5e48";

export function AdminAnalyticsPanel({
  analyticsRange,
  analyticsDashboard,
  waitlistSummary,
  onShowWaitlist,
}: AdminAnalyticsPanelProps) {
  return (
    <section className="space-y-10">
      <AnalyticsLiveUpdater
        range={analyticsRange}
        initialLastEventAt={analyticsDashboard.summary.lastEventAt}
      />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#333333]">
            Web analytics
          </h2>
          <p className="mt-2 text-sm text-[#333333]/65">
            {RANGE_DESCRIPTION[analyticsRange]}
            {analyticsDashboard.summary.lastEventAt
              ? ` • Updated ${new Date(
                  analyticsDashboard.summary.lastEventAt
                ).toLocaleString()}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`${alteHaasGrotesk.className} rounded-full border border-[#de5e48]/40 bg-[#de5e48]/10 px-3 py-1 text-xs font-medium text-[#de5e48]`}
          >
            {formatNumber(analyticsDashboard.summary.activeVisitors)} online
          </span>
          <AnalyticsRangeSelector value={analyticsRange} />
        </div>
      </div>

      {analyticsDashboard.error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          {analyticsDashboard.error}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Waitlist size"
          value={formatNumber(waitlistSummary.count)}
          error={waitlistSummary.error}
          onClick={onShowWaitlist}
        />
        <MetricCard
          label="Visitors"
          value={formatNumber(analyticsDashboard.summary.visitors)}
          caption={`Active now: ${formatNumber(
            analyticsDashboard.summary.activeVisitors
          )}`}
        />
        <MetricCard
          label="Page views"
          value={formatNumber(analyticsDashboard.summary.pageViews)}
        />
        <MetricCard
          label="Bounce rate"
          value={formatPercent(analyticsDashboard.summary.bounceRate)}
        />
      </div>

      <div className="rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#333333]/70">
              Visitors trend
            </h3>
            <p className="mt-1 text-sm text-[#333333]/65">
              Unique visitors across {RANGE_DESCRIPTION[analyticsRange].toLowerCase()}
            </p>
          </div>
          <span className="text-xs text-[#333333]/55">
            Peak:{" "}
            {formatNumber(
              Math.max(
                0,
                ...analyticsDashboard.trend.map((point) => point.value)
              )
            )}{" "}
            visitors
          </span>
        </div>
        <div className="mt-6">
          <VisitorsLineChart data={analyticsDashboard.trend} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <BreakdownCard
          title="Pages"
          items={analyticsDashboard.breakdowns.pages}
        />
        <BreakdownCard
          title="Referrers"
          items={analyticsDashboard.breakdowns.referrers}
        />
        <BreakdownCard
          title="Countries"
          items={analyticsDashboard.breakdowns.countries}
        />
        <BreakdownCard
          title="Devices"
          items={analyticsDashboard.breakdowns.devices}
        />
        <BreakdownCard
          title="Operating systems"
          items={analyticsDashboard.breakdowns.operatingSystems}
        />
        <BreakdownCard
          title="Browsers"
          items={analyticsDashboard.breakdowns.browsers}
        />
        {analyticsDashboard.breakdowns.hostnames.length > 0 && (
          <BreakdownCard
            title="Hostnames"
            items={analyticsDashboard.breakdowns.hostnames}
          />
        )}
        {analyticsDashboard.breakdowns.utmSources.length > 0 && (
          <BreakdownCard
            title="UTM tags"
            items={analyticsDashboard.breakdowns.utmSources}
          />
        )}
      </div>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  error?: string;
  onClick?: () => void;
};

function MetricCard({ label, value, caption, error, onClick }: MetricCardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 text-left shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
        onClick
          ? "transition hover:-translate-y-0.5 hover:border-[#de5e48]/60 hover:shadow-[0_22px_50px_rgba(222,94,72,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#de5e48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2a2a]"
          : ""
      }`}
    >
      <p className="text-sm font-semibold text-[#333333]/70">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-[#333333]">{value}</p>

      {error ? (
        <p className="mt-3 text-sm text-rose-300/80">{error}</p>
      ) : caption ? (
        <p className="mt-3 text-xs text-[#333333]/60">{caption}</p>
      ) : null}
    </Component>
  );
}

type BreakdownCardProps = {
  title: string;
  items: AnalyticsBreakdownEntry[];
};

function BreakdownCard({ title, items }: BreakdownCardProps) {
  return (
    <div className="rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#333333]/70">{title}</h3>
        <span className="text-xs text-[#333333]/55">Visitors</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-[#333333]/55">No data yet.</p>
      ) : (
        <ul className="mt-5 space-y-4 text-sm text-[#333333]/80">
          {items.map((item) => (
            <li
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate">{item.label}</span>
              <span className="flex shrink-0 flex-col text-right">
                <span className="text-sm font-semibold text-[#333333]">
                  {formatNumber(item.value)}
                </span>
                <span className="text-xs text-[#333333]/55">
                  {formatPercent(item.percent)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VisitorsLineChart({ data }: { data: AnalyticsTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-[#f7f6f3]/10 bg-[#1f1f1f]/80 text-sm text-[#333333]/55">
        Not enough traffic to chart yet.
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
        stroke: "rgba(247, 246, 243, 0.14)",
      },
      [`& .${axisClasses.line}`]: {
        stroke: "rgba(247, 246, 243, 0.12)",
      },
      [`& .${axisClasses.tickLabel}`]: {
        fill: "rgba(247, 246, 243, 0.86)",
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
      stroke: "rgba(247, 246, 243, 0.12)",
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
      stroke: VISITORS_CHART_COLOR,
      strokeWidth: 2.5,
      fill: "#101010",
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
          id: "visitors",
          dataKey: "value",
          color: VISITORS_CHART_COLOR,
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

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}
