import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingIngredients } from '@/components/landing/FloatingIngredients';

export function NotFoundScreen() {
  return (
    <div className="hero-gradient relative min-h-screen flex items-center justify-center px-4 text-center overflow-hidden">
      <FloatingIngredients />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 max-w-md space-y-4"
      >
        <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-accent">
          404
        </span>
        <h1 className="font-display text-[48px] leading-[1.12] text-text-primary">
          Nothing cooking here.
        </h1>
        <p className="text-[17px] text-text-secondary">
          This page doesn&apos;t exist. Let&apos;s get back to the kitchen.
        </p>
        <div className="pt-3">
          <Button asChild size="lg">
            <Link to="/app">
              <span>Go to Rescale</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
