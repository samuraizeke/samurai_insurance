import Link from "next/link";

export function MobileWaitlistButton() {
  return (
    <Link
      href="/signup"
      className="fixed bottom-16 left-1/2 z-40 flex w-[calc(100%-3rem)] max-w-xs -translate-x-1/2 items-center justify-center rounded-full bg-[#333333] px-6 py-3 text-base font-bold text-[#f7f6f3] font-(family-name:--font-work-sans) transition hover:bg-[#333333]/90 sm:hidden"
    >
      Join the Waitlist
    </Link>
  );
}

