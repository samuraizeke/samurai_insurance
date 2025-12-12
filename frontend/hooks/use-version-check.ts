'use client';

import { useState, useEffect, useCallback } from 'react';

// Capture the version at the time this module loads (when the page first loads)
let initialVersion: string | null = null;

interface UseVersionCheckOptions {
  /** How often to check for updates in milliseconds (default: 60000 = 1 minute) */
  interval?: number;
  /** Whether to enable version checking (default: true) */
  enabled?: boolean;
}

export function useVersionCheck(options: UseVersionCheckOptions = {}) {
  const { interval = 60000, enabled = true } = options;

  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkVersion = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsChecking(true);
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return;

      const { version } = await response.json();

      // On first check, store the initial version
      if (initialVersion === null) {
        initialVersion = version;
        return;
      }

      // Compare with initial version
      if (version !== initialVersion) {
        setHasUpdate(true);
      }
    } catch (error) {
      // Silently fail - version check is not critical
      console.debug('Version check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [enabled]);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    setHasUpdate(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount
    checkVersion();

    // Then check periodically
    const intervalId = setInterval(checkVersion, interval);

    // Also check when tab becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion, interval, enabled]);

  return {
    hasUpdate,
    isChecking,
    refresh,
    dismiss,
  };
}
