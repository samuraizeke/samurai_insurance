"use client";

import { useEffect, useState } from "react";
import { useOnboarding } from "./useOnboarding";
import { getTourSteps } from "./tour-config";
import { resetOnboardingForReplay } from "@/lib/onboarding";
import "driver.js/dist/driver.css";

interface ProductTourProps {
  /** Delay before starting tour (ms) */
  startDelay?: number;
}

/**
 * ProductTour component
 * Renders nothing visible - just manages the driver.js tour lifecycle
 * Import this component on pages where you want the tour to run
 */
export function ProductTour({ startDelay = 800 }: ProductTourProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [tourSteps, setTourSteps] = useState(getTourSteps);

  // Handle client-side mounting and expose debug helpers
  useEffect(() => {
    setIsMounted(true);
    // Get appropriate steps based on viewport
    setTourSteps(getTourSteps());

    // Update steps on resize
    const handleResize = () => {
      setTourSteps(getTourSteps());
    };

    window.addEventListener("resize", handleResize);

    // Expose debug helpers on window for testing
    if (typeof window !== "undefined") {
      (window as unknown as { __resetOnboarding: () => void }).__resetOnboarding = () => {
        resetOnboardingForReplay();
        console.log("[Tour Debug] Onboarding reset - refresh the page to see the tour");
      };
      console.log("[Tour Debug] ProductTour mounted. Use window.__resetOnboarding() to reset tour state.");
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Initialize the tour hook
  const { triggerTour } = useOnboarding({
    startDelay,
    steps: tourSteps,
  });

  // Expose triggerTour for manual testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __triggerTour: () => void }).__triggerTour = triggerTour;
    }
  }, [triggerTour]);

  // This component renders nothing - tour is handled via driver.js overlay
  if (!isMounted) return null;

  return null;
}

/**
 * Export index file for cleaner imports
 */
export { useOnboarding } from "./useOnboarding";
export { useOnboardingContext } from "@/app/context/OnboardingContext";
export { tourSteps, mobileTourSteps, getTourSteps } from "./tour-config";
