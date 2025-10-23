import Image from "next/image";

type SiteHeaderProps = {
  onSignUp: () => void;
};

export function SiteHeader({ onSignUp }: SiteHeaderProps) {
  return (
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
        <button
          className="hidden sm:inline-flex focus-outline-brand-sm rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)]"
          onClick={onSignUp}
          type="button"
        >
          Sign Up
        </button>
      </div>
    </header>
  );
}
