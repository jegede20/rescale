import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  Star,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRescale } from '@/context/RescaleContext';
import { formatTimerClock } from '@/hooks/useTimer';
import { useWakeLock } from '@/hooks/useWakeLock';
import {
  convertForSystem,
  convertTemperaturesInText,
} from '@/lib/converter';
import { formatQuantity, scaleQuantity } from '@/lib/scaler';

export function CookModeScreen() {
  const navigate = useNavigate();
  const {
    activeRecipe,
    cookStepIndex,
    setCookStepIndex,
    timers,
    flashAlertStep,
    startTimer,
    pauseTimer,
    resetTimer,
    rateCurrentRecipe,
  } = useRescale();

  // Hardcoded ON in Cook Mode silently
  useWakeLock(true);

  const [direction, setDirection] = useState<1 | -1>(1);
  const [completed, setCompleted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const totalSteps = Math.max(1, activeRecipe.steps.length);
  const safeIndex = Math.min(Math.max(0, cookStepIndex), totalSteps - 1);
  const currentRawStep = activeRecipe.steps[safeIndex] || '';
  const displayStepText = convertTemperaturesInText(
    currentRawStep,
    activeRecipe.tempUnit
  );

  const stepTimers = useMemo(
    () => timers.filter((t) => t.stepIndex === safeIndex),
    [timers, safeIndex]
  );

  // Match ingredients referenced in current step text
  const stepIngredients = useMemo(() => {
    const stepLower = currentRawStep.toLowerCase();
    return activeRecipe.ingredients.filter((item) => {
      const full = item.ingredient.toLowerCase().trim();
      if (!full) return false;
      if (stepLower.includes(full)) return true;
      const significantWords = full
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z]/g, ''))
        .filter(
          (w) =>
            w.length >= 4 &&
            !['large', 'small', 'medium', 'fresh', 'dried', 'unsalted', 'salted', 'whole', 'light', 'dark', 'ground', 'brown', 'white', 'black', 'green', 'powder', 'allpurpose'].includes(
              w
            )
        );
      return significantWords.some((word) => stepLower.includes(word));
    });
  }, [activeRecipe.ingredients, currentRawStep]);

  const goPrev = () => {
    if (completed) {
      setCompleted(false);
      return;
    }
    if (safeIndex > 0) {
      setDirection(-1);
      setCookStepIndex(safeIndex - 1);
    }
  };

  const goNext = () => {
    if (safeIndex < totalSteps - 1) {
      setDirection(1);
      setCookStepIndex(safeIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  // Keyboard navigation convenience
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') navigate('/app/recipe');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -50) goNext();
    else if (delta > 50) goPrev();
  };

  const progressPct = completed
    ? 100
    : ((safeIndex + 1) / totalSteps) * 100;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-bg text-text-primary flex flex-col justify-between relative overflow-hidden"
    >
      {/* Full-Screen Flash Alert When Any Timer Ends */}
      <AnimatePresence>
        {flashAlertStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.1, 0.35, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2 }}
            className="pointer-events-none fixed inset-0 z-50 bg-accent"
          />
        )}
      </AnimatePresence>

      {/* Top Header + Animated 4px Progress Bar */}
      <div className="w-full pt-4 px-4 sm:px-8 space-y-4">
        <div className="mx-auto max-w-[720px] flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/recipe')}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
            <span>Exit Cook Mode</span>
          </Button>

          <span className="font-sans text-[14px] font-medium text-text-secondary">
            {completed
              ? 'Complete'
              : `Step ${safeIndex + 1} of ${totalSteps}`}
          </span>

          <div className="w-[110px] hidden sm:block text-right font-mono text-[12px] text-text-muted truncate">
            {activeRecipe.title}
          </div>
        </div>

        {/* Full-Width 4px Progress Bar */}
        <div className="mx-auto max-w-[720px] h-[4px] w-full rounded-full bg-surface-raised overflow-hidden">
          <div
            style={{ width: `${progressPct}%` }}
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          />
        </div>
      </div>

      {/* Center Step Card or Completion Card */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-[720px]">
          {completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-2xl border border-border bg-surface p-8 sm:p-12 shadow-xl text-center space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                <PartyPopper className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h1 className="font-display text-[44px] leading-tight text-text-primary">
                Dinner is served.
              </h1>
              <p className="text-[17px] text-text-secondary max-w-md mx-auto">
                You finished all {totalSteps} steps of{' '}
                <strong className="text-text-primary">{activeRecipe.title}</strong>.
                How did it turn out?
              </p>

              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (activeRecipe.rating ?? 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} stars`}
                      onClick={() => rateCurrentRecipe(star)}
                      className="p-1.5 transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          filled
                            ? 'fill-accent text-accent'
                            : 'text-border hover:text-accent/60'
                        }`}
                        strokeWidth={1.5}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <Button size="lg" onClick={() => navigate('/app/recipe')}>
                  Return to Workspace
                </Button>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={safeIndex}
                custom={direction}
                initial={{ opacity: 0, x: direction * 36 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -36 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="space-y-5"
              >
                {/* Main Step Card */}
                <div className="relative rounded-2xl border border-border bg-surface p-7 sm:p-10 shadow-xl overflow-hidden">
                  {/* Editorial Watermark Step Number */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none select-none font-display text-[96px] leading-none text-border absolute top-3 left-6"
                  >
                    {String(safeIndex + 1).padStart(2, '0')}
                  </span>

                  <div className="relative z-10 mx-auto max-w-[560px] pt-6 sm:pt-4 text-center">
                    <p className="font-sans text-[22px] sm:text-[28px] font-normal leading-[1.7] text-text-primary">
                      {displayStepText}
                    </p>
                  </div>
                </div>

                {/* Ingredients Relevant To This Step Card */}
                {stepIngredients.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary block mb-2.5">
                      Ingredients This Step
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {stepIngredients.map((item) => {
                        if (item.unscalable) {
                          return (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-[14px] border border-border"
                            >
                              <span className="font-mono text-warning">
                                {item.unit || 'to taste'}
                              </span>
                              <span className="text-text-primary">
                                {item.ingredient}
                              </span>
                            </span>
                          );
                        }
                        const scaled = scaleQuantity(
                          item.quantity,
                          activeRecipe.scaleMultiplier,
                          false
                        );
                        const conv = convertForSystem(
                          scaled,
                          item.unit,
                          item.ingredient,
                          activeRecipe.unitSystem,
                          item.customUnitOverride
                        );
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-[14px] border border-border shadow-xs"
                          >
                            <strong className="font-mono font-semibold text-accent">
                              {formatQuantity(conv.quantity, conv.unit)}
                              {conv.unit ? ` ${conv.unit}` : ''}
                            </strong>
                            <span className="text-text-primary">
                              {item.ingredient}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Auto-Detected Step Timer Card(s) — stacks vertically when 2+ timers in step */}
                {stepTimers.length > 0 && (
                  <div className="space-y-3">
                    {stepTimers.map((timer) => {
                      const isRunning = timer.status === 'running';
                      const isDone = timer.status === 'done';
                      return (
                        <div
                          key={timer.id}
                          className={`rounded-2xl border p-6 text-center transition-colors shadow-sm ${
                            isDone
                              ? 'border-accent bg-accent-soft/55'
                              : 'border-border bg-surface'
                          }`}
                        >
                          <span className="font-sans text-[14px] font-medium text-text-secondary block mb-2">
                            {isDone
                              ? `🔔 Done — ${timer.label}`
                              : `"${timer.label}"`}
                          </span>

                          <div
                            className={`font-mono text-[48px] sm:text-[56px] font-light leading-none my-3 ${
                              isRunning
                                ? 'timer-running-pulse'
                                : 'text-text-primary'
                            }`}
                          >
                            {formatTimerClock(timer.remainingSeconds)}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                            {isRunning ? (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => pauseTimer(timer.id)}
                              >
                                <Pause className="h-4 w-4" strokeWidth={1.5} />
                                <span>Pause</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                onClick={() => startTimer(timer.id)}
                              >
                                <Play className="h-4 w-4" strokeWidth={1.5} />
                                <span>Start Timer</span>
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => resetTimer(timer.id)}
                            >
                              <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
                              <span>Reset</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Bottom Previous / Next Navigation Bar */}
      {!completed && (
        <div className="w-full border-t border-border bg-surface/90 backdrop-blur-md py-4 px-4 sm:px-8">
          <div className="mx-auto max-w-[720px] flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              disabled={safeIndex === 0}
              onClick={goPrev}
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
              <span>Previous Step</span>
            </Button>

            <Button type="button" size="lg" onClick={goNext}>
              {safeIndex === totalSteps - 1 ? (
                <>
                  <span>Finish Cooking 🎉</span>
                  <PartyPopper className="h-5 w-5" strokeWidth={1.5} />
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
