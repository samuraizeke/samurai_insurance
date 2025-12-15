import { useRef } from "react";
import Link from "next/link";
import { workSans } from "@/lib/fonts";
import { useAutoplayVideo } from "@/app/hooks/useAutoplayVideo";

export function HeroSection() {
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
          <Link
            href="/signup"
            className="mt-10 hidden rounded-full bg-[#333333] px-6 py-2 text-base font-bold text-[#f7f6f3] font-(family-name:--font-work-sans) transition hover:bg-[#333333]/90 sm:inline-flex mx-auto lg:mx-0"
          >
            Join the Waitlist
          </Link>
        </div>
        <div className="w-full lg:flex-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
            <video
              ref={heroVideoRef}
              className="h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              preload="metadata"
              onEnded={(event) => event.currentTarget.pause()}
              src="https://atgykhhbgbchhbnurhtx.supabase.co/storage/v1/object/sign/Lander%20Content/quote%20demo.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kNjkwNjYyNy05MWFhLTRhMTgtODEyYy01YjJiODUyNzhmMTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMYW5kZXIgQ29udGVudC9xdW90ZSBkZW1vLm1wNCIsImlhdCI6MTc2NTQ2NTczNCwiZXhwIjo0OTE5MDY1NzM0fQ.oM1rX4_u6hIvvKxFHspRwLXU4flRa9Ql49Q9geROUYE"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}

