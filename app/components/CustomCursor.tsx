'use client';

import { useEffect, useMemo, useState } from "react";

type CursorPosition = {
  x: number;
  y: number;
};

const defaultPosition: CursorPosition = { x: 0, y: 0 };

export function CustomCursor() {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState<CursorPosition>(defaultPosition);
  const [isPressed, setIsPressed] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    if (mediaQuery.matches) {
      return;
    }

    setIsActive(true);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsActive(false);
        document.body.classList.remove("custom-cursor-active");
      } else {
        setIsActive(true);
        document.body.classList.add("custom-cursor-active");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    document.body.classList.add("custom-cursor-active");

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      document.body.classList.remove("custom-cursor-active");
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
      if (isHidden) {
        setIsHidden(false);
      }
    };

    const handlePointerDown = () => setIsPressed(true);
    const handlePointerUp = () => setIsPressed(false);
    const handlePointerLeave = () => setIsHidden(true);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [isActive, isHidden]);

  const cursorStyle = useMemo(() => {
    return {
      transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    };
  }, [position]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none fixed left-0 top-0 z-[9999] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full",
        "border border-[#0f0f0f]/30 bg-[#f7f6f3] opacity-90 mix-blend-difference transition-transform duration-150 ease-out",
        isPressed ? "scale-75" : "scale-100",
        isHidden ? "opacity-0" : "opacity-90",
      ].join(" ")}
      style={cursorStyle}
    />
  );
}

export default CustomCursor;
