import * as React from 'react';
import { cn } from './utils';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface text-text-primary shadow-sm',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export { Card };
