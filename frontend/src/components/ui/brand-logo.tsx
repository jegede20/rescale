import { useId } from 'react';
import { cn } from './utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function BrandLogo({ className, size = 'md' }: BrandLogoProps) {
  const maskId = useId();
  const markDim = size === 'sm' ? 'h-[21px] w-[21px]' : 'h-[26px] w-[26px]';
  const textSize = size === 'sm' ? 'text-[23px]' : 'text-[29px]';

  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('shrink-0 text-text-primary', markDim)}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle cx="12" cy="16.75" r="3.15" fill="black" />
          </mask>
        </defs>

        {/* Architectural Countertop Kitchen Scale Silhouette with True Negative-Space Dial */}
        <g mask={`url(#${maskId})`} fill="currentColor">
          {/* Weighing Bowl */}
          <path d="M4 5.2C4 4.87 4.27 4.6 4.6 4.6H19.4C19.73 4.6 20 4.87 20 5.2C20 8.1 17.65 10.1 14.75 10.1H9.25C6.35 10.1 4 8.1 4 5.2Z" />
          {/* Pedestal Stem */}
          <rect x="10.5" y="9.7" width="3" height="2.4" />
          {/* Cast-Iron Scale Housing */}
          <path d="M6.65 12.1C6.8 11.55 7.3 11.2 7.87 11.2H16.13C16.7 11.2 17.2 11.55 17.35 12.1L19.15 20.45C19.32 21.24 18.72 22 17.91 22H6.09C5.28 22 4.68 21.24 4.85 20.45L6.65 12.1Z" />
        </g>

        {/* Precision Dial Needle in Accent Spice */}
        <path
          d="M12 17.15L13.85 15.05"
          stroke="var(--color-accent)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.15" r="0.85" fill="var(--color-accent)" />
      </svg>

      <span
        className={cn(
          'font-display leading-none tracking-[-0.015em] text-text-primary translate-y-[1px]',
          textSize
        )}
      >
        Rescale
      </span>
    </span>
  );
}
