import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './button';

interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-lg bg-surface/85 backdrop-blur-[2px] p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-sans text-[15px] font-medium text-text-primary">
        {message}
      </p>
    </div>
  );
}

interface InlineErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onEnterManually?: () => void;
}

export function InlineErrorBanner({
  message,
  onRetry,
  onEnterManually,
}: InlineErrorBannerProps) {
  return (
    <div
      role="alert"
      className="mt-4 flex flex-col gap-3 rounded-md border border-red-500/25 bg-red-500/10 p-4 text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-2.5 text-[14px] font-medium">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="border-red-500/35 text-red-700 dark:text-red-300 hover:bg-red-500/15"
          >
            Try again
          </Button>
        )}
        {onEnterManually && (
          <button
            type="button"
            onClick={onEnterManually}
            className="text-[14px] font-medium underline underline-offset-4 hover:opacity-80 cursor-pointer"
          >
            Enter manually
          </button>
        )}
      </div>
    </div>
  );
}
