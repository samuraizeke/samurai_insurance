/**
 * Onboarding persistence helpers
 * Hybrid storage strategy: localStorage (instant) + Supabase user_metadata (cross-device)
 */

import { createClient } from "@/lib/supabase";

const ONBOARDING_KEY = "samurai_has_seen_onboarding";

/**
 * Check if the user has completed onboarding (localStorage check - instant)
 */
export function hasSeenOnboardingLocal(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume seen
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

/**
 * Mark onboarding as complete in localStorage
 */
export function markOnboardingCompleteLocal(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "true");
}

/**
 * Clear onboarding completion from localStorage (for replay)
 */
export function clearOnboardingLocal(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}

/**
 * Sync onboarding status from Supabase user_metadata to localStorage
 * Call this on login to ensure cross-device consistency
 */
export async function syncOnboardingFromSupabase(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.user_metadata?.has_seen_onboarding) {
      markOnboardingCompleteLocal();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to sync onboarding status from Supabase:", error);
    return false;
  }
}

/**
 * Mark onboarding as complete in Supabase user_metadata
 * This persists across devices
 */
export async function markOnboardingCompleteSupabase(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { has_seen_onboarding: true }
    });

    if (error) {
      console.error("Failed to update onboarding status in Supabase:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to mark onboarding complete in Supabase:", error);
    return false;
  }
}

/**
 * Complete onboarding - updates both localStorage and Supabase
 */
export async function completeOnboarding(): Promise<void> {
  // Update localStorage immediately for instant UX
  markOnboardingCompleteLocal();

  // Sync to Supabase in background (don't block)
  markOnboardingCompleteSupabase().catch(console.error);
}

/**
 * Reset onboarding status (for replay tour functionality)
 * Only clears localStorage - Supabase status remains for reference
 */
export function resetOnboardingForReplay(): void {
  clearOnboardingLocal();
}

/**
 * Check if onboarding should be shown
 * Returns true if user hasn't seen onboarding locally
 */
export function shouldShowOnboarding(): boolean {
  const hasSeen = hasSeenOnboardingLocal();
  console.log("[Onboarding] localStorage check - has_seen:", hasSeen);
  return !hasSeen;
}
