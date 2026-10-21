import { AnimatePresence, motion } from 'framer-motion';
import { ToastItem } from '@/lib/types';

interface ToastViewportProps {
  toasts: ToastItem[];
}

export function ToastViewport({ toasts }: ToastViewportProps) {
  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed bottom-6 left-1/2 z-[80] flex -translate-x-1/2 flex-col items-center gap-2.5 px-4 w-full max-w-md"
    >
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, 2).map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto rounded-md bg-text-primary px-5 py-3 text-center font-sans text-[14px] font-medium text-bg shadow-lg"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
