"use client";

import { useCallback, useState } from "react";
import { alteHaasGrotesk, workSans } from "@/lib/fonts";

type Option = {
  id: string;
  title: string;
  summary: string;
};

const OPTIONS: Option[] = [
  {
    id: "captive-agent",
    title: "Captive agent",
    summary:
      "Think State Farm or Allstate. Your agent can only sell one company. There is no real shopping. If their price goes up, yours goes up.",
  },
  {
    id: "independent-broker",
    title: "Independent broker",
    summary:
      "They can shop around. In practice, they lean on a handful of carriers that pay them more. Commissions often scale with your premium, so higher rates can mean higher pay for them. You are one of hundreds of clients.",
  },
  {
    id: "diy-sites",
    title: "DIY quote sites",
    summary:
      "You have to know exactly what coverage you need. One wrong toggle and you are underinsured. Many sites sell your info, then the calls and emails never stop, and you just wasted 3 hours of your life.",
  },
  {
    id: "do-nothing",
    title: "Do nothing",
    summary:
      "Your policy auto-renews. The price drifts up. Deductibles creep higher. Exclusions appear. You pay more, and you get less.",
  },
];

type Benefit = {
  title: string;
  description: string;
};

const SAMURAI_BENEFITS: Benefit[] = [
  {
    title: "Claims guidance",
    description: "Step by step help from first notice to payout.",
  },
  {
    title: "Single source of truth",
    description: "Store every policy, warranty, and credit card perk in one place.",
  },
  {
    title: "Smarter coverage",
    description:
      "We use your stored info to tell you what to keep, what to drop, and what to add.",
  },
] as const;

export function StackedAgainstSection() {
  const totalSlides = OPTIONS.length;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentIndex((previous) =>
      previous === 0 ? totalSlides - 1 : previous - 1
    );
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((previous) =>
      previous === totalSlides - 1 ? 0 : previous + 1
    );
  }, [totalSlides]);

  const handleGoToSlide = useCallback(
    (index: number) => {
      setCurrentIndex((previous) => {
        if (index < 0 || index >= totalSlides) {
          return previous;
        }
        return index;
      });
    },
    [totalSlides]
  );

  return (
    <section
      className={`${alteHaasGrotesk.className} relative w-full overflow-hidden px-6 py-24 sm:px-20 lg:px-40 xl:px-56`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(222,94,72,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(92,175,193,0.12),_transparent_50%)]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-20">
        <div className="relative flex flex-col items-center gap-12 text-center text-[#f7f6f3] lg:flex-row lg:items-center lg:justify-between lg:text-left">
          <div className="mx-auto w-full max-w-none space-y-4 text-center sm:max-w-2xl lg:mx-0 lg:max-w-xl lg:translate-y-1 lg:text-left">
            <h2 className="mx-auto w-full max-w-full text-[32px] font-bold leading-[1.05] text-balance sm:text-[44px] md:text-[56px] lg:mx-0 lg:max-w-none lg:text-left">
              <span className="block">Buying Insurance Today is</span>
              <span className="block text-[#de5e48]">Stacked Against You.</span>
            </h2>
            <p
              className={`${workSans.className} w-full text-lg leading-relaxed text-[#f7f6f3]/75 sm:text-xl`}
            >
              You have four choices. None of them put you first.
            </p>
          </div>
          <div className="relative w-full max-w-xl lg:max-w-none lg:flex-1">
            <div className="relative flex w-full items-center gap-3 px-1 sm:gap-5 sm:px-3">
              <button
                type="button"
                onClick={handlePrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f7f6f3]/25 text-xl text-[#f7f6f3] transition hover:border-[#de5e48]/70 hover:text-[#de5e48] sm:h-12 sm:w-12 sm:text-2xl"
                aria-label="Show previous option"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[40px] border border-[#f7f6f3]/25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(140deg,_rgba(32,34,40,0.9),_rgba(16,17,22,0.92) 60%,_rgba(9,9,12,0.92))] px-4 py-6 shadow-[0_40px_80px_rgba(8,9,12,0.35)] sm:max-w-[600px] sm:px-6 sm:py-10">
                <ul
                  className="flex w-full transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                  aria-live="polite"
                >
                  {OPTIONS.map((option, index) => (
                    <li
                      key={option.id}
                      className="flex w-full min-w-full flex-col px-4 pt-4 pb-6 sm:flex-1 sm:justify-between sm:px-8 sm:pt-6 sm:pb-6"
                    >
                      <header className="flex flex-col gap-3 sm:gap-5">
                        <span className="text-[36px] font-bold leading-none text-[#de5e48] sm:text-[56px]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-2xl font-semibold text-[#f7f6f3] sm:text-[42px]">
                          {option.title}
                        </h3>
                      </header>
                      <p
                        className={`${workSans.className} mt-6 text-base leading-relaxed text-[#f7f6f3]/85 sm:text-lg`}
                      >
                        {option.summary}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f7f6f3]/25 text-xl text-[#f7f6f3] transition hover:border-[#de5e48]/70 hover:text-[#de5e48] sm:h-12 sm:w-12 sm:text-2xl"
                aria-label="Show next option"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3 sm:items-end">
              <span
                className={`${workSans.className} text-xs uppercase tracking-[0.4em] text-[#f7f6f3]/70`}
              >
                {String(currentIndex + 1).padStart(2, "0")} /{" "}
                {String(totalSlides).padStart(2, "0")}
              </span>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                {OPTIONS.map((option, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <button
                      key={`${option.id}-dot`}
                      type="button"
                      onClick={() => handleGoToSlide(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${isActive ? "w-10 bg-[#de5e48]" : "w-3 bg-[#f7f6f3]/30 hover:bg-[#f7f6f3]/50"}`}
                      aria-label={`Show option ${index + 1}: ${option.title}`}
                      aria-pressed={isActive}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[40px] border border-[#de5e48]/60 bg-[#111216]/90 p-10 shadow-[0_30px_90px_rgba(8,9,12,0.65)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(92,175,193,0.18),_transparent_55%),radial-gradient(circle_at_bottom_left,_rgba(222,94,72,0.16),_transparent_60%)]" />
          <div className="relative z-10 flex flex-col items-center gap-10 text-center">
            <div className="max-w-3xl space-y-6">
              <h3 className="whitespace-nowrap text-[32px] font-semibold leading-tight text-[#de5e48] sm:text-[44px] md:text-[50px] sm:whitespace-normal">
                The Samurai Code
              </h3>
              <p
                className={`${workSans.className} text-lg leading-relaxed text-[#f7f6f3]/90`}
              >
                Samurai Insurance works for you, not a carrier. We give you an
                always-ready AI agent that shops across carriers annually,
                explains the coverage in plain English, and proves every
                recommendation. You get the win—not a loyalty tax.
              </p>
            </div>
            <p
              className={`${workSans.className} text-lg leading-relaxed text-[#f7f6f3]/80`}
            >
              With Samurai you also get:
            </p>
            <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SAMURAI_BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex h-full flex-col gap-3 rounded-3xl border border-[#f7f6f3]/25 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%),linear-gradient(140deg,_rgba(32,34,40,0.9),_rgba(16,17,22,0.92) 60%,_rgba(9,9,12,0.92))] p-6 text-center shadow-[0_20px_60px_rgba(8,9,12,0.4)] sm:text-left"
                >
                  <h4 className="text-xl font-semibold text-[#f7f6f3] sm:text-[22px]">
                    {benefit.title}
                  </h4>
                  <p
                    className={`${workSans.className} text-base leading-relaxed text-[#f7f6f3]/80`}
                  >
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
