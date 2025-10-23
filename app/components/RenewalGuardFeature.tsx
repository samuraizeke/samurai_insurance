import { workSans } from "@/lib/fonts";
import { RenewalGuardShield } from "@/app/components/RenewalGuardShield";

type RenewalGuardFeatureProps = {
  className?: string;
};

export function RenewalGuardFeature({
  className = "",
}: RenewalGuardFeatureProps) {
  return (
    <section
      className={`w-full px-6 pt-24 pb-16 sm:px-16 sm:py-24 md:py-[150px] ${className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-center md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)] md:items-center md:gap-24 md:text-left">
        <div className="order-2 mt-12 flex flex-col items-center gap-6 md:order-1 md:mt-0 md:items-start md:gap-7">
          <h2 className="text-4xl font-bold leading-tight text-[#de5e48] sm:text-[48px] md:text-left">
            Renewal Guard
          </h2>
          <p
            className={`${workSans.className} text-lg text-[#f7f6f3]/85 sm:text-xl md:text-left`}
          >
            No more renewal roulette or guesswork. We make sure the policy you
            approve is the policy you actually get.
          </p>
          <ul
            className={`${workSans.className} flex w-full max-w-[360px] flex-col gap-4 text-left text-base text-[#f7f6f3]/85 sm:text-lg`}
          >
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                No surprise gaps—your coverage carries over exactly how you
                expect.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                We compare every line from last year to this year before
                renewals go live.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span>
                Price hikes or skinny coverage get flagged early so you never
                eat a surprise increase.
              </span>
            </li>
          </ul>
        </div>
        <div className="order-1 flex items-center justify-center md:order-2 md:justify-end">
          <RenewalGuardShield className="max-w-[360px] sm:max-w-[420px]" />
        </div>
      </div>
    </section>
  );
}
