"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { useSidebar } from "@/components/ui/sidebar";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export const Logo = ({ collapsed, className }: LogoProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleSidebar } = useSidebar();

  // Reset hover state when collapsed state changes
  useEffect(() => {
    setIsHovered(false);
  }, [collapsed]);

  if (collapsed) {
    return (
      <div
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={toggleSidebar}
      >
        <Image
          src="/sam-head-logo.png"
          alt="Samurai Insurance"
          width={40}
          height={40}
          className={`${className} transition-opacity duration-200 ${isHovered ? "opacity-0" : "opacity-100"}`}
        />
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}
        >
          <FontAwesomeIcon icon={faBars} className="size-5 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Image
      src="/wordmark-only-logo.png"
      alt="Samurai Insurance"
      width={160}
      height={48}
      className={className}
    />
  );
};
