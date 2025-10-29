"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { axisClasses } from "@mui/x-charts/ChartsAxis";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

const SAMURAI_COLOR = "#de5e48";
const BASELINE_COLOR = "#5cafc1";
const MOBILE_MEDIA_QUERY = "(max-width: 640px)";
const MOBILE_X_AXIS_TICKS = new Set(["2025", "2029", "2033"]);

const YEARLY_COSTS = [
  {
    year: "2025",
    label: "Launch policy",
    baseline: 2638,
    samurai: 2238,
  },
  {
    year: "2026",
    label: "Renewal 1",
    baseline: 2954,
    samurai: 2554,
  },
  {
    year: "2027",
    label: "Renewal 2",
    baseline: 3308,
    samurai: 2908,
  },
  {
    year: "2028",
    label: "Renewal 3",
    baseline: 3705,
    samurai: 3305,
  },
  {
    year: "2029",
    label: "Renewal 4",
    baseline: 4150,
    samurai: 3750,
  },
  {
    year: "2030",
    label: "Renewal 5",
    baseline: 4648,
    samurai: 4248,
  },
  {
    year: "2031",
    label: "Renewal 6",
    baseline: 5206,
    samurai: 4806,
  },
  {
    year: "2032",
    label: "Renewal 7",
    baseline: 5831,
    samurai: 5431,
  },
  {
    year: "2033",
    label: "Renewal 8",
    baseline: 6531,
    samurai: 6131,
  },
] as const;

const SOURCES = [
  {
    label: "Bankrate – 2025 Avg: $2,638, +12%",
    href: "https://www.bankrate.com/insurance/car/average-cost-of-car-insurance/",
  },
  {
    label: 'The Zebra – "$400+ savings by switching"',
    href: "https://www.thezebra.com/",
  },
  {
    label: "Insurify – Median savings: $461",
    href: "https://insurify.com/",
  },
] as const;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const toSentenceCase = (value: string) => {
  if (!value) return value;
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const getChartStyles = (isMobile: boolean) => ({
  [`& .${axisClasses.root}`]: {
    [`& .${axisClasses.line}`]: {
      stroke: "rgba(247, 246, 243, 0.18)",
    },
    [`& .${axisClasses.tick}`]: {
      stroke: "rgba(247, 246, 243, 0.22)",
    },
    [`& .${axisClasses.tickLabel}`]: {
      fill: "rgba(247, 246, 243, 0.98)",
      fontSize: isMobile ? 12 : 14,
      fontFamily: "var(--font-work-sans)",
      whiteSpace: "nowrap",
      overflow: "visible",
      textOverflow: "unset",
      paintOrder: "stroke",
      stroke: "rgba(10, 11, 14, 0.85)",
      strokeWidth: isMobile ? 1 : 1.5,
      strokeLinejoin: "round",
    },
  },
  [`& .${axisClasses.left} .${axisClasses.tickLabel}`]: {
    textAnchor: "end",
    transform: `translateX(${isMobile ? "-1px" : "-10px"})`,
    whiteSpace: "nowrap",
  },
  [`& .${axisClasses.bottom} .${axisClasses.tickLabel}`]: {
    whiteSpace: "pre-line",
    textAlign: "center",
    fontSize: isMobile ? 10.5 : 13,
    lineHeight: isMobile ? 1.25 : 1.35,
  },
  "& .MuiChartsGrid-line": {
    stroke: "rgba(247, 246, 243, 0.12)",
    strokeDasharray: "4 6",
  },
  "& .MuiLineElement-root.MuiLineElement-series-baseline": {
    strokeWidth: isMobile ? 4 : 5,
    strokeDasharray: "1",
    stroke: BASELINE_COLOR,
    filter: "drop-shadow(0px 0px 16px rgba(92, 175, 193, 0.28))",
  },
  "& .MuiLineElement-root.MuiLineElement-series-savings": {
    strokeWidth: isMobile ? 3.25 : 4,
    stroke: SAMURAI_COLOR,
    filter: "drop-shadow(0px 0px 18px rgba(222, 94, 72, 0.35))",
  },
  "& .MuiMarkElement-root": {
    fill: "#0f0f10",
    strokeWidth: isMobile ? 2.4 : 3,
  },
  "& .MuiMarkElement-root.MuiMarkElement-series-baseline": {
    stroke: BASELINE_COLOR,
  },
});

export function SavingsChartSection() {
  const cumulativeSavings = YEARLY_COSTS.reduce<number[]>(
    (accumulated, year) => {
      const previous = accumulated[accumulated.length - 1] ?? 0;
      const savingsThisYear = year.baseline - year.samurai;
      accumulated.push(previous + savingsThisYear);
      return accumulated;
    },
    []
  );

  const dataset = YEARLY_COSTS.map((year, index) => ({
    id: year.year,
    year: year.year,
    label: year.label,
    savings: cumulativeSavings[index] ?? 0,
    baseline: 0,
  }));

  const finalYearSavings =
    cumulativeSavings[cumulativeSavings.length - 1] ?? 0;
  const maxSavings = Math.max(...cumulativeSavings, 0);
  const yMax = Math.ceil((maxSavings + 200) / 100) * 100;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rawGradientId = useId();
  const savingsGradientId = useMemo(
    () => rawGradientId.replace(/:/g, "-"),
    [rawGradientId]
  );
  const [shouldAnimateChart, setShouldAnimateChart] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const animationTimeoutRef = useRef<number | null>(null);
  const chartSx = useMemo(
    () => ({
      ...getChartStyles(isMobile),
      "& .savings-area": {
        fill: `url(#${savingsGradientId})`,
      },
      "& .MuiMarkElement-root.MuiMarkElement-series-savings": {
        stroke: SAMURAI_COLOR,
        strokeWidth: isMobile ? 3 : 3.5,
      },
    }),
    [savingsGradientId, isMobile]
  );
  const lineChartSlotProps = useMemo<
    ComponentProps<typeof LineChart>["slotProps"]
  >(() => {
    const animationProps = prefersReducedMotion ? {} : { pathLength: 1 };

    return {
      line: ({ id }) => ({
        ...animationProps,
        className:
          id === "savings"
            ? "savings-line"
            : id === "baseline"
            ? "baseline-line"
            : undefined,
      }),
      area: ({ id }) => ({
        ...animationProps,
        className: id === "savings" ? "savings-area" : undefined,
      }),
    };
  }, [prefersReducedMotion]);

  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  const chartDimensions = useMemo(
    () =>
      isMobile
        ? {
            height: 320,
            margin: { top: 12, bottom: 18, left: 10, right: 22 },
            yAxisWidth: 52,
          }
        : {
            height: 440,
            margin: { top: 16, bottom: 88, left: 88, right: 48 },
            yAxisWidth: 80,
          },
    [isMobile]
  );
  const { height: chartHeight, margin: chartMargin, yAxisWidth } = chartDimensions;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldAnimateChart(false);
      hasAnimatedRef.current = false;
      clearAnimationTimeout();
      return;
    }

    if (hasAnimatedRef.current) {
      return;
    }

    const target = sectionRef.current;
    if (!target || !("IntersectionObserver" in window)) {
      clearAnimationTimeout();
      animationTimeoutRef.current = window.setTimeout(() => {
        setShouldAnimateChart(true);
        animationTimeoutRef.current = null;
      }, 500);
      hasAnimatedRef.current = true;
      return () => {
        clearAnimationTimeout();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          hasAnimatedRef.current = true;
          clearAnimationTimeout();
          animationTimeoutRef.current = window.setTimeout(() => {
            setShouldAnimateChart(true);
            animationTimeoutRef.current = null;
          }, 500);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      clearAnimationTimeout();
    };
  }, [prefersReducedMotion, clearAnimationTimeout]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const chartClassName = prefersReducedMotion
    ? "savings-chart savings-chart--static"
    : shouldAnimateChart
    ? "savings-chart savings-chart--animated"
    : "savings-chart";
  const xAxisValueFormatter = useMemo(
    () => (value: string | number) => {
      const valueAsString = String(value);
      const entry = YEARLY_COSTS.find((year) => year.year === valueAsString);

      if (!entry) return valueAsString;

      if (isMobile) {
        return MOBILE_X_AXIS_TICKS.has(entry.year) ? entry.year : "";
      }

      return `${entry.year}\n${toSentenceCase(entry.label)}`;
    },
    [isMobile]
  );

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex flex-col overflow-hidden bg-gradient-to-b from-[#0f0f10] via-[#141517] to-[#0f0f10] pt-24 pb-0 sm:pt-32 sm:pb-0"
    >
      <div
        className="pointer-events-none absolute left-[-20%] top-[-30%] h-[75%] w-[65%] rounded-[999px] bg-[#de5e48]/25 blur-[140px]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-1 flex-col px-4 pb-28 sm:px-8 sm:pb-24 lg:px-14 lg:pb-20">
        <div className="flex flex-1 flex-col justify-center gap-16 lg:flex-row lg:items-center lg:justify-between lg:gap-20">
          <div className="lg:order-2 flex max-w-xl flex-col items-center space-y-8 text-center text-[#f7f6f3] lg:items-end lg:text-right">
            <h2 className="text-4xl font-bold leading-snug sm:text-5xl">
              Stop the 12% price creep before it hits.
            </h2>
            <p
              className={`${workSans.className} w-full text-lg leading-relaxed text-[#f7f6f3]/80`}
            >
              We blended national premium data with typical marketplace savings to
              model yearly re-shopping from 2025 to 2033—this chart shows how
              Samurai keeps stacking dollars year after year.
            </p>
          </div>

          <div className="lg:order-1 flex flex-1 flex-col gap-6">
            <div
              className={`rounded-3xl border border-white/10 bg-[#111214]/80 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)] backdrop-blur-sm ${workSans.variable} ${alteHaasGrotesk.variable}`}
            >
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left">
                <div
                  className={`${workSans.className} flex flex-col items-start gap-3 text-left text-sm text-[#f7f6f3]/80 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start sm:gap-6 sm:text-base`}
                >
                  <span className="flex w-full items-center gap-2 whitespace-nowrap sm:w-auto">
                    <span
                      className="h-2 w-8 rounded-full"
                      style={{ backgroundColor: SAMURAI_COLOR }}
                    />
                    {toSentenceCase("samurai cumulative savings")}
                  </span>
                  <span className="flex w-full items-center gap-2 whitespace-nowrap sm:w-auto">
                    <span
                      className="h-2 w-8 rounded-full"
                      style={{ backgroundColor: BASELINE_COLOR }}
                    />
                    {toSentenceCase("national average")}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#1d1e21]/90 px-5 py-4 text-center shadow-lg backdrop-blur sm:text-right">
                  <p
                    className={`${workSans.className} text-sm text-[#f7f6f3]/60`}
                  >
                    {toSentenceCase("total savings by 2033")}
                  </p>
                  <p
                    className={`${workSans.className} mt-1 text-3xl font-bold text-[#22c55e]`}
                  >
                    {formatCurrency(finalYearSavings)}
                  </p>
                </div>
              </div>

              <div className="mt-6 -ml-3 sm:ml-0">
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute h-0 w-0"
                  focusable="false"
                >
                  <defs>
                    <linearGradient
                      id={savingsGradientId}
                      x1="0%"
                      x2="0%"
                      y1="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="rgba(34, 197, 94, 0.55)" />
                      <stop offset="55%" stopColor="rgba(34, 197, 94, 0.28)" />
                      <stop offset="100%" stopColor="rgba(34, 197, 94, 0.1)" />
                    </linearGradient>
                  </defs>
                </svg>

                <LineChart
                  dataset={dataset}
                  height={chartHeight}
                  margin={chartMargin}
                  xAxis={[
                    {
                      dataKey: "year",
                      scaleType: "point",
                      valueFormatter: xAxisValueFormatter,
                    },
                  ]}
                  yAxis={[
                    {
                      min: 0,
                      max: yMax,
                      valueFormatter: (value: number) => formatCurrency(value),
                      tickNumber: 5,
                      width: yAxisWidth,
                    },
                  ]}
                  series={[
                    {
                      id: "savings",
                      dataKey: "savings",
                      label: "Samurai savings",
                      curve: "monotoneX",
                      area: true,
                      showMark: true,
                      color: SAMURAI_COLOR,
                      valueFormatter: (value) =>
                        value == null ? "—" : formatCurrency(value),
                    },
                    {
                      id: "baseline",
                      dataKey: "baseline",
                      label: "National average",
                      curve: "linear",
                      showMark: true,
                      color: BASELINE_COLOR,
                      valueFormatter: (value) =>
                        value == null ? "—" : formatCurrency(value),
                    },
                  ]}
                  grid={{ vertical: false, horizontal: true }}
                  axisHighlight={{ x: "line", y: "none" }}
                  skipAnimation={prefersReducedMotion}
                  hideLegend
                  slotProps={lineChartSlotProps}
                  className={chartClassName}
                  sx={chartSx}
                />
                {!prefersReducedMotion && (
                  <style jsx global>{`
                    @keyframes savingsLineDraw {
                      from {
                        stroke-dashoffset: 1;
                      }
                      to {
                        stroke-dashoffset: 0;
                      }
                    }

                    @keyframes savingsAreaFade {
                      0% {
                        opacity: 0;
                      }
                      45% {
                        opacity: 0;
                      }
                      100% {
                        opacity: 0.82;
                      }
                    }

                    @keyframes markReveal {
                      0% {
                        opacity: 0;
                        transform: translateY(6px);
                      }
                      100% {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }

                    .savings-chart {
                      overflow: visible;
                    }

                    .savings-chart:not(.savings-chart--animated):not(
                        .savings-chart--static
                      )
                      .baseline-line,
                    .savings-chart:not(.savings-chart--animated):not(
                        .savings-chart--static
                      )
                      .savings-line,
                    .savings-chart:not(.savings-chart--animated):not(
                        .savings-chart--static
                      )
                      .savings-area,
                    .savings-chart:not(.savings-chart--animated):not(
                        .savings-chart--static
                      )
                      .MuiMarkElement-root {
                      opacity: 0;
                    }

                    .savings-chart--animated .baseline-line {
                      stroke-dasharray: 1;
                      stroke-dashoffset: 1;
                      animation: savingsLineDraw 3400ms
                        cubic-bezier(0.65, 0, 0.35, 1) forwards;
                      animation-delay: 260ms;
                    }

                    .savings-chart--animated .savings-line {
                      stroke-dasharray: 1;
                      stroke-dashoffset: 1;
                      animation: savingsLineDraw 3600ms cubic-bezier(0.65, 0, 0.35, 1)
                        forwards;
                      animation-delay: 380ms;
                    }

                    .savings-chart--animated .savings-area {
                      opacity: 0;
                      animation: savingsAreaFade 4200ms ease-in-out forwards;
                      animation-delay: 520ms;
                    }

                    .savings-chart--animated
                      .MuiMarkElement-root.MuiMarkElement-series-baseline,
                    .savings-chart--animated
                      .MuiMarkElement-root.MuiMarkElement-series-savings {
                      opacity: 0;
                      animation: markReveal 2200ms ease-in-out forwards;
                      animation-delay: 720ms;
                    }
                  `}</style>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p
        className={`${workSans.className} absolute inset-x-2 bottom-6 z-20 whitespace-normal text-left text-[11px] leading-relaxed text-[#f7f6f3]/60 sm:inset-x-6 sm:bottom-8 sm:z-20 sm:whitespace-nowrap sm:overflow-x-auto sm:text-xs lg:inset-x-12 lg:bottom-10`}
      >
        Sources:{" "}
        {SOURCES.map((source, index) => (
          <span key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors duration-200 hover:text-[#f7f6f3]"
            >
              {source.label}
            </a>
            {index < SOURCES.length - 1 ? ", " : " "}
          </span>
        ))}
        ***Disclaimer: Actual savings will vary; data shown is based on national averages.
      </p>
    </section>
  );
}
