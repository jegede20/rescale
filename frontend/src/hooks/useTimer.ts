import { useCallback, useEffect, useState } from 'react';
import { detectStepTimers } from '@/lib/converter';
import { CookTimer } from '@/lib/types';

export function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function playTimerBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [880, 1108.73, 1318.51, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.16);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + i * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.16);
    });
  } catch {
    // Audio playback blocked without user gesture
  }
}

export function useTimerManager(
  steps: string[],
  recipeId: string,
  timerSoundEnabled: boolean,
  onTimerComplete: (timer: CookTimer) => void
) {
  const [timers, setTimers] = useState<CookTimer[]>([]);
  const [flashAlertStep, setFlashAlertStep] = useState<string | null>(null);

  // Sync step timers cleanly whenever steps or recipe change while preserving active running timers on same recipe
  useEffect(() => {
    setTimers((prev) => {
      const next: CookTimer[] = [];
      steps.forEach((step, stepIndex) => {
        const detected = detectStepTimers(step);
        detected.forEach((seg, subIdx) => {
          const id = `${recipeId}-step-${stepIndex}-t-${subIdx}`;
          const existing = prev.find((t) => t.id === id);
          if (existing) {
            next.push(existing);
          } else {
            next.push({
              id,
              stepIndex,
              label: seg.label,
              totalSeconds: seg.seconds,
              remainingSeconds: seg.seconds,
              status: 'idle',
            });
          }
        });
      });
      return next;
    });
  }, [steps, recipeId]);

  useEffect(() => {
    const hasRunning = timers.some((t) => t.status === 'running');
    if (!hasRunning) return;

    const interval = window.setInterval(() => {
      setTimers((prev) =>
        prev.map((timer) => {
          if (timer.status !== 'running') return timer;
          if (timer.remainingSeconds <= 1) {
            if (timerSoundEnabled) {
              playTimerBeep();
            }
            const finished: CookTimer = {
              ...timer,
              remainingSeconds: 0,
              status: 'done',
            };
            setFlashAlertStep(timer.label);
            setTimeout(() => setFlashAlertStep(null), 2600);
            onTimerComplete(finished);
            return finished;
          }
          return {
            ...timer,
            remainingSeconds: timer.remainingSeconds - 1,
          };
        })
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timers, timerSoundEnabled, onTimerComplete]);

  const startTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              remainingSeconds: t.remainingSeconds === 0 ? t.totalSeconds : t.remainingSeconds,
              status: 'running',
            }
          : t
      )
    );
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'paused' } : t))
    );
  }, []);

  const resetTimer = useCallback((id: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, remainingSeconds: t.totalSeconds, status: 'idle' }
          : t
      )
    );
  }, []);

  return {
    timers,
    flashAlertStep,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}
