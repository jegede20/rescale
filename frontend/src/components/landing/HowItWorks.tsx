import { motion } from 'framer-motion';
import { ClipboardList, SlidersHorizontal, ChefHat } from 'lucide-react';

const STEPS = [
  {
    numeral: '①',
    bgNumeral: '01',
    action: 'PASTE',
    description: 'Drop your recipe text, a blog URL, a photo, or speak it',
    icon: ClipboardList,
    preview: (
      <div className="mt-5 rounded-md border border-border bg-surface-raised p-3.5 text-left font-mono text-[12px] text-text-secondary space-y-1.5">
        <div className="text-text-primary font-semibold font-sans text-[13px]">
          Lemon Ricotta Pancakes · Serves 4
        </div>
        <div>• 1½ cups all-purpose flour</div>
        <div>• ¾ cup ricotta cheese</div>
        <div className="text-accent">✓ Sections &amp; servings detected</div>
      </div>
    ),
  },
  {
    numeral: '②',
    bgNumeral: '02',
    action: 'ADJUST',
    description: 'Scale servings, convert units, swap ingredients',
    icon: SlidersHorizontal,
    preview: (
      <div className="mt-5 rounded-md border border-border bg-surface-raised p-3.5 text-left space-y-2">
        <div className="flex items-center justify-between text-[12px] font-mono">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-white">2x</span>
          <span className="text-text-secondary">US → Metric</span>
        </div>
        <div className="flex items-center justify-between text-[13px] pt-1 border-t border-border">
          <span className="text-text-primary">All-purpose flour</span>
          <span className="font-mono font-semibold text-accent">360g</span>
        </div>
      </div>
    ),
  },
  {
    numeral: '③',
    bgNumeral: '03',
    action: 'COOK',
    description: 'Step-by-step with auto timers',
    icon: ChefHat,
    preview: (
      <div className="mt-5 rounded-md border border-border bg-surface-raised p-3.5 text-left space-y-2">
        <div className="flex items-center justify-between text-[12px] font-mono text-text-secondary">
          <span>Step 4 of 6</span>
          <span className="text-accent font-semibold">03:00 ▶</span>
        </div>
        <p className="text-[13px] text-text-primary">
          Cook until golden bubbles form on edges, about 3 minutes.
        </p>
      </div>
    ),
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 border-y border-border bg-surface/60">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center max-w-xl mx-auto mb-16"
        >
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent mb-3">
            How It Works
          </p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.15] text-text-primary">
            From messy recipe to plated dish in three quiet steps.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.action}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: 'easeOut' }}
                className="relative rounded-lg border border-border bg-surface p-6 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none select-none font-display text-[84px] leading-none text-border/80 absolute right-4 top-2"
                >
                  {step.bgNumeral}
                </span>
                <div className="relative z-10">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent mb-5">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-mono text-[15px] text-accent font-semibold">
                      {step.numeral}
                    </span>
                    <h3 className="text-[20px] font-semibold tracking-tight text-text-primary">
                      {step.action}
                    </h3>
                  </div>
                  <p className="text-[15px] text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="relative z-10">{step.preview}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
