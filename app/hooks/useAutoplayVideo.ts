import { RefObject, useEffect } from "react";

type UseAutoplayVideoOptions = {
  playbackRate?: number;
  retryDelayMs?: number;
};

const DEFAULT_RETRY_DELAY = 150;

export function useAutoplayVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  { playbackRate, retryDelayMs = DEFAULT_RETRY_DELAY }: UseAutoplayVideoOptions = {}
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    let cancelled = false;
    const listeners: Array<() => void> = [];

    video.defaultMuted = true;
    video.muted = true;

    const attemptPlay = () => {
      if (cancelled) {
        return;
      }

      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          if (cancelled) {
            return;
          }
          window.setTimeout(() => {
            video.play().catch(() => {
              // Autoplay may still be blocked; user interaction will start playback.
            });
          }, retryDelayMs);
        });
      }
    };

    const handleLoaded = () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("loadedmetadata", handleLoaded);
      attemptPlay();
    };

    if (
      video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ||
      video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      attemptPlay();
    } else {
      video.addEventListener("loadeddata", handleLoaded);
      video.addEventListener("loadedmetadata", handleLoaded);
      listeners.push(() => video.removeEventListener("loadeddata", handleLoaded));
      listeners.push(() =>
        video.removeEventListener("loadedmetadata", handleLoaded)
      );
    }

    if (typeof playbackRate === "number") {
      const applyPlaybackRate = () => {
        video.playbackRate = playbackRate;
      };

      applyPlaybackRate();
      video.addEventListener("loadedmetadata", applyPlaybackRate);
      video.addEventListener("loadeddata", applyPlaybackRate);
      listeners.push(() =>
        video.removeEventListener("loadedmetadata", applyPlaybackRate)
      );
      listeners.push(() =>
        video.removeEventListener("loadeddata", applyPlaybackRate)
      );
    }

    return () => {
      cancelled = true;
      listeners.forEach((cleanup) => cleanup());
    };
  }, [videoRef, playbackRate, retryDelayMs]);
}
