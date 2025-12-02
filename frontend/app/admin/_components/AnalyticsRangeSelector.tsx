"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalyticsRange } from "@/frontend/lib/analytics";
import { alteHaasGrotesk } from "@/frontend/lib/fonts";

const OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
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
    <div
      className={`${alteHaasGrotesk.className} inline-flex rounded-full border border-[#333333]/20 bg-white p-1 text-[0.65rem] font-medium text-[#333333]/70`}
    >
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isPending && !isActive}
            className={`rounded-full px-3 py-1 transition ${isActive
                ? "bg-[#de5e48] text-[#f7f6f3] shadow-[0_10px_22px_rgba(222,94,72,0.35)]"
                : "text-[#333333]/60 hover:text-[#333333]"
              } ${isPending && !isActive ? "opacity-70" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
