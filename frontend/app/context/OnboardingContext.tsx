"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  shouldShowOnboarding,
  completeOnboarding,
  resetOnboardingForReplay,
  syncOnboardingFromSupabase,
} from "@/lib/onboarding";
import { useAuth } from "@/lib/auth-context";

interface OnboardingContextType {
  /** Whether the onboarding tour should be shown */
  showTour: boolean;
  /** Whether the tour is currently active/running */
  isTourActive: boolean;
  /** Mark the tour as started */
  startTour: () => void;
  /** Mark the tour as completed */
  completeTour: () => void;
  /** Restart the tour (for "Replay Tour" button) */
  replayTour: () => void;
  /** Whether onboarding is ready (after initial check) */
  isReady: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize onboarding state once auth is loaded
  useEffect(() => {
    const initializeOnboarding = async () => {
      console.log("[Onboarding Context] Initializing...", { isAuthLoading, hasUser: !!user });

      // Wait for auth to finish loading
      if (isAuthLoading) return;

      // Only show onboarding for authenticated users
      if (!user) {
        console.log("[Onboarding Context] No user, setting ready");
        setIsReady(true);
        return;
      }

      // First, sync from Supabase to catch cross-device status
      await syncOnboardingFromSupabase();

      // Then check if we should show the tour
      const shouldShow = shouldShowOnboarding();
      console.log("[Onboarding Context] Should show tour:", shouldShow);
      setShowTour(shouldShow);
      setIsReady(true);
    };

    initializeOnboarding();
  }, [user, isAuthLoading]);

  const startTour = useCallback(() => {
    setIsTourActive(true);
  }, []);

  const completeTour = useCallback(async () => {
    setIsTourActive(false);
    setShowTour(false);
    await completeOnboarding();
  }, []);

  const replayTour = useCallback(() => {
    resetOnboardingForReplay();
    setShowTour(true);
    // Don't set isTourActive here - let the tour hook set it when it actually starts
    setIsTourActive(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        showTour,
        isTourActive,
        startTour,
        completeTour,
        replayTour,
        isReady,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error(
      "useOnboardingContext must be used within an OnboardingProvider"
    );
  }
  return context;
}
