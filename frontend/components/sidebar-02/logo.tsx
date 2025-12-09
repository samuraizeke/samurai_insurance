"use client";

import Image from "next/image";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <Image
      src="/sam-head-logo.png"
      alt="Samurai Insurance"
      width={40}
      height={40}
      className={className}
    />
  );
};
