import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useTimerManager } from '@/hooks/useTimer';
import { makeId } from '@/lib/parser-client';
import {
  AppSettings,
  CookTimer,
  IngredientItem,
  InputMode,
  NutritionMacros,
  RecipeData,
  SavedRecipe,
  ToastItem,
} from '@/lib/types';

export interface ReviewDraft {
  title: string;
  servings: number;
  ingredients: IngredientItem[];
  steps: string[];
  rawText: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  preferredUnitSystem: 'us',
  defaultScale: 1,
  temperatureUnit: 'F',
  timerSound: true,
};

const DEFAULT_ACTIVE_RECIPE: RecipeData = {
  id: 'sample-brown-butter-cookies',
  title: 'Brown Butter Chocolate Chip Cookies',
  originalServings: 8,
  targetServings: 8,
  scaleMultiplier: 1,
  unitSystem: 'us',
  tempUnit: 'F',
  ingredients: [
    {
      id: 'ing-1',
      quantity: 2.5,
      unit: 'cups',
      ingredient: 'all-purpose flour',
      preparation: 'sifted',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-2',
      quantity: 1,
      unit: 'tsp',
      ingredient: 'baking soda',
      preparation: '',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-3',
      quantity: 1,
      unit: 'cup',
      ingredient: 'unsalted butter',
      preparation: 'browned and cooled',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-4',
      quantity: 0.75,
      unit: 'cup',
      ingredient: 'brown sugar',
      preparation: 'packed',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-5',
      quantity: 0.5,
      unit: 'cup',
      ingredient: 'granulated sugar',
      preparation: '',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-6',
      quantity: 2,
      unit: '',
      ingredient: 'large eggs',
      preparation: 'room temperature',
      unscalable: false,
      confidence: 0.96,
    },
    {
      id: 'ing-7',
      quantity: 2,
      unit: 'tsp',
      ingredient: 'vanilla extract',
      preparation: '',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-8',
      quantity: 0.25,
      unit: 'cup',
      ingredient: 'buttermilk',
      preparation: '',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-9',
      quantity: 1.5,
      unit: 'cups',
      ingredient: 'chocolate chips',
      preparation: '',
      unscalable: false,
      confidence: 0.99,
    },
    {
      id: 'ing-10',
      quantity: null,
      unit: '',
      ingredient: 'flaky sea salt',
      preparation: 'to taste',
      unscalable: true,
      confidence: 0.95,
    },
    {
      id: 'ing-11',
      quantity: null,
      unit: 'pinch',
      ingredient: 'nutmeg',
      preparation: '',
      unscalable: true,
      confidence: 0.95,
    },
  ],
  steps: [
    'Preheat oven to 350°F and line two baking sheets with parchment paper.',
    'Whisk the all-purpose flour, baking soda, and nutmeg together in a medium bowl.',
    'Whisk the unsalted butter, brown sugar, and granulated sugar together for 2 minutes until glossy and smooth.',
    'Beat in the large eggs, vanilla extract, and buttermilk until emulsified.',
    'Fold in the flour mixture until just combined, then fold in the chocolate chips. Chill dough for 20 minutes.',
    'Scoop rounds onto sheets and bake for 12 minutes until edges are golden brown, then rest on the pan for 5 minutes before serving with flaky sea salt.',
  ],
};

interface RescaleContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  rawInputText: string;
  setRawInputText: (val: string) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  reviewDraft: ReviewDraft;
  setReviewDraft: React.Dispatch<React.SetStateAction<ReviewDraft>>;

  activeRecipe: RecipeData;
  setActiveRecipe: React.Dispatch<React.SetStateAction<RecipeData>>;
  commitReviewToWorkspace: (draft: ReviewDraft) => void;

  savedRecipes: SavedRecipe[];
  saveCurrentRecipe: () => void;
  openSavedRecipe: (recipe: SavedRecipe) => void;
  deleteSavedRecipe: (id: string) => void;
  rateCurrentRecipe: (stars: number) => void;
  clearAllSavedRecipes: () => void;

  cookStepIndex: number;
  setCookStepIndex: React.Dispatch<React.SetStateAction<number>>;
  timers: CookTimer[];
  flashAlertStep: string | null;
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resetTimer: (id: string) => void;

  nutritionCache: Record<string, NutritionMacros>;
  cacheNutrition: (key: string, macros: NutritionMacros) => void;

  toasts: ToastItem[];
  pushToast: (message: string) => void;
}

const RescaleContext = createContext<RescaleContextValue | null>(null);

export function RescaleProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('rescale_theme', 'light');
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'rescale_settings',
    DEFAULT_SETTINGS
  );
  const [rawInputText, setRawInputText] = useLocalStorage<string>('rescale_raw_input', '');
  const [inputMode, setInputMode] = useLocalStorage<InputMode>(
    'rescale_input_mode',
    'paste'
  );
  const [reviewDraft, setReviewDraft] = useLocalStorage<ReviewDraft>(
    'rescale_review_draft',
    {
      title: DEFAULT_ACTIVE_RECIPE.title,
      servings: DEFAULT_ACTIVE_RECIPE.originalServings,
      ingredients: DEFAULT_ACTIVE_RECIPE.ingredients,
      steps: DEFAULT_ACTIVE_RECIPE.steps,
      rawText: '',
    }
  );
  const [activeRecipe, setActiveRecipe] = useLocalStorage<RecipeData>(
    'rescale_active_recipe',
    DEFAULT_ACTIVE_RECIPE
  );
  const [savedRecipes, setSavedRecipes] = useLocalStorage<SavedRecipe[]>(
    'rescale_saved_recipes',
    []
  );
  const [cookStepIndex, setCookStepIndex] = useLocalStorage<number>(
    'rescale_cook_step',
    0
  );
  const [nutritionCache, setNutritionCache] = useLocalStorage<
    Record<string, NutritionMacros>
  >('rescale_nutrition_cache', {});

  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  const pushToast = useCallback((message: string) => {
    const id = makeId();
    setToastQueue((prev) => [...prev, { id, message }]);
  }, []);

  // Auto-dismiss oldest visible toast every 3 seconds
  useEffect(() => {
    if (toastQueue.length === 0) return;
    const currentFirstId = toastQueue[0].id;
    const timer = window.setTimeout(() => {
      setToastQueue((prev) => prev.filter((item) => item.id !== currentFirstId));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [toastQueue]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [setSettings]
  );

  const commitReviewToWorkspace = useCallback(
    (draft: ReviewDraft) => {
      const baseServings = Math.max(1, draft.servings || 4);
      const mult = settings.defaultScale || 1;
      const targetServings = Math.max(1, Math.round(baseServings * mult * 10) / 10);
      const nextRecipe: RecipeData = {
        id: makeId(),
        title: draft.title || 'Untitled Recipe',
        originalServings: baseServings,
        targetServings,
        scaleMultiplier: mult,
        unitSystem: settings.preferredUnitSystem,
        tempUnit: settings.temperatureUnit,
        ingredients: draft.ingredients,
        steps: draft.steps,
        rawText: draft.rawText,
      };
      setActiveRecipe(nextRecipe);
      setCookStepIndex(0);
    },
    [settings, setActiveRecipe, setCookStepIndex]
  );

  const saveCurrentRecipe = useCallback(() => {
    setSavedRecipes((prev) => {
      const entry: SavedRecipe = {
        ...activeRecipe,
        savedAt: Date.now(),
      };
      const existingIdx = prev.findIndex(
        (r) => r.id === activeRecipe.id || r.title.toLowerCase() === activeRecipe.title.toLowerCase()
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = entry;
        return copy;
      }
      return [entry, ...prev];
    });
    pushToast('Recipe saved locally 💾');
  }, [activeRecipe, setSavedRecipes, pushToast]);

  const openSavedRecipe = useCallback(
    (recipe: SavedRecipe) => {
      const { savedAt: _savedAt, ...rest } = recipe;
      setActiveRecipe(rest);
      setCookStepIndex(0);
    },
    [setActiveRecipe, setCookStepIndex]
  );

  const deleteSavedRecipe = useCallback(
    (id: string) => {
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
      pushToast('Saved recipe deleted');
    },
    [setSavedRecipes, pushToast]
  );

  const rateCurrentRecipe = useCallback(
    (stars: number) => {
      setActiveRecipe((prev) => ({ ...prev, rating: stars }));
      setSavedRecipes((prev) =>
        prev.map((r) => (r.id === activeRecipe.id ? { ...r, rating: stars } : r))
      );
      pushToast(`Rated ${stars} out of 5 stars ★`);
    },
    [activeRecipe.id, setActiveRecipe, setSavedRecipes, pushToast]
  );

  const clearAllSavedRecipes = useCallback(() => {
    setSavedRecipes([]);
    pushToast('All saved recipes cleared');
  }, [setSavedRecipes, pushToast]);

  const handleTimerComplete = useCallback(
    (timer: CookTimer) => {
      pushToast(`⏱ Timer done! Step ${timer.stepIndex + 1} (${timer.label})`);
    },
    [pushToast]
  );

  const { timers, flashAlertStep, startTimer, pauseTimer, resetTimer } = useTimerManager(
    activeRecipe.steps,
    activeRecipe.id,
    settings.timerSound,
    handleTimerComplete
  );

  const cacheNutrition = useCallback(
    (key: string, macros: NutritionMacros) => {
      setNutritionCache((prev) => ({ ...prev, [key]: macros }));
    },
    [setNutritionCache]
  );

  const value = useMemo<RescaleContextValue>(
    () => ({
      isDark: theme === 'dark',
      toggleTheme,
      settings,
      updateSettings,
      rawInputText,
      setRawInputText,
      inputMode,
      setInputMode,
      reviewDraft,
      setReviewDraft,
      activeRecipe,
      setActiveRecipe,
      commitReviewToWorkspace,
      savedRecipes,
      saveCurrentRecipe,
      openSavedRecipe,
      deleteSavedRecipe,
      rateCurrentRecipe,
      clearAllSavedRecipes,
      cookStepIndex,
      setCookStepIndex,
      timers,
      flashAlertStep,
      startTimer,
      pauseTimer,
      resetTimer,
      nutritionCache,
      cacheNutrition,
      toasts: toastQueue,
      pushToast,
    }),
    [
      theme,
      toggleTheme,
      settings,
      updateSettings,
      rawInputText,
      setRawInputText,
      inputMode,
      setInputMode,
      reviewDraft,
      setReviewDraft,
      activeRecipe,
      setActiveRecipe,
      commitReviewToWorkspace,
      savedRecipes,
      saveCurrentRecipe,
      openSavedRecipe,
      deleteSavedRecipe,
      rateCurrentRecipe,
      clearAllSavedRecipes,
      cookStepIndex,
      setCookStepIndex,
      timers,
      flashAlertStep,
      startTimer,
      pauseTimer,
      resetTimer,
      nutritionCache,
      cacheNutrition,
      toastQueue,
      pushToast,
    ]
  );

  return <RescaleContext.Provider value={value}>{children}</RescaleContext.Provider>;
}

export function useRescale() {
  const ctx = useContext(RescaleContext);
  if (!ctx) {
    throw new Error('useRescale must be used inside RescaleProvider');
  }
  return ctx;
}
