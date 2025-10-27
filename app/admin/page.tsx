import Image from "next/image";
import {
  AnalyticsBreakdownEntry,
  AnalyticsRange,
  AnalyticsTrendPoint,
  getAnalyticsDashboard,
} from "@/lib/analytics";
import { alteHaasGrotesk } from "@/lib/fonts";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { AdminLoginForm } from "./_components/AdminLoginForm";
import { AnalyticsRangeSelector } from "./_components/AnalyticsRangeSelector";
import { AnalyticsLiveUpdater } from "./_components/AnalyticsLiveUpdater";
import { signOutAdmin } from "./actions";
import { resolveAdminContext } from "./adminContext";

export const dynamic = "force-dynamic";

type WaitlistSummary = {
  count: number | null;
  error?: string;
};

async function getWaitlistSummary(): Promise<WaitlistSummary> {
  try {
    const supabase = createSupabaseServerClient();
    const { count, error } = await supabase
      .from("waitlist")
      .select("id", { head: true, count: "exact" });

    if (error) {
      console.error("Failed to fetch waitlist count", error);
      return {
        count: null,
        error: "Unable to load waitlist count right now.",
      };
    }

    return {
      count: typeof count === "number" ? count : 0,
    };
  } catch (error) {
    console.error("Unexpected error fetching waitlist count", error);
    return {
      count: null,
      error: "Unable to load waitlist count right now.",
    };
  }
}

function formatNumber(value: number | null) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

const RANGE_DESCRIPTION: Record<AnalyticsRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const adminContext = await resolveAdminContext();

  if (!adminContext.authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black px-4">
        <AdminLoginForm initialMessage={adminContext.message} />
      </div>
    );
  }

  const resolvedSearchParams = await searchParams;
  const requestedRange =
    typeof resolvedSearchParams?.range === "string"
      ? resolvedSearchParams.range
      : undefined;
  const analyticsRange: AnalyticsRange =
    requestedRange === "7d" || requestedRange === "30d" ? requestedRange : "24h";

  const [waitlistSummary, analyticsDashboard] = await Promise.all([
    getWaitlistSummary(),
    getAnalyticsDashboard(analyticsRange),
  ]);

  return (
    <div
      className={`${alteHaasGrotesk.className} flex min-h-screen flex-col bg-[#333333] text-[#f7f6f3]`}
    >
      <header className="sticky top-0 z-40 w-full bg-[#333333]">
        <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
          <div className="flex items-center justify-center gap-4 sm:justify-start">
            <Image
            src="/SamuraiLogoOrange.png"
            alt="Samurai Insurance logo"
            width={64}
            height={32}
            priority
            />
            <span className="whitespace-nowrap text-lg font-bold uppercase text-[#f7f6f3] sm:text-2xl">
              Samurai Insurance
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <p className="text-sm text-[#f7f6f3]/70">
              Signed in as{" "}
              <span className="font-medium text-[#f7f6f3]">
                {adminContext.user.email ?? "Unknown user"}
              </span>
            </p>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="hidden sm:inline-flex focus-outline-brand-sm rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        <AnalyticsLiveUpdater
          range={analyticsRange}
          initialLastEventAt={analyticsDashboard.summary.lastEventAt}
        />
        <section className="space-y-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#f7f6f3]">
                Web analytics
              </h2>
              <p className="mt-2 text-sm text-[#f7f6f3]/65">
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
                <h3 className="text-sm font-semibold text-[#f7f6f3]/70">
                  Visitors trend
                </h3>
                <p className="mt-1 text-sm text-[#f7f6f3]/65">
                  Unique visitors across {RANGE_DESCRIPTION[analyticsRange].toLowerCase()}
                </p>
              </div>
              <span className="text-xs text-[#f7f6f3]/55">
                Peak: {formatNumber(
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
      </main>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  caption?: string;
  error?: string;
};

function MetricCard({ label, value, caption, error }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
      <p className="text-sm font-semibold text-[#f7f6f3]/70">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold text-[#f7f6f3]">{value}</p>

      {error ? (
        <p className="mt-3 text-sm text-rose-300/80">{error}</p>
      ) : caption ? (
        <p className="mt-3 text-xs text-[#f7f6f3]/60">{caption}</p>
      ) : null}
    </div>
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
        <h3 className="text-sm font-semibold text-[#f7f6f3]/70">
          {title}
        </h3>
        <span className="text-xs text-[#f7f6f3]/55">Visitors</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-[#f7f6f3]/55">No data yet.</p>
      ) : (
        <ul className="mt-5 space-y-4 text-sm text-[#f7f6f3]/80">
          {items.map((item) => (
            <li
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="truncate">{item.label}</span>
              <span className="flex shrink-0 flex-col text-right">
                <span className="text-sm font-semibold text-[#f7f6f3]">
                  {formatNumber(item.value)}
                </span>
                <span className="text-xs text-[#f7f6f3]/55">
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
      <div className="flex h-52 items-center justify-center rounded-xl border border-[#f7f6f3]/10 bg-[#1f1f1f]/80 text-sm text-[#f7f6f3]/55">
        Not enough traffic to chart yet.
      </div>
    );
  }

  const normalized = data.map((point, index) => {
    const x =
      data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    return { ...point, x };
  });

  const maxValue = Math.max(1, ...normalized.map((point) => point.value));
  const chartHeight = 45;
  const baselineY = chartHeight;
  const bottomY = 58;

  const positioned = normalized.map((point) => {
    const y =
      baselineY - (point.value / maxValue) * (chartHeight - 6);
    return { ...point, y };
  });

  const linePoints =
    positioned.length === 1
      ? `0,${positioned[0].y} 100,${positioned[0].y}`
      : positioned.map((point) => `${point.x},${point.y}`).join(" ");

  const areaPath = [
    `M0 ${bottomY}`,
    positioned
      .map((point) => `L${point.x} ${point.y}`)
      .join(" "),
    `L100 ${bottomY}`,
    "Z",
  ].join(" ");

  const ticks: { label: string; x: number }[] = [];
  if (normalized.length <= 4) {
    positioned.forEach((point) => {
      ticks.push({ label: point.label, x: point.x });
    });
  } else {
    const tickIndexes = [
      0,
      Math.floor(positioned.length / 2),
      positioned.length - 1,
    ];
    tickIndexes.forEach((index) => {
      const point = positioned[index];
      ticks.push({ label: point.label, x: point.x });
    });
  }

  return (
    <div>
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="h-52 w-full"
      >
        <defs>
          <linearGradient id="analytics-line" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(222,94,72,0.75)" />
            <stop offset="100%" stopColor="rgba(222,94,72,0)" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#analytics-line)"
          stroke="none"
          opacity={0.4}
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="rgb(222, 94, 72)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="0"
          y1={baselineY + 8}
          x2="100"
          y2={baselineY + 8}
          stroke="rgba(247,246,243,0.12)"
          strokeWidth={0.6}
        />
      </svg>

      <div className="mt-3 flex justify-between text-xs text-[#f7f6f3]/60">
        {ticks.map((tick) => (
          <span key={tick.x} className="truncate">
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
