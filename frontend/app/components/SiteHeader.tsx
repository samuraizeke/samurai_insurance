import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full bg-transparent backdrop-blur-sm">
      <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
        <Link href="/" className="flex items-center justify-center sm:justify-start">
          <Image
            src="/samurai-insurance-logo.png"
            alt="Samurai Insurance"
            width={300}
            height={80}
            priority
          />
        </Link>
        <Link
          href="/signup"
          className="hidden sm:inline-flex rounded-full bg-[#333333] px-6 py-2 text-base font-bold text-[#f7f6f3] font-(family-name:--font-work-sans) transition hover:bg-[#333333]/90"
        >
          Sign Up
        </Link>
      </div>
    </header>
  );
}
