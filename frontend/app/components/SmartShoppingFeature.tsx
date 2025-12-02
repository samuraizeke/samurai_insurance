"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { workSans } from "@/lib/fonts";

type SmartShoppingFeatureProps = {
  className?: string;
};

export function SmartShoppingFeature({
  className = "",
}: SmartShoppingFeatureProps) {
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
              src="/images/quote.png"
              alt="Smart Shopping quote interface"
              width={800}
              height={600}
              className="w-full h-auto rounded-xl"
              priority
            />
            <div className="mt-8 px-4">
              <h3 className="text-3xl sm:text-4xl font-bold text-[#de5e48] mb-6 text-center">
                Smart Shopping
              </h3>
              <p className={`${workSans.className} text-lg text-[#333333] leading-relaxed mb-6`}>
                Insurance is a chore, so hand it to us and get back to living. We only shop when it truly helps you.
              </p>
              <ul className={`${workSans.className} space-y-4 text-[#333333]`}>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    AI compares trusted carriers and only surfaces winners.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    We scan renewals and market shifts before they hit your inbox.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg">-</span>
                  <span className="text-lg leading-relaxed">
                    Clear, single-click approvals keep you moving without the churn.
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
            src="https://samuraiinsurancestorage.blob.core.windows.net/videos/Smart%20Shopping%20Site.mp4?sp=r&st=2025-11-19T14:39:23Z&se=2030-01-01T22:54:23Z&spr=https&sv=2024-11-04&sr=b&sig=a%2B364Ig1pmuF4IOiK0gM%2FLQAK%2B%2BX92TUEW7ouq37OtM%3D"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}
