type MobileWaitlistButtonProps = {
  onClick: () => void;
};

export function MobileWaitlistButton({ onClick }: MobileWaitlistButtonProps) {
  return (
    <button
      className="focus-outline-brand-lg fixed bottom-16 left-1/2 z-40 flex w-[calc(100%-3rem)] max-w-xs -translate-x-1/2 items-center justify-center rounded-full bg-[#de5e48] px-6 py-3 text-base font-bold text-[#f7f6f3] shadow-[0_8px_20px_rgba(222,94,72,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(222,94,72,0.32)] sm:hidden"
      onClick={onClick}
      type="button"
    >
      Join the Waitlist
    </button>
  );
}

