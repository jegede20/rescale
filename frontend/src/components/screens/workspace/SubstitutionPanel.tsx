import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lookupSubstitutions } from '@/lib/parser-client';
import { IngredientItem, SubstitutionOption } from '@/lib/types';

interface SubstitutionPanelProps {
  ingredient: IngredientItem | null;
  onClose: () => void;
  onApplySubstitution: (item: IngredientItem, option: SubstitutionOption) => void;
}

export function SubstitutionPanel({
  ingredient,
  onClose,
  onApplySubstitution,
}: SubstitutionPanelProps) {
  const result = ingredient ? lookupSubstitutions(ingredient.ingredient) : null;

  return (
    <AnimatePresence>
      {ingredient && result && (
        <>
          {/* Semi-transparent Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="no-print fixed inset-0 z-50 bg-black/30"
          />

          {/* Desktop 360px Right Panel / Mobile Full-Screen Sheet */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Substitution Panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="no-print fixed inset-y-0 right-0 z-50 flex w-full md:w-[70%] lg:w-[360px] flex-col justify-between bg-surface border-l border-border shadow-lg md:rounded-l-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="font-sans text-[18px] font-semibold text-text-primary">
                  Substitution Panel
                </h2>
                <p className="mt-0.5 text-[14px] text-text-secondary">
                  Replacing:{' '}
                  <span className="font-medium text-text-primary">
                    {ingredient.ingredient}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close substitution panel"
                className="rounded-md p-1.5 text-text-secondary hover:bg-surface-raised hover:text-text-primary cursor-pointer"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Substitution Option Cards */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {result.options.map((opt) => (
                <div
                  key={opt.substitute}
                  className="rounded-lg border border-border bg-surface-raised/65 p-4 space-y-2.5 transition-colors hover:border-accent/50"
                >
                  <div className="font-sans text-[16px] font-semibold text-text-primary">
                    {opt.substitute}
                  </div>
                  <div className="rounded-sm bg-surface px-2.5 py-1.5 font-mono text-[13px] font-medium text-accent border border-border/80">
                    {opt.ratio}
                  </div>
                  <p className="text-[13px] text-text-secondary leading-relaxed">
                    {opt.note}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onApplySubstitution(ingredient, opt)}
                    className="w-full"
                  >
                    <span>Use This</span>
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border p-4 bg-surface">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full"
              >
                Keep Original
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
