import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Merge,
  Pencil,
  Plus,
  Split,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRescale } from '@/context/RescaleContext';
import { makeId, parseIngredientClient } from '@/lib/parser-client';
import {
  formatQuantity,
  isUnscalableIngredient,
  parseFractionString,
} from '@/lib/scaler';
import { IngredientItem } from '@/lib/types';

type ManualLineTag = 'title' | 'servings' | 'ingredient' | 'step' | 'ignore';

export function ParseReviewScreen() {
  const navigate = useNavigate();
  const {
    reviewDraft,
    setReviewDraft,
    setRawInputText,
    commitReviewToWorkspace,
  } = useRescale();

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingServings, setEditingServings] = useState(false);
  const [manualAssignOpen, setManualAssignOpen] = useState(false);
  const [manualLines, setManualLines] = useState<
    Array<{ text: string; tag: ManualLineTag }>
  >([]);

  const openManualSectionAssigner = () => {
    const sourceLines = (
      reviewDraft.rawText ||
      [
        reviewDraft.title,
        `Serves ${reviewDraft.servings}`,
        ...reviewDraft.ingredients.map(
          (i) =>
            `${i.quantity !== null ? `${formatQuantity(i.quantity)} ` : ''}${
              i.unit ? `${i.unit} ` : ''
            }${i.ingredient}${i.preparation ? `, ${i.preparation}` : ''}`
        ),
        ...reviewDraft.steps,
      ].join('\n')
    )
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    setManualLines(
      sourceLines.map((line, index) => {
        if (index === 0) return { text: line, tag: 'title' };
        if (/serves|servings|yield/i.test(line) && line.length < 35) {
          return { text: line, tag: 'servings' };
        }
        if (/^(ingredients|instructions|directions|method):?$/i.test(line)) {
          return { text: line, tag: 'ignore' };
        }
        if (line.length > 70 || /^\d+[.)]/.test(line)) {
          return { text: line, tag: 'step' };
        }
        return { text: line, tag: 'ingredient' };
      })
    );
    setManualAssignOpen((prev) => !prev);
  };

  const applyManualSectionAssignment = () => {
    let nextTitle = reviewDraft.title;
    let nextServings = reviewDraft.servings;
    const nextIngredients: IngredientItem[] = [];
    const nextSteps: string[] = [];

    manualLines.forEach((row) => {
      if (row.tag === 'title') {
        nextTitle = row.text;
      } else if (row.tag === 'servings') {
        const m = row.text.match(/(\d+)/);
        if (m) nextServings = Math.max(1, parseInt(m[1], 10));
      } else if (row.tag === 'ingredient') {
        nextIngredients.push(parseIngredientClient(row.text));
      } else if (row.tag === 'step') {
        nextSteps.push(row.text.replace(/^\d+[.)\-\s]+/, '').trim());
      }
    });

    setReviewDraft((prev) => ({
      ...prev,
      title: nextTitle,
      servings: nextServings,
      ingredients: nextIngredients,
      steps: nextSteps,
    }));
    setManualAssignOpen(false);
  };

  const updateIngredientField = (
    id: string,
    patch: Partial<IngredientItem>,
    rawQtyInput?: string
  ) => {
    setReviewDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) => {
        if (item.id !== id) return item;
        const updated: IngredientItem = { ...item, ...patch };
        if (rawQtyInput !== undefined) {
          updated.quantity = rawQtyInput.trim() === '' ? null : parseFractionString(rawQtyInput);
        }
        updated.unscalable = isUnscalableIngredient(
          updated.quantity,
          updated.unit,
          updated.ingredient,
          updated.preparation
        );
        return updated;
      }),
    }));
  };

  const addIngredientRow = () => {
    setReviewDraft((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          id: makeId(),
          quantity: 1,
          unit: 'cup',
          ingredient: '',
          preparation: '',
          unscalable: false,
          confidence: 1,
        },
      ],
    }));
  };

  const deleteIngredientRow = (id: string) => {
    setReviewDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((i) => i.id !== id),
    }));
  };

  const updateStepText = (idx: number, text: string) => {
    setReviewDraft((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? text : s)),
    }));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setReviewDraft((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.steps.length) return prev;
      const copy = [...prev.steps];
      const [removed] = copy.splice(idx, 1);
      copy.splice(target, 0, removed);
      return { ...prev, steps: copy };
    });
  };

  const mergeWithNextStep = (idx: number) => {
    setReviewDraft((prev) => {
      if (idx >= prev.steps.length - 1) return prev;
      const copy = [...prev.steps];
      copy[idx] = `${copy[idx].trim()} ${copy[idx + 1].trim()}`.trim();
      copy.splice(idx + 1, 1);
      return { ...prev, steps: copy };
    });
  };

  const splitStepInTwo = (idx: number) => {
    setReviewDraft((prev) => {
      const current = prev.steps[idx] || '';
      const sentenceBreak = current.search(/[.!?]\s+/);
      let first = current;
      let second = 'Continue cooking as needed.';

      if (sentenceBreak > 0 && sentenceBreak < current.length - 2) {
        first = current.slice(0, sentenceBreak + 1).trim();
        second = current.slice(sentenceBreak + 1).trim();
      } else if (current.length > 20) {
        const mid = Math.floor(current.length / 2);
        const spaceIdx = current.indexOf(' ', mid);
        if (spaceIdx > 0) {
          first = current.slice(0, spaceIdx).trim();
          second = current.slice(spaceIdx + 1).trim();
        }
      }

      const copy = [...prev.steps];
      copy.splice(idx, 1, first, second);
      return { ...prev, steps: copy };
    });
  };

  const deleteStep = (idx: number) => {
    setReviewDraft((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx),
    }));
  };

  const addStep = () => {
    setReviewDraft((prev) => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Screen Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Back</span>
        </button>

        <h1 className="font-sans text-[20px] sm:text-[24px] font-semibold text-text-primary">
          Parse Review
        </h1>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openManualSectionAssigner}
        >
          Edit Manually
        </Button>
      </div>

      {/* Optional Manual Section Assigner Fallback */}
      {manualAssignOpen && (
        <Card className="p-5 space-y-4 border-accent/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold text-text-primary">
                Manual Section Assignment
              </h2>
              <p className="text-[13px] text-text-secondary">
                Assign any line as Title, Servings, Ingredient, Instruction Step, or Ignore.
              </p>
            </div>
            <Button size="sm" onClick={applyManualSectionAssignment}>
              Apply Sections
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {manualLines.map((row, idx) => (
              <div
                key={idx}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[14px]"
              >
                <span className="truncate text-text-primary pr-2">{row.text}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {(['title', 'servings', 'ingredient', 'step', 'ignore'] as ManualLineTag[]).map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setManualLines((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, tag } : r))
                          )
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-mono capitalize cursor-pointer ${
                          row.tag === tag
                            ? 'bg-accent text-white'
                            : 'bg-surface-raised text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Title & Servings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <Card className="md:col-span-8 p-5 flex items-center justify-between gap-4">
          <div className="w-full">
            <span className="text-[12px] font-mono uppercase tracking-wider text-text-secondary block mb-1">
              📌 Recipe Title
            </span>
            {editingTitle ? (
              <Input
                autoFocus
                value={reviewDraft.title}
                onChange={(e) =>
                  setReviewDraft((prev) => ({ ...prev, title: e.target.value }))
                }
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="text-left font-display text-[28px] leading-snug text-text-primary hover:text-accent transition-colors cursor-pointer w-full"
              >
                {reviewDraft.title || 'Untitled Recipe'}
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditingTitle((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Edit</span>
          </Button>
        </Card>

        <Card className="md:col-span-4 p-5 flex items-center justify-between gap-4">
          <div className="w-full">
            <span className="text-[12px] font-mono uppercase tracking-wider text-text-secondary block mb-1">
              🍽️ Original Yield
            </span>
            {editingServings ? (
              <Input
                type="number"
                min={1}
                max={200}
                autoFocus
                value={reviewDraft.servings}
                onChange={(e) =>
                  setReviewDraft((prev) => ({
                    ...prev,
                    servings: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                onBlur={() => setEditingServings(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingServings(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingServings(true)}
                className="text-left text-[18px] font-semibold text-text-primary hover:text-accent transition-colors cursor-pointer"
              >
                Servings Detected:{' '}
                <span className="font-mono text-accent">{reviewDraft.servings}</span>
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditingServings((v) => !v)}
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Edit</span>
          </Button>
        </Card>
      </div>

      {/* Ingredients Table Card */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-text-primary">
            🧪 Ingredients ({reviewDraft.ingredients.length})
          </h2>
          <span className="text-[12px] text-text-muted">
            Click any field to refine
          </span>
        </div>

        <div className="hidden md:grid md:grid-cols-12 gap-3 pb-2.5 border-b border-border text-[12px] font-mono uppercase tracking-wider text-text-muted">
          <div className="col-span-1">Status</div>
          <div className="col-span-2">Quantity</div>
          <div className="col-span-2">Unit</div>
          <div className="col-span-4">Ingredient Name</div>
          <div className="col-span-2">Preparation</div>
          <div className="col-span-1 text-right">Remove</div>
        </div>

        <div className="divide-y divide-border">
          {reviewDraft.ingredients.map((item) => {
            const flagged = Boolean(item.unscalable || item.isRange);
            return (
              <div
                key={item.id}
                className={`py-3 grid grid-cols-1 md:grid-cols-12 items-center gap-2.5 rounded-sm px-2 ${
                  item.unscalable ? 'bg-warning-soft/55' : ''
                }`}
              >
                <div className="md:col-span-1 flex items-center gap-2">
                  {flagged ? (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      title={
                        item.isRange
                          ? `Range detected (uses lower value)`
                          : 'Unscalable item (e.g. to taste)'
                      }
                      className="inline-flex items-center gap-1 text-warning text-[12px] font-medium"
                    >
                      <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                      <span className="md:hidden">
                        {item.isRange ? 'Range (lower value used)' : 'Unscalable'}
                      </span>
                    </motion.span>
                  ) : (
                    <span
                      title="Parsed confidently"
                      className="inline-flex items-center gap-1 text-success text-[12px]"
                    >
                      <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
                      <span className="md:hidden">Confident</span>
                    </span>
                  )}
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    aria-label="Quantity"
                    placeholder="—"
                    defaultValue={
                      item.quantity !== null ? String(item.quantity) : ''
                    }
                    onBlur={(e) =>
                      updateIngredientField(item.id, {}, e.target.value)
                    }
                    className="w-full rounded-sm border border-border bg-surface-raised px-2.5 py-1.5 font-mono text-[14px] text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    aria-label="Unit"
                    placeholder="unit"
                    value={item.unit}
                    onChange={(e) =>
                      updateIngredientField(item.id, { unit: e.target.value })
                    }
                    className="w-full rounded-sm border border-border bg-surface-raised px-2.5 py-1.5 font-mono text-[14px] text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="md:col-span-4">
                  <input
                    type="text"
                    aria-label="Ingredient name"
                    placeholder="Ingredient name"
                    value={item.ingredient}
                    onChange={(e) =>
                      updateIngredientField(item.id, {
                        ingredient: e.target.value,
                      })
                    }
                    className="w-full rounded-sm border border-border bg-surface-raised px-2.5 py-1.5 text-[14px] text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    aria-label="Preparation"
                    placeholder="prep note"
                    value={item.preparation}
                    onChange={(e) =>
                      updateIngredientField(item.id, {
                        preparation: e.target.value,
                      })
                    }
                    className="w-full rounded-sm border border-border bg-surface-raised px-2.5 py-1.5 text-[14px] text-text-secondary focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    aria-label="Delete ingredient row"
                    onClick={() => deleteIngredientRow(item.id)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredientRow}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Add Ingredient</span>
          </Button>
        </div>
      </Card>

      {/* Instructions List Card */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-text-primary">
            📝 Instructions ({reviewDraft.steps.length})
          </h2>
          <span className="text-[12px] text-text-muted">
            Edit, split, merge, or reorder steps
          </span>
        </div>

        <div className="space-y-3">
          {reviewDraft.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-md border border-border bg-surface-raised/60 p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-soft px-2 font-mono text-[12px] font-semibold text-accent">
                  Step {idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Move up"
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, -1)}
                    className="rounded-sm p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={idx === reviewDraft.steps.length - 1}
                    onClick={() => moveStep(idx, 1)}
                    className="rounded-sm p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    title="Split into 2 steps"
                    onClick={() => splitStepInTwo(idx)}
                    className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[12px] text-text-secondary hover:bg-surface hover:text-text-primary cursor-pointer"
                  >
                    <Split className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Split</span>
                  </button>
                  <button
                    type="button"
                    title="Merge with next step"
                    disabled={idx === reviewDraft.steps.length - 1}
                    onClick={() => mergeWithNextStep(idx)}
                    className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[12px] text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-35 cursor-pointer"
                  >
                    <Merge className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Merge</span>
                  </button>
                  <button
                    type="button"
                    title="Delete step"
                    onClick={() => deleteStep(idx)}
                    className="rounded-sm p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={step}
                onChange={(e) => updateStepText(idx, e.target.value)}
                placeholder="Describe this step..."
                className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-[15px] leading-relaxed text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>Add Step</span>
          </Button>
        </div>
      </Card>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (reviewDraft.rawText) setRawInputText(reviewDraft.rawText);
            navigate('/app');
          }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Re-parse</span>
        </Button>

        <Button
          type="button"
          size="lg"
          onClick={() => {
            commitReviewToWorkspace(reviewDraft);
            navigate('/app/recipe');
          }}
        >
          <span>Looks Good</span>
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </div>
    </motion.div>
  );
}
