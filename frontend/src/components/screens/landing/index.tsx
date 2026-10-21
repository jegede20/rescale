import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { FloatingIngredients } from '@/components/landing/FloatingIngredients';
import { BentoGrid } from '@/components/landing/BentoGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureDeepDive } from '@/components/landing/FeatureDeepDive';
import { formatQuantity } from '@/lib/scaler';

export function LandingScreen() {
  const [scrolled, setScrolled] = useState(false);
  const [heroScale, setHeroScale] = useState(1);
  const [heroMetric, setHeroMetric] = useState(false);
  const [infoModal, setInfoModal] = useState<'about' | 'privacy' | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const heroIngredients = [
    { name: 'All-purpose flour, sifted', cups: 2.5, grams: 300, unit: 'cups' },
    { name: 'Unsalted butter, browned', cups: 1, grams: 227, unit: 'cup' },
    { name: 'Packed brown sugar', cups: 0.75, grams: 160, unit: 'cup' },
    { name: 'Dark chocolate chunks', cups: 1.5, grams: 255, unit: 'cups' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col">
      {/* Sticky Marketing Navbar */}
      <header
        className={`sticky top-0 z-50 h-16 transition-all duration-200 ${
          scrolled
            ? 'bg-surface/95 backdrop-blur-md border-b border-border shadow-xs'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="transition-opacity hover:opacity-85"
          >
            <BrandLogo />
          </Link>
          <Button asChild size="sm">
            <Link to="/app">
              <span>Open App</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-gradient relative -mt-16 pt-28 pb-24 px-4 sm:px-6 overflow-hidden border-b border-border/70">
        <FloatingIngredients />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center rounded-full border border-border bg-surface/80 px-3.5 py-1 font-mono text-[12px] font-medium tracking-wide text-accent shadow-xs mb-5">
            Your recipe. Perfectly sized.
          </span>
          <h1 className="font-display text-[50px] sm:text-[72px] font-bold leading-[1.06] tracking-tight text-text-primary">
            Cook any recipe at any scale.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] font-sans text-[18px] leading-[1.6] text-text-secondary">
            Paste, scale, convert &amp; cook any recipe — in seconds. No account needed.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <Button asChild size="lg">
              <Link to="/app">Start Rescaling — It&apos;s Free</Link>
            </Button>
            <span className="mt-3 text-[12px] text-text-muted">
              No account. No install. Just cook.
            </span>
          </div>
        </motion.div>

        {/* Layer 3: 3D Tilted Interactive App UI Mockup Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
          className="relative z-10 mx-auto mt-14 max-w-3xl"
        >
          <div className="hero-mockup-3d rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted block">
                  LIVE INTERACTIVE PREVIEW · SERVES {Math.round(8 * heroScale)}
                </span>
                <h2 className="font-display text-[26px] leading-snug text-text-primary">
                  Brown Butter Chocolate Chip Cookies
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-full bg-surface-raised p-1 border border-border">
                  {[
                    { label: '½x', val: 0.5 },
                    { label: '1x', val: 1 },
                    { label: '2x', val: 2 },
                    { label: '3x', val: 3 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setHeroScale(item.val)}
                      className={`rounded-full px-3 py-1 font-mono text-[13px] font-medium transition-colors cursor-pointer ${
                        heroScale === item.val
                          ? 'bg-accent text-white'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setHeroMetric((v) => !v)}
                  className="rounded-full border border-border bg-surface-raised px-3.5 py-1.5 font-mono text-[12px] font-medium text-text-primary hover:border-accent cursor-pointer"
                >
                  {heroMetric ? 'Metric (g / °C)' : 'US (cups / °F)'}
                </button>
              </div>
            </div>

            <div className="mt-3 divide-y divide-border">
              {heroIngredients.map((item) => (
                <div
                  key={item.name}
                  className="grid grid-cols-12 items-center py-2.5 text-[15px]"
                >
                  <div className="col-span-3 sm:col-span-2 font-mono font-medium text-text-primary">
                    {heroMetric
                      ? `${Math.round(item.grams * heroScale)}`
                      : formatQuantity(item.cups * heroScale)}
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className="inline-block rounded-sm bg-accent-soft px-2 py-0.5 font-mono text-[13px] font-medium text-accent">
                      {heroMetric ? 'g' : item.unit}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-8 text-text-primary">
                    {item.name}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-md bg-warning-soft px-3 py-2 mt-2 text-[14px] text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>Flaky sea salt, to taste — unscalable</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-md bg-surface-raised px-4 py-2.5 text-[13px] text-text-secondary">
              <span>
                Oven preheat auto-converted:{' '}
                <strong className="font-mono text-accent">
                  {heroMetric ? '175°C' : '350°F'}
                </strong>
              </span>
              <Link
                to="/app/recipe"
                className="font-medium text-accent hover:underline"
              >
                Open full workspace →
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Asymmetric Bento Feature Grid */}
      <BentoGrid />

      {/* 3-Step Editorial How It Works */}
      <HowItWorks />

      {/* 5 Feature Deep-Dive Cards */}
      <FeatureDeepDive />

      {/* Footer CTA Section */}
      <section className="hero-gradient relative py-24 px-4 sm:px-6 border-t border-border overflow-hidden text-center">
        <div className="relative z-10 mx-auto max-w-xl">
          <h2 className="font-display text-[44px] sm:text-[52px] leading-[1.12] text-text-primary">
            Ready to Rescale?
          </h2>
          <div className="mt-7 flex flex-col items-center">
            <Button asChild size="lg">
              <Link to="/app">Open the App — It&apos;s Free</Link>
            </Button>
            <span className="mt-3 text-[12px] text-text-muted">
              No account. No install. Just cook.
            </span>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-border bg-surface py-8 px-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-text-secondary">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-border">·</span>
            <span>Rescale © 2025</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setInfoModal('about')}
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-text-primary transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <a
              href="https://github.com/jegede20/rescale"
              target="_blank"
              rel="noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      <Dialog
        open={infoModal !== null}
        onOpenChange={(open) => !open && setInfoModal(null)}
      >
        <DialogContent>
          <DialogTitle>
            {infoModal === 'about' ? 'About Rescale' : 'Privacy First'}
          </DialogTitle>
          <DialogDescription>
            {infoModal === 'about'
              ? 'Rescale is a precision recipe scaler, unit converter, ingredient substitution tool, and distraction-free cook mode built directly for home cooks — with zero sign-ups or clutter.'
              : 'Rescale never asks for an account, email address, or login. Every saved recipe and preference lives exclusively in your browser LocalStorage on your own device.'}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
