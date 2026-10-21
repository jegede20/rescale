import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-45 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-white font-semibold text-[15px] rounded-md shadow-accent hover:bg-accent-hover hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:shadow-sm',
        ghost:
          'bg-transparent border-[1.5px] border-border text-text-primary font-medium text-[15px] rounded-md hover:bg-surface-raised hover:-translate-y-[1px] active:translate-y-0',
        subtle:
          'bg-transparent text-text-secondary font-medium text-[14px] rounded-md hover:bg-surface-raised hover:text-text-primary',
        danger:
          'bg-transparent border-[1.5px] border-red-500/35 text-red-600 dark:text-red-400 font-medium text-[15px] rounded-md hover:bg-red-500/10 hover:-translate-y-[1px] active:translate-y-0',
      },
      size: {
        default: 'px-[24px] py-[12px]',
        ghostDefault: 'px-[23px] py-[11px]',
        sm: 'px-3.5 py-2 text-[14px]',
        lg: 'px-7 py-3.5 text-[16px]',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const resolvedSize =
      size ?? (variant === 'ghost' || variant === 'danger' ? 'ghostDefault' : 'default');
    return (
      <Comp
        className={cn(buttonVariants({ variant, size: resolvedSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
