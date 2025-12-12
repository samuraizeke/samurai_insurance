'use client';

import { useVersionCheck } from '@/hooks/use-version-check';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faXmark } from '@fortawesome/free-solid-svg-icons';

interface UpdateBannerProps {
  /** How often to check for updates in milliseconds (default: 60000 = 1 minute) */
  checkInterval?: number;
}

export function UpdateBanner({ checkInterval = 60000 }: UpdateBannerProps) {
  const { hasUpdate, refresh, dismiss } = useVersionCheck({
    interval: checkInterval,
  });

  if (!hasUpdate) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[10000] flex items-center gap-3 rounded-2xl border border-[#333333]/10 bg-[hsl(0_0%_98%)] px-4 py-3 shadow-lg font-[family-name:var(--font-work-sans)]"
    >
      <FontAwesomeIcon icon={faRotate} className="size-4 text-[#de5e48]" />
      <span className="text-sm font-medium text-[#333333]">
        A new version is available
      </span>
      <div className="flex items-center gap-2">
        <Button
          onClick={refresh}
          size="sm"
          className="rounded-full bg-[#333333] hover:bg-[#333333]/90 text-white font-bold"
        >
          Refresh
        </Button>
        <Button
          onClick={dismiss}
          variant="ghost"
          size="icon-sm"
          className="rounded-full hover:bg-[#333333]/5"
          aria-label="Dismiss update notification"
        >
          <FontAwesomeIcon icon={faXmark} className="size-4 text-[#333333]" />
        </Button>
      </div>
    </div>
  );
}
