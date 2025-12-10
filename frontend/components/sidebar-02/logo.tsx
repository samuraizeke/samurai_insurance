"use client";

import Image from "next/image";

interface LogoProps {
  collapsed?: boolean;
  isMobile?: boolean;
  className?: string;
}

export const Logo = ({ collapsed, isMobile, className }: LogoProps) => {
  // Mobile: keep existing behavior (sam-head-logo)
  if (isMobile) {
    return (
      <Image
        src="/sam-head-logo.png"
        alt="Samurai Insurance"
        width={40}
        height={40}
        className={className}
      />
    );
  }

  // Desktop collapsed: show sam-head-logo
  if (collapsed) {
    return (
      <Image
        src="/sam-head-logo.png"
        alt="Samurai Insurance"
        width={40}
        height={40}
        className={className}
      />
    );
  }

  // Desktop expanded: show wordmark-only-logo
  return (
    <Image
      src="/wordmark-only-logo.png"
      alt="Samurai Insurance"
      width={180}
      height={40}
      className={className}
    />
  );
};
