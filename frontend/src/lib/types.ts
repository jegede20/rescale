export type UnitSystem = 'us' | 'metric';
export type TempUnit = 'F' | 'C';
export type InputMode = 'paste' | 'url' | 'ocr' | 'voice';

export interface IngredientItem {
  id: string;
  raw?: string;
  quantity: number | null;
  quantityMax?: number | null;
  unit: string;
  ingredient: string;
  preparation: string;
  isRange?: boolean;
  unscalable?: boolean;
  confidence?: number;
  substitutedFrom?: string;
  customUnitOverride?: string;
}

export interface RecipeData {
  id: string;
  title: string;
  originalServings: number;
  targetServings: number;
  scaleMultiplier: number;
  unitSystem: UnitSystem;
  tempUnit: TempUnit;
  ingredients: IngredientItem[];
  steps: string[];
  rawText?: string;
  image?: string | null;
  rating?: number;
}

export interface SavedRecipe extends RecipeData {
  savedAt: number;
}

export interface NutritionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar: number;
  fiber: number;
  sodium: number;
}

export interface SubstitutionOption {
  substitute: string;
  ratio: string;
  note: string;
}

export interface AppSettings {
  preferredUnitSystem: UnitSystem;
  defaultScale: number;
  temperatureUnit: TempUnit;
  timerSound: boolean;
}

export interface CookTimer {
  id: string;
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'done';
}

export interface ToastItem {
  id: string;
  message: string;
}
