import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { cn } from './utils';

interface ThemePillToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemePillToggle({ isDark, onToggle }: ThemePillToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-[36px] w-[72px] shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-border bg-surface-raised p-[3px] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <span className="pointer-events-none flex w-full items-center justify-between px-1.5 text-text-muted">
        <Sun className="h-3.5 w-3.5" strokeWidth={1.5} />
        <Moon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 32, duration: 0.25 }}
        className={cn(
          'absolute top-[2.5px] flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white text-[#1A1917] shadow-sm',
          isDark ? 'left-[39px]' : 'left-[3px]'
        )}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-[#C4622D]" strokeWidth={1.5} />
        ) : (
          <Sun className="h-4 w-4 text-[#C4622D]" strokeWidth={1.5} />
        )}
      </motion.span>
    </button>
  );
}

interface DualPillToggleProps<T extends string> {
  options: [{ value: T; label: string }, { value: T; label: string }];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function DualPillToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: DualPillToggleProps<T>) {
  const isRight = value === options[1].value;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-grid h-[36px] min-w-[128px] grid-cols-2 items-center rounded-full border-[1.5px] border-border bg-surface-raised p-[3px] select-none',
        className
      )}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        className={cn(
          'pointer-events-none absolute top-[2px] bottom-[2px] w-[calc(50%-3px)] rounded-full bg-accent shadow-xs',
          isRight ? 'left-[calc(50%+1px)]' : 'left-[2px]'
        )}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex h-full items-center justify-center rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer',
              active ? 'text-white font-semibold' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
