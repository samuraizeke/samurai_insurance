"use client";

import { useRef, useEffect } from "react";
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
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`w-full bg-[#f7f6f3] px-4 py-8 sm:px-12 sm:py-12 md:px-16 md:py-16 ${className}`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl">
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
