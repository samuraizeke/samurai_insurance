"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalyticsRange } from "@/lib/analytics";

const OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

type AnalyticsRangeSelectorProps = {
  value: AnalyticsRange;
};

export function AnalyticsRangeSelector({
  value,
}: AnalyticsRangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (nextValue: AnalyticsRange) => {
    if (nextValue === value) {
      return;
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue === "24h") {
        params.delete("range");
      } else {
        params.set("range", nextValue);
      }

      const query = params.toString();
      const nextUrl = query.length > 0 ? `${pathname}?${query}` : pathname;

      router.replace(nextUrl, { scroll: false });
    });
  };

  return (
    <div className="inline-flex rounded-full border border-[#f7f6f3]/10 bg-[#2a2a2a]/80 p-1 text-[0.65rem] font-medium uppercase tracking-[0.35em] text-[#f7f6f3]/70">
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isPending && !isActive}
            className={`rounded-full px-3 py-1 transition ${
              isActive
                ? "bg-[#de5e48] text-[#f7f6f3] shadow-[0_10px_22px_rgba(222,94,72,0.35)]"
                : "text-[#f7f6f3]/60 hover:text-[#f7f6f3]"
            } ${isPending && !isActive ? "opacity-70" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
