import { motion } from 'framer-motion';
import { Apple, Camera, Link2, Mic, Sparkles } from 'lucide-react';

export function FeatureDeepDive() {
  const features = [
    {
      badge: '📸 Optical Recognition',
      title: 'Snap a Cookbook Page',
      body: 'Point your camera. We extract the recipe instantly with OCR.',
      icon: Camera,
      visual: (
        <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <div className="mx-auto max-w-[290px] rounded-2xl border-2 border-border bg-surface p-4 relative">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-3">
              <span>CAMERA · OCR</span>
              <span className="text-accent">SCANNING</span>
            </div>
            <div className="relative rounded-md border border-dashed border-accent/60 bg-accent-soft/25 p-3.5 space-y-1.5 font-mono text-[12px]">
              <div className="text-text-primary font-semibold font-sans">
                Sunday Brioche Loaf
              </div>
              <div className="text-text-secondary">500g bread flour</div>
              <div className="text-text-secondary">6 large eggs, cold</div>
              <div className="text-text-secondary">250g unsalted butter</div>
              <div className="h-[2px] w-full bg-accent/70 mt-2" />
            </div>
          </div>
        </div>
      ),
    },
    {
      badge: '🔗 Schema.org Scraper',
      title: 'Paste a Blog URL — Skip the Life Story',
      body: 'Drop a link. We strip the 2000-word intro and grab just the recipe.',
      icon: Link2,
      visual: (
        <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2.5">
            <Link2 className="h-4 w-4 text-accent shrink-0" strokeWidth={1.5} />
            <span className="font-mono text-[12px] text-text-secondary truncate">
              https://autumnbakingjournal.com/best-cinnamon-rolls
            </span>
          </div>
          <div className="rounded-md border border-border bg-surface p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="line-through text-text-muted">
                1,840 words of ad banners &amp; travel memories
              </span>
              <span className="font-mono text-[11px] text-success font-medium">
                STRIPPED
              </span>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-[13px]">
              <span className="font-medium text-text-primary">
                11 ingredients · 7 clean steps
              </span>
              <span className="font-mono text-accent">0.4s</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      badge: '🎙️ Voice Dictation',
      title: 'Dictate a Recipe',
      body: "Speak your grandmother's recipe. We'll write it down for you.",
      icon: Mic,
      visual: (
        <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-center gap-1.5 h-14 rounded-md bg-surface border border-border px-4">
            {[28, 46, 34, 62, 48, 22, 54, 40, 66, 30, 44, 24].map((h, idx) => (
              <motion.span
                key={idx}
                animate={{ height: [`${Math.max(10, h * 0.45)}%`, `${h}%`, `${Math.max(12, h * 0.5)}%`] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: idx * 0.08,
                  ease: 'easeInOut',
                }}
                className="w-1.5 rounded-full bg-accent inline-block"
              />
            ))}
          </div>
          <p className="rounded-md bg-surface border border-border p-3 text-[13px] text-text-secondary italic">
            &ldquo;Two and a half cups sifted flour, one cup warm buttermilk, a pinch of nutmeg...&rdquo;
          </p>
        </div>
      ),
    },
    {
      badge: '🤖 Groq GPT-OSS 120B',
      title: 'AI-Powered Parsing',
      body: "Messy format? Unusual layout? Our AI handles what parsers can't.",
      icon: Sparkles,
      visual: (
        <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm space-y-3">
          <div className="rounded-md bg-surface p-3 border border-border text-[12px] text-text-muted">
            &ldquo;mix a couple handfuls of flour (~250g) w/ 3 eggs &amp; splash olive oil, knead 10m&rdquo;
          </div>
          <div className="rounded-md bg-surface p-3.5 border border-accent/30 font-mono text-[12px] space-y-1">
            <div className="text-accent font-semibold">{'{'} &quot;servings&quot;: 4,</div>
            <div className="text-text-primary pl-3">
              &quot;ingredients&quot;: [250g flour, 3 eggs, olive oil],
            </div>
            <div className="text-text-secondary pl-3">
              &quot;steps&quot;: [&quot;Knead dough for 10 minutes.&quot;] {'}'}
            </div>
          </div>
        </div>
      ),
    },
    {
      badge: '📊 USDA FoodData Central',
      title: 'Nutrition at a Glance',
      body: 'Calories, protein, carbs, fat — per serving, auto-calculated.',
      icon: Apple,
      visual: (
        <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
          <div className="flex items-center gap-5 rounded-md bg-surface p-4 border border-border">
            <svg width="78" height="78" viewBox="0 0 80 80" className="shrink-0">
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="9"
              />
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="9"
                strokeDasharray="95 190"
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="#4A7C59"
                strokeWidth="9"
                strokeDasharray="45 190"
                strokeDashoffset="-98"
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[13px] w-full">
              <div>
                <span className="text-text-muted block text-[11px]">Calories</span>
                <span className="font-mono font-semibold text-text-primary">340 kcal</span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Protein</span>
                <span className="font-mono font-semibold text-success">9.4g</span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Carbs</span>
                <span className="font-mono font-semibold text-accent">42.0g</span>
              </div>
              <div>
                <span className="text-text-muted block text-[11px]">Fat</span>
                <span className="font-mono font-semibold text-warning">14.8g</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent mb-3">
            Built For Real Kitchens
          </p>
          <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.15] text-text-primary">
            Thoughtful details behind every measurement.
          </h2>
        </div>

        {features.map((feat, idx) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="grid grid-cols-1 md:grid-cols-12 items-center gap-8 rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md"
          >
            <div
              className={`md:col-span-6 space-y-3 ${
                idx % 2 === 1 ? 'md:order-2' : ''
              }`}
            >
              <span className="inline-block rounded-full bg-accent-soft px-3 py-1 font-mono text-[12px] font-medium text-accent">
                {feat.badge}
              </span>
              <h3 className="font-display text-[32px] leading-[1.18] text-text-primary">
                {feat.title}
              </h3>
              <p className="text-[17px] text-text-secondary leading-relaxed">
                {feat.body}
              </p>
            </div>
            <div
              className={`md:col-span-6 ${
                idx % 2 === 1 ? 'md:order-1' : ''
              }`}
            >
              {feat.visual}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
