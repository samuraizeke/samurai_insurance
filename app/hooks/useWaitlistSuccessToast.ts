import { useCallback, useEffect, useRef, useState } from "react";

export function useWaitlistSuccessToast(durationMs = 2000) {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSuccess = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setShowSuccessToast(true);

    toastTimeoutRef.current = setTimeout(() => {
      setShowSuccessToast(false);
      toastTimeoutRef.current = null;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    showSuccessToast,
    triggerSuccess,
  };
}

