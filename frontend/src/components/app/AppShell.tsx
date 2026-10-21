import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ClipboardList,
  FolderOpen,
  Settings,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/brand-logo';
import { ThemePillToggle } from '@/components/ui/pill-toggle';
import { cn } from '@/components/ui/utils';
import { useRescale } from '@/context/RescaleContext';
import { formatTimerClock } from '@/hooks/useTimer';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  matchPaths: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/app',
    label: 'Input',
    icon: ClipboardList,
    matchPaths: ['/app', '/app/review', '/app/recipe'],
  },
  {
    to: '/app/saved',
    label: 'Saved',
    icon: FolderOpen,
    matchPaths: ['/app/saved'],
  },
  {
    to: '/app/settings',
    label: 'Settings',
    icon: Settings,
    matchPaths: ['/app/settings'],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDark, toggleTheme, savedRecipes, timers } = useRescale();
  const location = useLocation();

  const runningTimer = timers.find((t) => t.status === 'running');

  const isItemActive = (item: NavItem) => {
    if (item.to === '/app') {
      return (
        location.pathname === '/app' ||
        location.pathname.startsWith('/app/review') ||
        location.pathname.startsWith('/app/recipe')
      );
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-primary no-print">
      {/* Sticky Top App Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <Link
          to="/app"
          className="transition-opacity hover:opacity-85"
        >
          <BrandLogo />
        </Link>

        <div className="flex items-center gap-3">
          {runningTimer && (
            <Link
              to="/app/recipe/cook"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 font-mono text-[13px] font-medium text-accent transition-transform hover:-translate-y-[1px]"
              title="Return to active Cook Mode timer"
            >
              <Timer className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.5} />
              <span>{formatTimerClock(runningTimer.remainingSeconds)}</span>
            </Link>
          )}
          <ThemePillToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Body with Sidebar (tablet/desktop) + Main Content */}
      <div className="flex flex-1">
        {/* Tablet Rail (64px) & Desktop Full Sidebar (220px) */}
        <aside
          aria-label="Primary app navigation"
          className="hidden md:flex md:w-[64px] lg:w-[220px] shrink-0 flex-col justify-between border-r border-border bg-surface sticky top-16 h-[calc(100vh-4rem)] py-5 px-2 lg:px-3"
        >
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={cn(
                    'flex items-center justify-center lg:justify-between rounded-md px-2.5 lg:px-3.5 py-2.5 text-[15px] font-medium transition-colors duration-150',
                    active
                      ? 'bg-accent-soft text-accent font-semibold'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                  {item.label === 'Saved' && savedRecipes.length > 0 && (
                    <span className="hidden lg:inline-flex items-center justify-center rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[12px] text-text-secondary">
                      {savedRecipes.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="px-2 text-center lg:text-left">
            <span className="hidden lg:inline font-mono text-[12px] text-text-muted">
              Rescale v1.0
            </span>
            <span className="lg:hidden font-mono text-[10px] text-text-muted">
              v1.0
            </span>
          </div>
        </aside>

        {/* Scrollable Main Content */}
        <main className="flex-1 w-full min-w-0 p-4 pb-24 md:p-6 md:pb-12">
          <div className="mx-auto w-full max-w-[960px]">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-3 border-t border-border bg-surface md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {active && (
                <span className="text-[11px] font-medium leading-none">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
