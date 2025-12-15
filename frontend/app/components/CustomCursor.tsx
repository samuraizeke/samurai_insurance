'use client';

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CursorPosition = {
  x: number;
  y: number;
};

type CursorInlineStyle = CSSProperties & {
  "--cursor-scale"?: string;
};

const defaultPosition: CursorPosition = { x: 0, y: 0 };
const INTERACTIVE_SELECTOR =
  "a, button, [role='button'], [data-cursor='interactive'], input:not([type='hidden']), textarea, select, summary";
const NOISE_TEXTURE =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMjAgMTIwJz4KICA8ZmlsdGVyIGlkPSdub2lzZSc+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMS4yJyBudW1PY3RhdmVzPSczJyBzdGl0Y2hUaWxlcz0nc3RpdGNoJy8+CiAgPC9maWx0ZXI+CiAgPHJlY3Qgd2lkdGg9JzEyMCcgaGVpZ2h0PScxMjAnIGZpbHRlcj0ndXJsKCNub2lzZSknIG9wYWNpdHk9JzAuNDUnLz4KPC9zdmc+";

export function CustomCursor() {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isHidden, setIsHidden] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  const cursorRef = useRef<HTMLDivElement | null>(null);
  const targetPositionRef = useRef<CursorPosition>(defaultPosition);
  const isHiddenRef = useRef(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    if (mediaQuery.matches) {
      return;
    }

    setIsActive(true);
    const userAgent = navigator.userAgent;
    if (/^((?!chrome|android).)*safari/i.test(userAgent)) {
      setIsSafari(true);
    }

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
  }, [isMounted]);

  const applyCursorTransform = useCallback((position: CursorPosition) => {
    const element = cursorRef.current;
    if (!element) {
      return;
    }

    element.style.setProperty("--cursor-x", `${position.x}px`);
    element.style.setProperty("--cursor-y", `${position.y}px`);
  }, []);

  useEffect(() => {
    applyCursorTransform(targetPositionRef.current);
  }, [applyCursorTransform]);

  const updateInteractiveHoverState = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      setIsHoveringInteractive((previous) => {
        if (!previous) {
          return previous;
        }
        return false;
      });
      return;
    }

    const nextValue = Boolean(target.closest(INTERACTIVE_SELECTOR));
    setIsHoveringInteractive((previous) => {
      if (previous === nextValue) {
        return previous;
      }
      return nextValue;
    });
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const nextPosition = { x: event.clientX, y: event.clientY };
      targetPositionRef.current = nextPosition;
      updateInteractiveHoverState(event.target);

      if (isHiddenRef.current) {
        isHiddenRef.current = false;
        setIsHidden(false);
      }

      applyCursorTransform(nextPosition);
    };

    const handlePointerDown = (event: PointerEvent) => {
      setIsPressed(true);
      updateInteractiveHoverState(event.target);
    };
    const handlePointerUp = (event: PointerEvent) => {
      setIsPressed(false);
      updateInteractiveHoverState(event.target);
    };
    const handlePointerLeave = () => {
      if (!isHiddenRef.current) {
        isHiddenRef.current = true;
        setIsHidden(true);
      }
      setIsPressed(false);
      setIsHoveringInteractive(false);
    };

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
  }, [
    applyCursorTransform,
    isActive,
    updateInteractiveHoverState,
  ]);

  const cursorStyle = useMemo(() => {
    const baseScale = isHoveringInteractive ? 0.85 : 1;
    const pressedScale = isPressed ? 0.75 : 1;
    const scale = baseScale * pressedScale;
    const interactiveBackground = isHoveringInteractive
      ? `radial-gradient(circle at center, rgba(247, 246, 243, 0.92) 0%, rgba(247, 246, 243, 0.6) 40%, rgba(247, 246, 243, 0.25) 70%, rgba(247, 246, 243, 0) 100%), url(${NOISE_TEXTURE})`
      : "#f7f6f3";
    const filterValue = isHoveringInteractive
      ? isSafari
        ? "blur(3px) contrast(110%)"
        : "blur(5px) contrast(115%)"
      : "none";
    const boxShadowValue = isHoveringInteractive
      ? "0 0 25px rgba(247, 246, 243, 0.45)"
      : "0 0 0 rgba(0, 0, 0, 0)";
    const borderColor = isHoveringInteractive
      ? "rgba(15, 15, 15, 0.15)"
      : "rgba(15, 15, 15, 0.3)";
    const backgroundRepeat = isHoveringInteractive ? "no-repeat, repeat" : undefined;

    const style: CursorInlineStyle = {
      "--cursor-scale": scale.toFixed(3),
      background: interactiveBackground,
      backgroundBlendMode: isHoveringInteractive ? "screen" : undefined,
      backgroundSize: isHoveringInteractive ? "125% 125%, 60px 60px" : undefined,
      backgroundPosition: isHoveringInteractive ? "center" : undefined,
      backgroundRepeat,
      filter: filterValue,
      boxShadow: boxShadowValue,
      borderColor,
      transition:
        "opacity 150ms ease-out, filter 150ms ease-out, box-shadow 150ms ease-out, background-color 150ms ease-out, border-color 150ms ease-out",
      willChange: "transform, filter",
    };
    return style;
  }, [isHoveringInteractive, isPressed, isSafari]);

  if (!isMounted || !isActive) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className={[
        "custom-cursor pointer-events-none fixed left-0 top-0 z-9999 h-10 w-10 rounded-full",
        "border border-[#0f0f0f]/30 bg-[#f7f6f3] opacity-90 mix-blend-difference",
        isHidden ? "opacity-0" : "opacity-90",
        isHoveringInteractive ? "custom-cursor--interactive" : "",
      ].join(" ")}
      style={cursorStyle}
    />
  );
}

export default CustomCursor;
