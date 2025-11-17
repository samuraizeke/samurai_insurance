import { workSans } from "@/lib/fonts";
import { OnDemandSupportClock } from "@/app/components/OnDemandSupportClock";

type OnDemandSupportFeatureProps = {
  className?: string;
};

export function OnDemandSupportFeature({
  className = "",
}: OnDemandSupportFeatureProps) {
  return (
    <section
      className={`w-full bg-[#f7f6f3] px-6 py-16 sm:px-16 sm:py-24 md:py-[150px] ${className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-center md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center md:gap-24 md:text-left">
        <div className="order-2 mt-12 flex flex-col items-center gap-6 md:order-1 md:mt-0 md:items-start md:gap-7">
          <h2 className="text-4xl font-bold leading-tight text-[#de5e48] sm:text-[48px] md:text-left">
            On Demand Support
          </h2>
          <p
            className={`${workSans.className} text-lg text-[#333333]/85 sm:text-xl md:text-left`}
          >
            Ask for a change, we make it happen and confirm when it is done.
            Instant help from an agent that moves as fast as you do.
          </p>
          <ul
            className={`${workSans.className} flex w-full max-w-[360px] flex-col gap-4 text-left text-base text-[#333333]/85 sm:text-lg`}
          >
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                Claims help on-call—if something happens, we guide you step by
                step so you never feel alone.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                You stay in control with clear choices in plain language and
                updates in minutes, not days.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                Need a change? Ping us any time—confirmations and follow-through
                happen automatically.
              </span>
            </li>
          </ul>
        </div>
        <div className="order-1 flex items-center justify-center md:order-2 md:justify-end">
          <OnDemandSupportClock className="max-w-[360px] sm:max-w-[420px]" />
        </div>
      </div>
    </section>
  );
}
