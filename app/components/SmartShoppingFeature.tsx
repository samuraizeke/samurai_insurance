import { workSans } from "@/lib/fonts";
import { SmartShoppingBag } from "@/app/components/SmartShoppingBag";

type SmartShoppingFeatureProps = {
  className?: string;
};

export function SmartShoppingFeature({
  className = "",
}: SmartShoppingFeatureProps) {
  return (
    <section
      className={`w-full px-6 py-16 sm:px-16 sm:py-24 md:py-[150px] ${className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 text-center md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] md:items-center md:gap-24">
        <div className="flex flex-col items-center gap-6 md:order-2 md:items-end md:gap-7 md:text-right">
          <h2 className="text-4xl font-bold leading-tight text-[#de5e48] sm:text-[48px] md:text-right">
            Smart Shopping
          </h2>
          <p
            className={`${workSans.className} text-lg text-[#f7f6f3]/85 sm:text-xl md:text-right`}
          >
            Insurance is a chore, so hand it to us and get back to living. We
            only shop when it truly helps you, which means movement when it&apos;s
            worth it and no churn just to churn.
          </p>
          <ul
            className={`${workSans.className} flex w-full max-w-[360px] flex-col gap-4 text-left text-base text-[#f7f6f3]/85 sm:text-lg md:self-end md:items-end md:text-right`}
          >
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span className="md:text-right">
                AI compares trusted carriers and only surfaces winners.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span className="md:text-right">
                We scan renewals and market shifts before they hit your inbox.
              </span>
            </li>
            <li className="flex items-start gap-3 md:items-center">
              <span className="mt-1.5 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-[#de5e48]" />
              <span className="md:text-right">
                Clear, single-click approvals keep you moving without the churn.
              </span>
            </li>
          </ul>
        </div>
        <div className="flex items-center justify-center mt-12 md:order-1 md:mt-0 md:justify-start">
          <SmartShoppingBag className="max-w-[360px] sm:max-w-[420px]" />
        </div>
      </div>
    </section>
  );
}
