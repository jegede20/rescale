import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released: boolean;
}

export function useWakeLock(active = true) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const wl = await (
          navigator as Navigator & {
            wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
          }
        ).wakeLock.request('screen');
        if (!cancelled) {
          sentinelRef.current = wl;
        } else {
          await wl.release();
        }
      } catch {
        // Silently ignore if restricted by iframe permissions
      }
    };

    void acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void acquire();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sentinelRef.current && !sentinelRef.current.released) {
        void sentinelRef.current.release().catch(() => {});
      }
    };
  }, [active]);
}
