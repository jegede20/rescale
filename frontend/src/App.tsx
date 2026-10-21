import { useEffect } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppShell } from '@/components/app/AppShell';
import { ToastViewport } from '@/components/ui/toast-viewport';
import { RescaleProvider, useRescale } from '@/context/RescaleContext';
import { LandingScreen } from '@/components/screens/landing';
import { InputScreen } from '@/components/screens/input';
import { ParseReviewScreen } from '@/components/screens/review';
import { RecipeWorkspaceScreen } from '@/components/screens/workspace';
import { CookModeScreen } from '@/components/screens/cook';
import { SavedRecipesScreen } from '@/components/screens/saved';
import { SettingsScreen } from '@/components/screens/settings';
import { NotFoundScreen } from '@/components/screens/not-found';

function AppShellOutlet() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function GlobalToasts() {
  const { toasts } = useRescale();
  return <ToastViewport toasts={toasts} />;
}

export default function App() {
  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '';
    if (apiBase) {
      fetch(`${apiBase}/`, { method: 'GET' }).catch(() => {});
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <RescaleProvider>
        <BrowserRouter>
          <Routes>
            {/* Screen 1: Public Marketing Landing Page */}
            <Route path="/" element={<LandingScreen />} />

            {/* Screen 5: Full-Screen Distraction-Free Cook Mode (no navbar/sidebar) */}
            <Route path="/app/recipe/cook" element={<CookModeScreen />} />

            {/* App Shell Screens */}
            <Route element={<AppShellOutlet />}>
              <Route path="/app" element={<InputScreen />} />
              <Route path="/app/review" element={<ParseReviewScreen />} />
              <Route path="/app/recipe" element={<RecipeWorkspaceScreen />} />
              <Route path="/app/saved" element={<SavedRecipesScreen />} />
              <Route path="/app/settings" element={<SettingsScreen />} />
            </Route>

            {/* Branded 404 Page */}
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
          <GlobalToasts />
        </BrowserRouter>
      </RescaleProvider>
    </MotionConfig>
  );
}
