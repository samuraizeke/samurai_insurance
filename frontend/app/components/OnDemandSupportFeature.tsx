"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { workSans } from "@/frontend/lib/fonts";

type OnDemandSupportFeatureProps = {
  className?: string;
};

export function OnDemandSupportFeature({
  className = "",
}: OnDemandSupportFeatureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;

    if (!video || !section) {
      return;
    }

    if (hasPlayedRef.current) {
      return;
    }

    // Stop video 0.5 seconds before the end
    const handleTimeUpdate = () => {
      if (video.duration - video.currentTime <= 0.5) {
        video.pause();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    if (!("IntersectionObserver" in window)) {
      // Fallback: play immediately if IntersectionObserver is not supported
      video.play().catch(() => {
        // Autoplay may be blocked
      });
      hasPlayedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true;
          video.play().catch(() => {
            // Autoplay may be blocked
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`w-full bg-[#f7f6f3] px-4 py-8 sm:px-12 sm:py-12 md:px-16 md:py-16 ${className}`}
    >
      <div className="mx-auto max-w-7xl">
        {/* Mobile view - Image with text */}
        <div className="md:hidden">
          <div className="mx-auto max-w-md">
            <Image
              src="/images/claim.png"
              alt="On Demand Support claims interface"
              width={800}
              height={600}
              className="w-full h-auto rounded-xl"
              priority
            />
            <div className="mt-8 px-4">
              <h3 className="text-3xl sm:text-4xl font-bold text-[#de5e48] mb-6 text-center">
                On Demand Help
              </h3>
              <p className={`${workSans.className} text-lg text-[#333333] leading-relaxed mb-6`}>
                Ask for a change, we make it happen and confirm when it is done. Instant help from an agent that moves as fast as you do.
              </p>
              <ul className={`${workSans.className} space-y-4 text-[#333333]`}>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    Claims support on-call—if something happens, we guide you step by step so you never feel alone.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    You stay in control with clear choices in plain language and updates in minutes, not days.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    Need a change? Ping us any time—confirmations and follow-through happen automatically.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tablet and Desktop view - Video */}
        <div className="hidden md:block relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            onEnded={(event) => event.currentTarget.pause()}
            src="https://samuraiinsurancestorage.blob.core.windows.net/videos/On%20Demand%20Help.mp4?sp=r&st=2025-11-19T13:59:10Z&se=2030-01-01T22:14:10Z&spr=https&sv=2024-11-04&sr=b&sig=l%2BJbSAv7Z3UQXA9nxgPkl2mPWfTQmv1SxkDfRSXwe5E%3D"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}
