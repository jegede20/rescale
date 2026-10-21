import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  ChefHat,
  ClipboardList,
  Repeat,
  Scale,
  Timer,
} from 'lucide-react';
import { formatQuantity } from '@/lib/scaler';

export function BentoGrid() {
  const [demoScale, setDemoScale] = useState<number>(2);
  const [demoMetric, setDemoMetric] = useState<boolean>(false);

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent mb-3">
            Precision Kitchen Toolkit
          </p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.15] text-text-primary">
            Every adjustment a cook needs, in one calm workspace.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Card 1: PARSE (Spans 7 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="lg:col-span-7 group rounded-lg border border-border bg-surface shadow-md hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 pb-4 bg-[#EEF2FF]/75 dark:bg-[#1E2235] border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/90 dark:bg-surface text-[#3B4CCA] shadow-xs">
                  <ClipboardList className="h-[28px] w-[28px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                  PARSE
                </span>
              </div>
              <div className="mt-5 rounded-md bg-surface p-3.5 border border-border shadow-xs">
                <p className="font-mono text-[13px] text-text-muted mb-2">
                  &ldquo;2½ cups all-purpose flour, sifted&rdquo;
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-sm bg-accent-soft px-2.5 py-1 font-mono text-[13px] font-medium text-accent">
                    qty: 2.5
                  </span>
                  <span className="rounded-sm bg-[#EEF2FF] dark:bg-surface-raised px-2.5 py-1 font-mono text-[13px] text-[#3B4CCA] dark:text-indigo-300">
                    unit: cups
                  </span>
                  <span className="rounded-sm bg-surface-raised px-2.5 py-1 text-[13px] font-medium text-text-primary">
                    all-purpose flour
                  </span>
                  <span className="rounded-sm bg-success-soft px-2.5 py-1 text-[12px] text-success">
                    prep: sifted
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[18px] font-semibold text-text-primary mb-1.5">
                Understand Every Recipe Format
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                Paste text, drop a URL, snap a photo, or speak it. We understand it all.
              </p>
            </div>
          </motion.div>

          {/* Card 2: SCALE (Spans 5 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
            className="lg:col-span-5 group rounded-lg border border-border bg-surface shadow-md hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 pb-4 bg-[#FEF3C7]/75 dark:bg-[#2A2210] border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/90 dark:bg-surface text-[#B45309] shadow-xs">
                  <Scale className="h-[28px] w-[28px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                  SCALE
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: '½x', val: 0.5 },
                    { label: '1x', val: 1 },
                    { label: '2x', val: 2 },
                    { label: '3x', val: 3 },
                  ].map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() => setDemoScale(pill.val)}
                      className={`rounded-full px-3.5 py-1.5 font-mono text-[13px] font-medium transition-all cursor-pointer ${
                        demoScale === pill.val
                          ? 'bg-accent text-white shadow-xs'
                          : 'bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-md bg-surface px-3.5 py-2.5 border border-border">
                  <span className="text-[14px] text-text-secondary">Rolled oats</span>
                  <span className="font-mono text-[15px] font-semibold text-accent">
                    {formatQuantity((2 / 3) * demoScale)} cups
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[18px] font-semibold text-text-primary mb-1.5">
                Smart Kitchen Fractions
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                Any serving size. Any amount.
              </p>
            </div>
          </motion.div>

          {/* Card 3: CONVERT (Spans 5 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
            className="lg:col-span-5 group rounded-lg border border-border bg-surface shadow-md hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 pb-4 bg-[#F5F3FF]/85 dark:bg-[#241E33] border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/90 dark:bg-surface text-[#6D28D9] shadow-xs">
                  <ArrowLeftRight className="h-[28px] w-[28px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                  CONVERT
                </span>
              </div>
              <div className="mt-5 rounded-md bg-surface p-3.5 border border-border flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[14px] font-semibold text-text-primary">
                    {demoMetric ? '240g flour · 175°C' : '2 cups flour · 350°F'}
                  </p>
                  <p className="text-[12px] text-text-muted">
                    Density-aware flour ≠ sugar ≠ butter
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoMetric((m) => !m)}
                  className="rounded-full bg-accent-soft px-3 py-1.5 font-mono text-[12px] font-semibold text-accent hover:bg-accent hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {demoMetric ? 'Metric → US' : 'US → Metric'}
                </button>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[18px] font-semibold text-text-primary mb-1.5">
                Density-True Unit Conversion
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                cups → grams. °F → °C. US ↔ Metric. Instant.
              </p>
            </div>
          </motion.div>

          {/* Card 4: SUBSTITUTE (Spans 7 cols on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, delay: 0.12, ease: 'easeOut' }}
            className="lg:col-span-7 group rounded-lg border border-border bg-surface shadow-md hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 pb-4 bg-[#ECFDF5]/85 dark:bg-[#10261B] border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/90 dark:bg-surface text-[#059669] shadow-xs">
                  <Repeat className="h-[28px] w-[28px]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                  SUBSTITUTE
                </span>
              </div>
              <div className="mt-5 rounded-md bg-surface p-3.5 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div>
                  <span className="text-[12px] uppercase tracking-wider text-text-muted block">
                    Missing Buttermilk (1 cup)
                  </span>
                  <span className="text-[15px] font-semibold text-text-primary">
                    1 cup milk + 1 tbsp lemon juice
                  </span>
                </div>
                <span className="inline-flex items-center self-start sm:self-center rounded-full bg-success-soft px-3 py-1 text-[12px] font-medium text-success">
                  One-tap swap ✓
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[18px] font-semibold text-text-primary mb-1.5">
                50+ Built-In Pantry Swaps
              </h3>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                No buttermilk? → milk + lemon juice. No problem.
              </p>
            </div>
          </motion.div>

          {/* Card 5: COOK MODE (Spans full width) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.14, ease: 'easeOut' }}
            className="md:col-span-2 lg:col-span-12 group rounded-lg border border-border bg-surface shadow-md hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 p-6 sm:p-8">
                <div className="inline-flex items-center gap-2.5 mb-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#FEF0E8] dark:bg-accent-soft text-accent">
                    <ChefHat className="h-[28px] w-[28px]" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-accent">
                    COOK MODE
                  </span>
                </div>
                <h3 className="font-display text-[32px] leading-tight text-text-primary mb-2">
                  One step at a time. Built-in timers. Just cook.
                </h3>
                <p className="text-[16px] text-text-secondary leading-relaxed max-w-md">
                  Distraction-free full-screen guidance readable from counter distance, with automatic step timers and screen wake lock built right in.
                </p>
              </div>

              <div className="lg:col-span-6 p-6 sm:p-8 bg-[#FEF0E8]/75 dark:bg-[#281A13] border-t lg:border-t-0 lg:border-l border-border/60">
                <div className="relative rounded-xl bg-surface p-6 border border-border shadow-sm overflow-hidden">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none select-none font-display text-[68px] leading-none text-border absolute top-2 left-4"
                  >
                    03
                  </span>
                  <div className="relative z-10 flex items-center justify-between text-[13px] font-mono text-text-secondary mb-3">
                    <span>Step 3 of 12</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-semibold text-accent">
                      <Timer className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>⏱ 4:30</span>
                    </span>
                  </div>
                  <p className="relative z-10 text-[18px] text-text-primary leading-relaxed">
                    Simmer the brown butter glaze gently for <span className="text-accent font-medium">4 minutes 30 seconds</span> until nutty and amber.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
