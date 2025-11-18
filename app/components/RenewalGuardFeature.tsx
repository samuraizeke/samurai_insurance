"use client";

import { useRef, useEffect } from "react";

type RenewalGuardFeatureProps = {
  className?: string;
};

export function RenewalGuardFeature({
  className = "",
}: RenewalGuardFeatureProps) {
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
      className={`w-full bg-[#f7f6f3] px-12 pt-6 pb-16 sm:px-16 sm:pt-16 ${className}`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            onEnded={(event) => event.currentTarget.pause()}
            src="https://samuraiinsurancestorage.blob.core.windows.net/videos/Renewal%20Guard.mp4?sp=r&st=2025-11-18T20:53:37Z&se=2025-11-19T05:08:37Z&spr=https&sv=2024-11-04&sr=b&sig=t47tovqu1%2Bt7fCDBMXPRenrz6orNui%2FxDSLt5FQKdT4%3D"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}
