import { alteHaasGrotesk } from "@/lib/fonts";

type SuccessToastProps = {
  visible: boolean;
  message: string;
};

export function SuccessToast({ visible, message }: SuccessToastProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`${alteHaasGrotesk.className} pointer-events-none fixed inset-0 z-50 flex items-center justify-center`}
    >
      <div className="scale-100 animate-[fade-in-up_0.35s_ease-out] rounded-[40px] bg-[#de5e48] px-10 py-6 text-center text-lg font-bold uppercase tracking-[0.16em] text-[#f7f6f3] shadow-[0_20px_60px_rgba(222,94,72,0.4)] sm:text-xl">
        {message}
      </div>
    </div>
  );
}

