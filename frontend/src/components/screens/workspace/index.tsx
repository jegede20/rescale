import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  ChefHat,
  Copy,
  Minus,
  Plus,
  Printer,
  Repeat,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DualPillToggle } from '@/components/ui/pill-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRescale } from '@/context/RescaleContext';
import {
  computeGramEquivalent,
  convertForSystem,
  convertTemperaturesInText,
  detectStepTimers,
  getNextCycledUnit,
} from '@/lib/converter';
import { formatRecipeClipboardText } from '@/lib/parser-client';
import { formatQuantity, scaleQuantity } from '@/lib/scaler';
import { IngredientItem, SubstitutionOption, UnitSystem } from '@/lib/types';
import { SubstitutionPanel } from './SubstitutionPanel';
import { NutritionPanel } from './NutritionPanel';

const SCALE_PRESETS = [
  { label: '½x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
];

export function RecipeWorkspaceScreen() {
  const navigate = useNavigate();
  const { activeRecipe, setActiveRecipe, saveCurrentRecipe, pushToast } =
    useRescale();

  const [subTarget, setSubTarget] = useState<IngredientItem | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('2.5');

  const setServings = (nextServings: number) => {
    const clamped = Math.max(1, Math.min(200, nextServings));
    const mult = clamped / Math.max(1, activeRecipe.originalServings);
    setActiveRecipe((prev) => ({
      ...prev,
      targetServings: clamped,
      scaleMultiplier: mult,
    }));
  };

  const setMultiplier = (mult: number) => {
    const safeMult = Math.max(0.1, Math.min(50, mult));
    const newServings = Math.max(
      1,
      Math.round(activeRecipe.originalServings * safeMult * 10) / 10
    );
    setActiveRecipe((prev) => ({
      ...prev,
      scaleMultiplier: safeMult,
      targetServings: newServings,
    }));
  };

  const setSystem = (sys: UnitSystem) => {
    setActiveRecipe((prev) => ({
      ...prev,
      unitSystem: sys,
      tempUnit: sys === 'metric' ? 'C' : 'F',
      ingredients: prev.ingredients.map((i) => ({
        ...i,
        customUnitOverride: undefined,
      })),
    }));
  };

  const handleToggleRowUnit = (item: IngredientItem, currentCanonical: ReturnType<typeof convertForSystem>['canonical']) => {
    const nextUnit = getNextCycledUnit(currentCanonical, item.ingredient);
    if (!nextUnit) return;
    setActiveRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) =>
        i.id === item.id ? { ...i, customUnitOverride: nextUnit } : i
      ),
    }));
  };

  const handleApplySubstitution = (
    originalItem: IngredientItem,
    option: SubstitutionOption
  ) => {
    const previousName = originalItem.ingredient;
    setActiveRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((i) =>
        i.id === originalItem.id
          ? {
              ...i,
              ingredient: option.substitute,
              preparation: option.ratio,
              substitutedFrom: i.substitutedFrom || previousName,
              customUnitOverride: undefined,
            }
          : i
      ),
    }));
    setSubTarget(null);
    pushToast(`${previousName} swapped for ${option.substitute} ✓`);
  };

  const handleCopyRecipe = async () => {
    const plainText = formatRecipeClipboardText(activeRecipe);
    try {
      await navigator.clipboard.writeText(plainText);
      pushToast('Copied to clipboard 📋');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      pushToast('Copied to clipboard 📋');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderStepWithHighlights = (rawStep: string) => {
    const tempConverted = convertTemperaturesInText(rawStep, activeRecipe.tempUnit);
    const detected = detectStepTimers(tempConverted);
    if (detected.length === 0) {
      return tempConverted;
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    detected.forEach((seg, idx) => {
      if (seg.start > cursor) {
        parts.push(tempConverted.slice(cursor, seg.start));
      }
      parts.push(
        <span
          key={idx}
          className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-1.5 py-0.5 font-mono text-[14px] font-medium text-accent mx-0.5"
        >
          <Timer className="h-3.5 w-3.5 inline" strokeWidth={1.5} />
          {tempConverted.slice(seg.start, seg.end)}
        </span>
      );
      cursor = seg.end;
    });
    if (cursor < tempConverted.length) {
      parts.push(tempConverted.slice(cursor));
    }
    return parts;
  };

  const isPresetMatch = (val: number) =>
    !customMode && Math.abs(activeRecipe.scaleMultiplier - val) < 0.01;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6 pb-28"
      >
        {/* Back link */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/app/review')}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            <span>Back</span>
          </button>
        </div>

        {/* Workspace Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="font-display text-[30px] sm:text-[36px] leading-[1.15] text-text-primary">
              {activeRecipe.title}
            </h1>
            <p className="mt-1 text-[13px] font-mono text-text-muted">
              Original yield: {activeRecipe.originalServings} servings · Scaled:{' '}
              {Math.round(activeRecipe.scaleMultiplier * 100) / 100}x
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={saveCurrentRecipe}
            >
              <Bookmark className="h-4 w-4" strokeWidth={1.5} />
              <span>Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyRecipe}
            >
              <Copy className="h-4 w-4" strokeWidth={1.5} />
              <span>Copy</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              <span>Print</span>
            </Button>
            <Button asChild size="sm">
              <Link to="/app/recipe/cook">
                <ChefHat className="h-4 w-4" strokeWidth={1.5} />
                <span>Cook Mode</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Top Real-Time Controls Bar */}
        <Card className="p-5 space-y-4">
          {/* Row 1: Servings Stepper */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-medium text-text-secondary">
              Servings
            </span>
            <div className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-border bg-surface-raised p-1">
              <button
                type="button"
                aria-label="Decrease servings"
                onClick={() => setServings(Math.floor(activeRecipe.targetServings) - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-primary shadow-xs hover:text-accent cursor-pointer"
              >
                <Minus className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input
                type="number"
                min={1}
                max={200}
                aria-label="Desired servings"
                value={activeRecipe.targetServings}
                onChange={(e) => setServings(Number(e.target.value) || 1)}
                className="w-14 bg-transparent text-center font-mono text-[16px] font-semibold text-text-primary focus:outline-none"
              />
              <button
                type="button"
                aria-label="Increase servings"
                onClick={() => setServings(Math.ceil(activeRecipe.targetServings) + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-primary shadow-xs hover:text-accent cursor-pointer"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-border/70" />

          {/* Row 2: Scale Multiplier Segmented Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-medium text-text-secondary">
              Scale
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SCALE_PRESETS.map((preset) => {
                const active = isPresetMatch(preset.value);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setMultiplier(preset.value);
                    }}
                    className={`rounded-full px-4 py-1.5 font-sans text-[14px] font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-surface-raised text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCustomMode(true);
                  const parsed = parseFloat(customInput);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    setMultiplier(parsed);
                  }
                }}
                className={`rounded-full px-4 py-1.5 font-sans text-[14px] font-medium transition-all cursor-pointer ${
                  customMode
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-surface-raised text-text-secondary hover:text-text-primary'
                }`}
              >
                Custom
              </button>

              {customMode && (
                <div className="inline-flex items-center gap-1 rounded-full border border-accent bg-surface-raised px-3 py-1">
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    max="50"
                    value={customInput}
                    aria-label="Custom scale multiplier"
                    onChange={(e) => {
                      setCustomInput(e.target.value);
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v) && v > 0) setMultiplier(v);
                    }}
                    className="w-14 bg-transparent font-mono text-[14px] font-semibold text-accent focus:outline-none"
                  />
                  <span className="font-mono text-[12px] text-accent">x</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-border/70" />

          {/* Row 3: US <-> Metric System Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-medium text-text-secondary">
              Units &amp; Oven Temp ({activeRecipe.tempUnit === 'F' ? '°F' : '°C'})
            </span>
            <DualPillToggle
              ariaLabel="Unit system toggle"
              options={[
                { value: 'us', label: 'US' },
                { value: 'metric', label: 'Metric' },
              ]}
              value={activeRecipe.unitSystem}
              onChange={setSystem}
              className="w-[140px]"
            />
          </div>
        </Card>

        {/* 3 Workspace Tabs */}
        <Tabs defaultValue="ingredients" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
            <TabsTrigger value="nutrition">🍎 Nutrition</TabsTrigger>
          </TabsList>

          {/* TAB 1: INGREDIENTS */}
          <TabsContent value="ingredients">
            <Card className="p-5 sm:p-6">
              <div className="hidden md:grid md:grid-cols-12 gap-3 pb-3 border-b border-border text-[12px] font-mono uppercase tracking-wider text-text-muted">
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-6">Ingredient</div>
                <div className="col-span-2 text-right">Substitute</div>
              </div>

              <div className="divide-y divide-border">
                {activeRecipe.ingredients.map((item) => {
                  if (item.unscalable) {
                    return (
                      <div
                        key={item.id}
                        className="group py-3 px-3 my-1 rounded-md bg-warning-soft text-warning grid grid-cols-1 md:grid-cols-12 items-center gap-2"
                      >
                        <div className="md:col-span-4 flex items-center gap-2 font-mono text-[14px] font-medium">
                          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                          <span>{item.unit || 'Unscalable'}</span>
                        </div>
                        <div className="md:col-span-6 text-[15px] font-medium">
                          {item.ingredient}
                          {item.preparation && (
                            <span className="opacity-85">, {item.preparation}</span>
                          )}
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSubTarget(item)}
                            title="View substitutions"
                            className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[12px] font-medium hover:bg-black/5 cursor-pointer"
                          >
                            <Repeat className="h-4 w-4" strokeWidth={1.5} />
                            <span className="md:opacity-80">Swap</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const scaledRaw = scaleQuantity(
                    item.quantity,
                    activeRecipe.scaleMultiplier,
                    false
                  );
                  const converted = convertForSystem(
                    scaledRaw,
                    item.unit,
                    item.ingredient,
                    activeRecipe.unitSystem,
                    item.customUnitOverride
                  );
                  const gramSub =
                    converted.canonical !== 'g' && converted.canonical !== 'kg'
                      ? computeGramEquivalent(
                          converted.quantity,
                          converted.unit,
                          item.ingredient
                        )
                      : null;

                  return (
                    <div
                      key={item.id}
                      className="group py-3 grid grid-cols-1 md:grid-cols-12 items-center gap-2"
                    >
                      {/* Mobile stacked qty + unit header; Tablet+ horizontal columns */}
                      <div className="flex items-center gap-2.5 md:contents">
                        <div className="md:col-span-2">
                          <div className="font-mono text-[15px] font-medium text-text-primary">
                            {formatQuantity(converted.quantity, converted.unit)}
                          </div>
                          {gramSub !== null && (
                            <div className="font-mono text-[12px] text-text-muted">
                              {gramSub}g
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          {converted.unit ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleRowUnit(item, converted.canonical)
                              }
                              title="Click to toggle volume / weight unit"
                              className="inline-flex items-center rounded-sm bg-accent-soft px-2.5 py-0.5 font-mono text-[13px] font-medium text-accent hover:bg-accent hover:text-white transition-colors cursor-pointer"
                            >
                              {converted.unit}
                            </button>
                          ) : (
                            <span className="font-mono text-[13px] text-text-muted">
                              whole
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-6 text-[16px] text-text-primary">
                        <span>{item.ingredient}</span>
                        {item.preparation && (
                          <span className="text-text-secondary">
                            , {item.preparation}
                          </span>
                        )}
                        {item.substitutedFrom && (
                          <span className="ml-2 inline-block rounded-sm bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                            swapped from {item.substitutedFrom}
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSubTarget(item)}
                          title={`Substitute ${item.ingredient}`}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-text-muted md:opacity-65 group-hover:opacity-100 hover:bg-surface-raised hover:text-accent transition-all cursor-pointer"
                        >
                          <Repeat className="h-4 w-4" strokeWidth={1.5} />
                          <span className="text-[12px] font-medium">Swap</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: INSTRUCTIONS */}
          <TabsContent value="instructions">
            <Card className="p-5 sm:p-6 space-y-5">
              {activeRecipe.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-4 pb-5 border-b border-border last:border-b-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[14px] font-semibold text-accent mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[16px] leading-[1.7] text-text-primary">
                    {renderStepWithHighlights(step)}
                  </p>
                </div>
              ))}
            </Card>
          </TabsContent>

          {/* TAB 3: NUTRITION */}
          <TabsContent value="nutrition">
            <NutritionPanel recipe={activeRecipe} />
          </TabsContent>
        </Tabs>

        {/* Bottom Fixed / Prominent Enter Cook Mode Bar */}
        <div className="sticky bottom-16 md:bottom-4 z-30 pt-2">
          <div className="rounded-xl border border-border bg-surface/95 backdrop-blur-md p-3 shadow-lg flex items-center justify-between gap-4">
            <span className="hidden sm:inline text-[14px] text-text-secondary pl-2">
              Ready to head to the stove? Timers &amp; wake lock activate automatically.
            </span>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/app/recipe/cook">
                <ChefHat className="h-5 w-5" strokeWidth={1.5} />
                <span>Enter Cook Mode</span>
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Screen 4a: Right Slide-In Substitution Panel */}
      <SubstitutionPanel
        ingredient={subTarget}
        onClose={() => setSubTarget(null)}
        onApplySubstitution={handleApplySubstitution}
      />

      {/* Dedicated Clean Print View (portaled to document.body so @media print displays only clean recipe) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="print-only">
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
              {activeRecipe.title}
            </h1>
            <p style={{ fontSize: '14px', marginBottom: '20px', color: '#444' }}>
              Serves: {activeRecipe.targetServings} (Scaled with Rescale)
            </p>

            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>
              INGREDIENTS
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
              {activeRecipe.ingredients.map((item) => {
                if (item.unscalable) {
                  return (
                    <li
                      key={item.id}
                      style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}
                    >
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {item.unit ? `${item.unit} ` : ''}
                      </span>
                      {item.ingredient}
                      {item.preparation ? `, ${item.preparation}` : ''}
                    </li>
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
                  <li
                    key={item.id}
                    style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}
                  >
                    <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatQuantity(conv.quantity, conv.unit)}{' '}
                      {conv.unit ? `${conv.unit} ` : ''}
                    </strong>
                    {item.ingredient}
                    {item.preparation ? `, ${item.preparation}` : ''}
                  </li>
                );
              })}
            </ul>

            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>
              INSTRUCTIONS
            </h2>
            <ol style={{ paddingLeft: '20px', lineHeight: 1.65 }}>
              {activeRecipe.steps.map((step, i) => (
                <li key={i} style={{ marginBottom: '10px' }}>
                  {convertTemperaturesInText(step, activeRecipe.tempUnit)}
                </li>
              ))}
            </ol>
          </div>,
          document.body
        )}
    </>
  );
}
