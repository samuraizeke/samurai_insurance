"use client";

import { useEffect, useRef, useCallback } from "react";
import { driver, type DriveStep, type Config } from "driver.js";
import { useOnboardingContext } from "@/app/context/OnboardingContext";
import { tourSteps } from "./tour-config";

interface UseOnboardingOptions {
  /** Delay before starting the tour (ms) */
  startDelay?: number;
  /** Custom tour steps (defaults to tourSteps from config) */
  steps?: DriveStep[];
  /** Additional driver.js config options */
  driverConfig?: Partial<Config>;
}

/**
 * Filter steps to only include those with elements present in DOM
 */
function getAvailableSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (!step.element) return true;
    const element = document.querySelector(step.element as string);
    return element !== null;
  });
}

/**
 * Hook to manage the product tour using driver.js
 * Automatically starts the tour when conditions are met
 */
export function useOnboarding(options: UseOnboardingOptions = {}) {
  const {
    startDelay = 800,
    steps = tourSteps,
    driverConfig = {},
  } = options;

  const {
    showTour,
    isTourActive,
    isReady,
    startTour,
    completeTour,
  } = useOnboardingContext();

  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const hasStartedRef = useRef(false);

  // Create and start tour with given steps
  const createAndStartTour = useCallback((tourSteps: DriveStep[]) => {
    // Destroy any existing instance
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const totalSteps = tourSteps.length;

    // Create new driver instance
    driverRef.current = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: tourSteps,
      popoverClass: "samurai-tour-popover",
      overlayColor: "rgba(0, 0, 0, 0.6)",
      stagePadding: 8,
      stageRadius: 8,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      doneBtnText: "Got it!",
      nextBtnText: "Next",
      prevBtnText: "Back",
      progressText: "{{current}} of {{total}}",
      onNextClick: () => {
        // Check if we're on the last step
        if (driverRef.current) {
          const currentIndex = driverRef.current.getActiveIndex();
          if (currentIndex !== undefined && currentIndex >= totalSteps - 1) {
            // On last step, clicking "Got it!" should complete the tour
            driverRef.current.destroy();
            completeTour();
          } else {
            // Not on last step, move to next
            driverRef.current.moveNext();
          }
        }
      },
      onCloseClick: () => {
        // Handle X button click
        if (driverRef.current) {
          driverRef.current.destroy();
        }
        completeTour();
      },
      onDestroyed: () => {
        hasStartedRef.current = false;
      },
      ...driverConfig,
    });

    // Start the tour
    hasStartedRef.current = true;
    startTour();
    driverRef.current.drive();
  }, [completeTour, startTour, driverConfig]);

  // Auto-start tour when conditions are met
  useEffect(() => {
    console.log("[Tour Debug] Checking conditions:", {
      isReady,
      showTour,
      isTourActive,
      hasStarted: hasStartedRef.current,
    });

    if (!isReady || !showTour || isTourActive || hasStartedRef.current) {
      console.log("[Tour Debug] Conditions not met, skipping tour start");
      return;
    }

    // Check available elements and start tour
    const checkElementsAndStart = () => {
      const available = getAvailableSteps(steps);
      console.log("[Tour Debug] Available steps:", available.length, "of", steps.length);

      // Need at least the chat input element to start
      const hasChatInput = available.some(
        (step) => step.element === "[data-tour='chat-input']"
      );
      console.log("[Tour Debug] Has chat input:", hasChatInput);

      if (hasChatInput && available.length > 0) {
        console.log("[Tour Debug] Starting tour with", available.length, "steps");
        createAndStartTour(available);
      } else {
        console.log("[Tour Debug] Cannot start tour - chat input not found");
      }
    };

    // Delay start to ensure DOM is ready
    const timeoutId = setTimeout(checkElementsAndStart, startDelay);

    return () => clearTimeout(timeoutId);
  }, [isReady, showTour, isTourActive, startDelay, steps, createAndStartTour]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  // Function to manually start the tour (for replay)
  const triggerTour = useCallback(() => {
    if (!isTourActive) {
      hasStartedRef.current = false; // Reset so we can start again
      const available = getAvailableSteps(steps);
      if (available.length > 0) {
        createAndStartTour(available);
      }
    }
  }, [isTourActive, steps, createAndStartTour]);

  // Function to stop the tour
  const stopTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }
  }, []);

  return {
    triggerTour,
    stopTour,
    isTourActive,
    isReady,
    showTour,
  };
}
