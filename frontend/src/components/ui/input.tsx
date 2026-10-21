import * as React from 'react';
import { cn } from './utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'w-full rounded-md border-[1.5px] border-border bg-surface-raised px-4 py-3 font-sans text-[16px] text-text-primary placeholder:text-text-muted transition-colors duration-150 focus:border-accent focus:outline-none focus:shadow-sm disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const AutoGrowTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, onChange, value, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(180, el.scrollHeight)}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      value={value}
      onChange={(e) => {
        resize();
        onChange?.(e);
      }}
      className={cn(
        'w-full min-h-[180px] resize-none overflow-hidden rounded-md border-[1.5px] border-border bg-surface-raised px-4 py-3 font-sans text-[16px] leading-relaxed text-text-primary placeholder:text-text-muted transition-colors duration-150 focus:border-accent focus:outline-none focus:shadow-sm',
        className
      )}
      {...props}
    />
  );
});
AutoGrowTextarea.displayName = 'AutoGrowTextarea';
