import { useRef } from "react";
import { workSans } from "@/lib/fonts";
import { useAutoplayVideo } from "@/app/hooks/useAutoplayVideo";

type HeroSectionProps = {
  onJoinWaitlist: () => void;
};

export function HeroSection({ onJoinWaitlist }: HeroSectionProps) {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useAutoplayVideo(heroVideoRef);

  return (
    <section className="w-full px-12 pt-6 pb-16 sm:px-16 sm:pt-16 sm:pb-44">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-center">
        <div className="max-w-2xl text-center lg:flex-1 lg:max-w-none lg:text-left">
          <h1 className="font-bold leading-tight text-[#333333] text-4xl sm:text-5xl md:text-6xl lg:text-[64px] lg:leading-[1.05]">
            Never Worry About Your Insurance Again.
          </h1>
          <p
            className={`${workSans.className} mt-6 text-lg leading-relaxed text-[#333333] sm:text-xl`}
          >
            We handle everything on your car and home insurance so you can relax and save money. AI that shops for better rates, guides you through claims, and makes updates when you need it.
          </p>
          <button
            className="focus-outline-brand-lg mt-10 hidden items-center justify-center rounded-full bg-[#de5e48] px-8 py-3 text-lg font-bold text-[#f7f6f3] shadow-[0_4px_12px_rgba(222,94,72,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(222,94,72,0.27)] sm:flex mx-auto lg:mx-0"
            onClick={onJoinWaitlist}
            type="button"
          >
            Join the Waitlist
          </button>
        </div>
        <div className="w-full lg:flex-[2]">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
            <video
              ref={heroVideoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              preload="metadata"
              onEnded={(event) => event.currentTarget.pause()}
              src="https://samuraiinsurancestorage.blob.core.windows.net/videos/out.mp4?sp=r&st=2025-10-17T20:30:19Z&se=2028-12-31T05:45:19Z&spr=https&sv=2024-11-04&sr=b&sig=PHRlMyRp0HKt09E62qHJ5fbNsrk2vQ0ZJeinMaIeE6o%3D"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

