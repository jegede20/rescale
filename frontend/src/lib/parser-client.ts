import substitutionsData from './substitutions.json';
import {
  formatQuantity,
  isUnscalableIngredient,
  parseFractionString,
  scaleQuantity,
} from './scaler';
import { convertForSystem, convertTemperaturesInText } from './converter';
import {
  IngredientItem,
  NutritionMacros,
  RecipeData,
  SubstitutionOption,
} from './types';

const SUBSTITUTIONS: Record<string, SubstitutionOption[]> = substitutionsData;

const KNOWN_UNITS = new Set([
  'c',
  'cup',
  'cups',
  'tbsp',
  'tbs',
  'tbl',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'g',
  'gram',
  'grams',
  'kg',
  'kilogram',
  'kilograms',
  'oz',
  'ounce',
  'ounces',
  'lb',
  'lbs',
  'pound',
  'pounds',
  'ml',
  'milliliter',
  'milliliters',
  'l',
  'liter',
  'liters',
  'fl oz',
  'pint',
  'pints',
  'quart',
  'quarts',
  'clove',
  'cloves',
  'slice',
  'slices',
  'stick',
  'sticks',
  'can',
  'cans',
  'bunch',
  'bunches',
  'sprig',
  'sprigs',
  'pinch',
  'pinches',
  'dash',
  'dashes',
  'head',
  'heads',
  'package',
  'packages',
  'packet',
  'packets',
]);

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function parseIngredientClient(rawLine: string): IngredientItem {
  const cleaned = rawLine
    .replace(/^\s*[-•*▪◦▢☐✓]+\s*/, '')
    .trim();

  if (!cleaned) {
    return {
      id: makeId(),
      raw: rawLine,
      quantity: null,
      unit: '',
      ingredient: '',
      preparation: '',
      unscalable: true,
      confidence: 0,
    };
  }

  let working = cleaned;
  const prepNotes: string[] = [];

  // Extract parenthetical preparation notes e.g. "(room temperature)"
  working = working.replace(/\(([^)]+)\)/g, (_m, inner: string) => {
    prepNotes.push(inner.trim());
    return '';
  }).trim();

  // Extract comma-separated preparation notes e.g. ", sifted"
  const commaIdx = working.indexOf(',');
  if (commaIdx > 0) {
    const afterComma = working.slice(commaIdx + 1).trim();
    if (afterComma) prepNotes.push(afterComma);
    working = working.slice(0, commaIdx).trim();
  }

  // Match leading range "2-3", mixed fraction "1 1/2", unicode fraction "2½", or number
  const qtyRegex =
    /^(\d+\s*[-–]\s*\d+|\d+\s+\d+\/\d+|\d+\/\d+|\d*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+(?:\.\d+)?)\s*(.*)$/;

  let quantity: number | null = null;
  let quantityMax: number | null = null;
  let isRange = false;
  let rest = working;

  const qtyMatch = working.match(qtyRegex);
  if (qtyMatch) {
    const qtyToken = qtyMatch[1].trim();
    rest = qtyMatch[2].trim();

    if (/[-–]/.test(qtyToken)) {
      const parts = qtyToken.split(/[-–]/).map((s) => parseFractionString(s));
      if (parts[0] !== null) {
        quantity = parts[0];
        quantityMax = parts[1] ?? null;
        isRange = true;
      }
    } else {
      quantity = parseFractionString(qtyToken);
    }
  } else if (/^(a|an)\s+(pinch|dash|handful|splash)\b/i.test(working)) {
    rest = working.replace(/^(a|an)\s+/i, '');
  }

  // Extract unit token
  let unit = '';
  const twoWordMatch = rest.match(/^(fl\.?\s*oz)\b\s*(.*)$/i);
  if (twoWordMatch) {
    unit = 'fl oz';
    rest = twoWordMatch[2].trim();
  } else {
    const firstWordMatch = rest.match(/^([A-Za-z.]+)\s+(?:of\s+)?(.*)$/);
    if (firstWordMatch) {
      const candidate = firstWordMatch[1].replace(/\.$/, '').toLowerCase();
      if (KNOWN_UNITS.has(candidate)) {
        unit = firstWordMatch[1].replace(/\.$/, '');
        rest = firstWordMatch[2].trim();
      }
    }
  }

  // Detect trailing "to taste" / "as needed"
  const tasteMatch = rest.match(/^(.*?)\s+(to taste|as needed|for garnish|for serving)$/i);
  if (tasteMatch) {
    rest = tasteMatch[1].trim();
    prepNotes.push(tasteMatch[2].toLowerCase());
  }

  const preparation = prepNotes.join(', ');
  const ingredient = rest || cleaned;
  const unscalable = isUnscalableIngredient(quantity, unit, ingredient, preparation);

  return {
    id: makeId(),
    raw: cleaned,
    quantity: unscalable && unit.toLowerCase() === 'pinch' ? null : quantity,
    quantityMax: isRange ? quantityMax : null,
    unit,
    ingredient,
    preparation,
    isRange,
    unscalable,
    confidence: quantity !== null || unscalable ? 0.9 : 0.55,
  };
}

export interface DetectedSections {
  title: string;
  servings: number;
  ingredientLines: string[];
  stepLines: string[];
  autoDetectConfidence: 'high' | 'low';
}

export function detectSectionsFromText(rawText: string): DetectedSections {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      title: 'Untitled Recipe',
      servings: 4,
      ingredientLines: [],
      stepLines: [],
      autoDetectConfidence: 'low',
    };
  }

  let title = '';
  let servings = 4;
  let foundExplicitHeaders = false;
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];

  let mode: 'unknown' | 'ingredients' | 'steps' = 'unknown';

  const qtyStartRegex =
    /^([-•*▪◦▢☐]?\s*)(\d+|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|pinch\b|a\s+pinch\b|salt\b|black\s+pepper\b|kosher\s+salt\b|cooking\s+spray\b)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect serving count e.g. "Serves 4", "Yield: 8 servings", "Makes 12"
    const servMatch = line.match(
      /(?:serves|servings|yield|yields|makes|portions)\s*:?\s*(\d+)/i
    ) || line.match(/^(\d+)\s+(?:servings|portions)\b/i);

    if (servMatch) {
      const n = parseInt(servMatch[1], 10);
      if (n >= 1 && n <= 200) servings = n;
      if (line.length < 40) continue;
    }

    const headerNorm = line.replace(/[:\-–#*]+/g, '').trim().toLowerCase();
    if (
      [
        'ingredients',
        'ingredient list',
        'what you need',
        'for the dough',
        'for the batter',
        'for the sauce',
        'for the filling',
        'for the topping',
        'for the glaze',
      ].includes(headerNorm) ||
      /^for the [a-z\s]{2,24}$/.test(headerNorm)
    ) {
      mode = 'ingredients';
      foundExplicitHeaders = true;
      continue;
    }

    if (
      [
        'instructions',
        'directions',
        'method',
        'preparation',
        'steps',
        'how to make',
        'how to make it',
        'to make',
      ].includes(headerNorm)
    ) {
      mode = 'steps';
      foundExplicitHeaders = true;
      continue;
    }

    // First line as title if short and doesn't start with a measurement
    if (!title && i === 0 && line.length <= 85 && !qtyStartRegex.test(line)) {
      title = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    if (mode === 'ingredients') {
      ingredientLines.push(line);
    } else if (mode === 'steps') {
      const cleanedStep = line.replace(/^(?:step\s*\d+[:.)\-\s]+|\d+[.)\-\s]+)/i, '').trim();
      if (cleanedStep) stepLines.push(cleanedStep);
    } else {
      // Heuristic classification when headers are omitted
      if (/^(?:step\s*\d+|\d+[.)])\s+[A-Z]/i.test(line)) {
        stepLines.push(line.replace(/^(?:step\s*\d+[:.)\-\s]+|\d+[.)\-\s]+)/i, '').trim());
      } else if (qtyStartRegex.test(line) && line.length < 95) {
        ingredientLines.push(line);
      } else if (line.length > 75 || /\b(preheat|bake|whisk|stir|cook|simmer|boil|heat|mix|combine|fold|pour|season|serve)\b/i.test(line)) {
        // Split multi-sentence paragraph if needed
        if (line.length > 140) {
          const sentences = line
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .map((s) => s.trim())
            .filter(Boolean);
          stepLines.push(...sentences);
        } else {
          stepLines.push(line);
        }
      } else {
        ingredientLines.push(line);
      }
    }
  }

  if (!title) {
    title = 'Untitled Recipe';
  }

  const confidence: 'high' | 'low' =
    foundExplicitHeaders || (ingredientLines.length >= 2 && stepLines.length >= 1)
      ? 'high'
      : 'low';

  return {
    title,
    servings,
    ingredientLines,
    stepLines,
    autoDetectConfidence: confidence,
  };
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';

export async function parseRecipeFull(rawText: string): Promise<{
  title: string;
  servings: number;
  ingredients: IngredientItem[];
  steps: string[];
  usedAiFallback: boolean;
}> {
  const sections = detectSectionsFromText(rawText);

  // If format is very messy (no ingredients or no steps found), invoke /ai-parse directly
  if (sections.ingredientLines.length === 0 || (sections.autoDetectConfidence === 'low' && sections.stepLines.length === 0)) {
    try {
      const aiRes = await fetch(`${API_BASE}/ai-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const mappedIngredients: IngredientItem[] = (aiJson.ingredients || []).map(
          (item: {
            quantity?: number | string | null;
            unit?: string;
            ingredient?: string;
            preparation?: string;
          }) => {
            const qty =
              typeof item.quantity === 'number'
                ? item.quantity
                : item.quantity
                  ? parseFractionString(String(item.quantity))
                  : null;
            const unit = item.unit || '';
            const ingredient = item.ingredient || '';
            const preparation = item.preparation || '';
            const unscalable = isUnscalableIngredient(qty, unit, ingredient, preparation);
            return {
              id: makeId(),
              quantity: qty,
              unit,
              ingredient,
              preparation,
              unscalable,
              confidence: 0.9,
            };
          }
        );
        return {
          title: aiJson.title || sections.title,
          servings: aiJson.servings || sections.servings,
          ingredients: mappedIngredients,
          steps: aiJson.steps?.length ? aiJson.steps : sections.stepLines,
          usedAiFallback: true,
        };
      }
    } catch {
      // Offline — continue with client parser below
    }
  }

  // Primary backend parser: POST /parse (ingredient-parser-nlp)
  if (sections.ingredientLines.length > 0) {
    try {
      const parseRes = await fetch(`${API_BASE}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: sections.ingredientLines }),
      });
      if (parseRes.ok) {
        const nlpItems = await parseRes.json();
        const mapped: IngredientItem[] = nlpItems.map(
          (item: {
            raw?: string;
            quantity: number | null;
            quantityMax?: number | null;
            unit: string;
            ingredient: string;
            preparation: string;
            isRange?: boolean;
            unscalable?: boolean;
            confidence?: number;
          }) => ({
            id: makeId(),
            raw: item.raw,
            quantity: item.quantity,
            quantityMax: item.quantityMax ?? null,
            unit: item.unit || '',
            ingredient: item.ingredient || '',
            preparation: item.preparation || '',
            isRange: Boolean(item.isRange),
            unscalable: Boolean(item.unscalable),
            confidence: item.confidence ?? 0.9,
          })
        );

        const lowConfCount = mapped.filter((m) => (m.confidence ?? 1) < 0.55).length;
        if (lowConfCount > mapped.length / 2 && mapped.length >= 2) {
          // Trigger AI fallback for low-confidence NLP output
          try {
            const aiRes = await fetch(`${API_BASE}/ai-parse`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: rawText }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              if (aiData.ingredients?.length) {
                return {
                  title: aiData.title || sections.title,
                  servings: aiData.servings || sections.servings,
                  ingredients: aiData.ingredients.map(
                    (it: {
                      quantity?: number | null;
                      unit?: string;
                      ingredient?: string;
                      preparation?: string;
                    }) => ({
                      id: makeId(),
                      quantity: typeof it.quantity === 'number' ? it.quantity : null,
                      unit: it.unit || '',
                      ingredient: it.ingredient || '',
                      preparation: it.preparation || '',
                      unscalable: isUnscalableIngredient(
                        typeof it.quantity === 'number' ? it.quantity : null,
                        it.unit || '',
                        it.ingredient || '',
                        it.preparation || ''
                      ),
                      confidence: 0.9,
                    })
                  ),
                  steps: aiData.steps?.length ? aiData.steps : sections.stepLines,
                  usedAiFallback: true,
                };
              }
            }
          } catch {
            // Keep NLP result
          }
        }

        return {
          title: sections.title,
          servings: sections.servings,
          ingredients: mapped,
          steps: sections.stepLines,
          usedAiFallback: false,
        };
      }
    } catch {
      // Offline PWA fallback -> pure client TypeScript parser
    }
  }

  return {
    title: sections.title,
    servings: sections.servings,
    ingredients: sections.ingredientLines.map(parseIngredientClient),
    steps: sections.stepLines,
    usedAiFallback: false,
  };
}

export async function scrapeRecipeUrl(url: string): Promise<{
  title: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  image?: string | null;
}> {
  const res = await fetch(`${API_BASE}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    throw new Error('SCRAPE_FAILED');
  }
  return res.json();
}

export async function extractOcrFromImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/ocr`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error('OCR_FAILED');
  }
  const data = await res.json();
  return data.text || '';
}

export async function transcribeVoiceBlob(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, 'recording.webm');
  const res = await fetch(`${API_BASE}/voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error('VOICE_FAILED');
  }
  const data = await res.json();
  return data.text || '';
}

export async function fetchNutritionMacros(
  ingredients: Array<{ quantity: number | null; unit: string; ingredient: string }>,
  servings: number
): Promise<NutritionMacros> {
  const res = await fetch(`${API_BASE}/nutrition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredients, servings }),
  });
  if (!res.ok) {
    throw new Error('NUTRITION_FAILED');
  }
  return res.json();
}

export function lookupSubstitutions(ingredientName: string): {
  matchedKey: string | null;
  options: SubstitutionOption[];
} {
  const clean = (ingredientName || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .split(',')[0]
    .trim();

  if (SUBSTITUTIONS[clean]) {
    return { matchedKey: clean, options: SUBSTITUTIONS[clean] };
  }

  const keys = Object.keys(SUBSTITUTIONS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (clean.includes(key) || key.includes(clean)) {
      if (clean.length >= 3) {
        return { matchedKey: key, options: SUBSTITUTIONS[key] };
      }
    }
  }

  // Helpful culinary fallback so tapping 🔁 on any specialty ingredient still guides the cook
  return {
    matchedKey: null,
    options: [
      {
        substitute: `Mild pantry equivalent for ${ingredientName}`,
        ratio: '1:1 equal amount',
        note: 'Match moisture content and acidity closely',
      },
      {
        substitute: 'Omit & balance seasoning',
        ratio: 'Omit — add a pinch of salt + squeeze of citrus at finish',
        note: 'Works safely when used as a secondary aromatic or garnish',
      },
      {
        substitute: 'Halve amount & pair with neutral base',
        ratio: '½ original amount + ½ neutral base',
        note: 'Stretches limited pantry quantities without altering structure',
      },
    ],
  };
}

export function formatRecipeClipboardText(recipe: RecipeData): string {
  const lines: string[] = [];
  lines.push(recipe.title);
  lines.push(`Serves: ${recipe.targetServings}`);
  lines.push('');
  lines.push('INGREDIENTS');

  for (const item of recipe.ingredients) {
    if (item.unscalable) {
      const unitPart = item.unit ? `${item.unit} ` : '';
      const prepPart = item.preparation ? `, ${item.preparation}` : '';
      lines.push(`- ${unitPart}${item.ingredient}${prepPart}`);
    } else {
      const scaled = scaleQuantity(item.quantity, recipe.scaleMultiplier, false);
      const converted = convertForSystem(
        scaled,
        item.unit,
        item.ingredient,
        recipe.unitSystem,
        item.customUnitOverride
      );
      const qtyStr = formatQuantity(converted.quantity, converted.unit);
      const unitStr = converted.unit ? ` ${converted.unit}` : '';
      const prepStr = item.preparation ? `, ${item.preparation}` : '';
      lines.push(`- ${qtyStr}${unitStr} ${item.ingredient}${prepStr}`);
    }
  }

  lines.push('');
  lines.push('INSTRUCTIONS');
  recipe.steps.forEach((step, idx) => {
    const convertedStep = convertTemperaturesInText(step, recipe.tempUnit);
    lines.push(`${idx + 1}. ${convertedStep}`);
  });

  lines.push('');
  lines.push('Scaled with Rescale — rescale.app');
  return lines.join('\n');
}

export const SAMPLE_RECIPE_TEXT = `Brown Butter Chocolate Chip Cookies
Serves 8

Ingredients:
2½ cups all-purpose flour, sifted
1 tsp baking soda
1 cup unsalted butter, browned and cooled
¾ cup brown sugar, packed
½ cup granulated sugar
2 large eggs, room temperature
2 tsp vanilla extract
¼ cup buttermilk
1½ cups chocolate chips
flaky sea salt to taste
pinch of nutmeg

Instructions:
1. Preheat oven to 350°F and line two baking sheets with parchment paper.
2. Whisk the all-purpose flour, baking soda, and nutmeg together in a medium bowl.
3. Whisk the brown butter, brown sugar, and granulated sugar together for 2 minutes until glossy and smooth.
4. Beat in the eggs, vanilla extract, and buttermilk until emulsified.
5. Fold in the flour mixture until just combined, then fold in the chocolate chips. Chill dough for 20 minutes.
6. Scoop rounds onto sheets and bake for 12 minutes until edges are golden brown, then rest on the pan for 5 minutes before serving with flaky sea salt.`;
