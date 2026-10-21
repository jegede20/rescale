import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { InlineErrorBanner, LoadingOverlay } from '@/components/ui/feedback';
import { useRescale } from '@/context/RescaleContext';
import { fetchNutritionMacros } from '@/lib/parser-client';
import { NutritionMacros, RecipeData } from '@/lib/types';

interface NutritionPanelProps {
  recipe: RecipeData;
}

export function NutritionPanel({ recipe }: NutritionPanelProps) {
  const { nutritionCache, cacheNutrition } = useRescale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signature = useMemo(() => {
    const ingKey = recipe.ingredients
      .map((i) => `${i.quantity ?? 0}:${i.unit}:${i.ingredient}`)
      .join('|');
    return `${recipe.originalServings}::${ingKey}`;
  }, [recipe.ingredients, recipe.originalServings]);

  const macros: NutritionMacros | null = nutritionCache[signature] || null;

  const loadNutrition = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = recipe.ingredients
        .filter((i) => !i.unscalable && i.quantity !== null)
        .map((i) => ({
          quantity: i.quantity,
          unit: i.unit,
          ingredient: i.ingredient,
        }));

      const data = await fetchNutritionMacros(
        payload,
        Math.max(1, recipe.originalServings)
      );
      cacheNutrition(signature, data);
      setLoading(false);
    } catch {
      setLoading(false);
      setError('Could not calculate USDA nutrition data right now.');
    }
  }, [recipe.ingredients, recipe.originalServings, signature, cacheNutrition]);

  useEffect(() => {
    if (!macros) {
      void loadNutrition();
    }
  }, [macros, loadNutrition]);

  const proteinCals = (macros?.protein ?? 0) * 4;
  const carbCals = (macros?.carbs ?? 0) * 4;
  const fatCals = (macros?.fat ?? 0) * 9;
  const totalMacroCals = Math.max(1, proteinCals + carbCals + fatCals);

  const circumference = 2 * Math.PI * 52;
  const carbLen = (carbCals / totalMacroCals) * circumference;
  const fatLen = (fatCals / totalMacroCals) * circumference;
  const proteinLen = (proteinCals / totalMacroCals) * circumference;

  const cards = [
    { emoji: '🔥', label: 'Calories', value: macros ? `${macros.calories}` : '—', unit: 'kcal' },
    { emoji: '🥩', label: 'Protein', value: macros ? `${macros.protein}` : '—', unit: 'g' },
    { emoji: '🍞', label: 'Carbs', value: macros ? `${macros.carbs}` : '—', unit: 'g' },
    { emoji: '🧈', label: 'Fat', value: macros ? `${macros.fat}` : '—', unit: 'g' },
    { emoji: '🍬', label: 'Sugar', value: macros ? `${macros.sugar}` : '—', unit: 'g' },
    { emoji: '🌾', label: 'Fiber', value: macros ? `${macros.fiber}` : '—', unit: 'g' },
    { emoji: '🧂', label: 'Sodium', value: macros ? `${macros.sodium}` : '—', unit: 'mg' },
  ];

  return (
    <Card className="relative p-5 sm:p-6 space-y-6">
      {loading && <LoadingOverlay message="Calculating nutrition..." />}

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-border pb-4">
        <h2 className="font-sans text-[20px] font-semibold text-text-primary">
          Nutrition
        </h2>
        <span className="font-mono text-[13px] text-text-secondary">
          Per serving ({recipe.targetServings} servings total)
        </span>
      </div>

      {error && !macros && (
        <InlineErrorBanner message={error} onRetry={loadNutrition} />
      )}

      {/* Visual Macro Ring Chart + Legend */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 rounded-lg bg-surface-raised/65 p-6 border border-border">
        <div className="relative flex items-center justify-center">
          <svg width="144" height="144" viewBox="0 0 144 144">
            <circle
              cx="72"
              cy="72"
              r="52"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="14"
            />
            {/* Carbs segment (Accent Spice) */}
            <circle
              cx="72"
              cy="72"
              r="52"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="14"
              strokeDasharray={`${carbLen} ${circumference}`}
              transform="rotate(-90 72 72)"
            />
            {/* Fat segment (Warm Amber) */}
            <circle
              cx="72"
              cy="72"
              r="52"
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth="14"
              strokeDasharray={`${fatLen} ${circumference}`}
              strokeDashoffset={-carbLen}
              transform="rotate(-90 72 72)"
            />
            {/* Protein segment (Herb Green) */}
            <circle
              cx="72"
              cy="72"
              r="52"
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="14"
              strokeDasharray={`${proteinLen} ${circumference}`}
              strokeDashoffset={-(carbLen + fatLen)}
              transform="rotate(-90 72 72)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-[22px] font-bold text-text-primary leading-none">
              {macros ? macros.calories : '—'}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase text-text-secondary">
              kcal
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 text-center sm:text-left">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              Protein
            </span>
            <p className="font-mono text-[18px] font-semibold text-text-primary mt-0.5">
              {Math.round((proteinCals / totalMacroCals) * 100)}%
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              Carbs
            </span>
            <p className="font-mono text-[18px] font-semibold text-text-primary mt-0.5">
              {Math.round((carbCals / totalMacroCals) * 100)}%
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
              <span className="h-2.5 w-2.5 rounded-full bg-warning" />
              Fat
            </span>
            <p className="font-mono text-[18px] font-semibold text-text-primary mt-0.5">
              {Math.round((fatCals / totalMacroCals) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* 7 Macro Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between shadow-xs"
          >
            <span className="text-[13px] text-text-secondary">
              {c.emoji} {c.label}
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-mono text-[22px] font-semibold text-text-primary">
                {c.value}
              </span>
              <span className="font-mono text-[12px] text-text-muted">
                {c.unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory USDA Disclaimer */}
      <p className="text-[13px] text-text-secondary pt-2 border-t border-border">
        ⚠️ Estimates only — based on USDA standard ingredient data
      </p>
    </Card>
  );
}
