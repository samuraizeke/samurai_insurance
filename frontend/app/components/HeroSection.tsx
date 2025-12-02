import { useRef } from "react";
import { workSans } from "@/frontend/lib/fonts";
import { useAutoplayVideo } from "@/app/hooks/useAutoplayVideo";

type HeroSectionProps = {
  onJoinWaitlist: () => void;
};

export function HeroSection({ onJoinWaitlist }: HeroSectionProps) {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useAutoplayVideo(heroVideoRef);

  return (
    <section className="w-full px-4 pt-6 pb-16 sm:px-16 sm:pt-16 sm:pb-44">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
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
            className="focus-outline-brand-sm mt-10 hidden rounded-full bg-[#de5e48] px-6 py-2 text-med font-bold text-[#f7f6f3] shadow-[0_3px_8px_rgba(222,94,72,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(222,94,72,0.24)] sm:inline-flex mx-auto lg:mx-0"
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
              src="https://samuraiinsurancestorage.blob.core.windows.net/videos/quote%20demo.mp4?sp=r&st=2025-11-19T13:55:37Z&se=2030-01-01T22:10:37Z&spr=https&sv=2024-11-04&sr=b&sig=a1iXY7qf1Y5pW5ARANeYcVlBf6tpM79dUC99RAvw%2Bf4%3D"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

