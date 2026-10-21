import densitiesData from './densities.json';
import { TempUnit, UnitSystem } from './types';

interface DensityEntry {
  cup: number;
  tablespoon: number;
  teaspoon: number;
}

const DENSITIES: Record<string, DensityEntry> = densitiesData;

const INGREDIENT_ALIASES: Record<string, string> = {
  flour: 'all-purpose flour',
  'ap flour': 'all-purpose flour',
  'plain flour': 'all-purpose flour',
  sugar: 'granulated sugar',
  'caster sugar': 'caster sugar',
  'icing sugar': 'powdered sugar',
  milk: 'whole milk',
  cream: 'heavy cream',
  'double cream': 'heavy cream',
  'heavy whipping cream': 'heavy cream',
  yogurt: 'plain yogurt',
  yoghurt: 'plain yogurt',
  parmesan: 'parmesan cheese',
  cheddar: 'cheddar cheese',
  mozzarella: 'mozzarella cheese',
  ricotta: 'ricotta cheese',
  feta: 'feta cheese',
  oats: 'rolled oats',
  rice: 'white rice',
  panko: 'panko breadcrumbs',
  salt: 'kosher salt',
  oil: 'vegetable oil',
  'extra-virgin olive oil': 'olive oil',
  'extra virgin olive oil': 'olive oil',
};

export type CanonicalUnit =
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'fl_oz'
  | 'pint'
  | 'quart'
  | 'ml'
  | 'l'
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'other';

const UNIT_ALIASES: Record<string, CanonicalUnit> = {
  c: 'cup',
  cup: 'cup',
  cups: 'cup',
  tbsp: 'tbsp',
  tbs: 'tbsp',
  tbl: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  'fl oz': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fluid ounces': 'fl_oz',
  pt: 'pint',
  pint: 'pint',
  pints: 'pint',
  qt: 'quart',
  quart: 'quart',
  quarts: 'quart',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
};

// Volume in mL (US legal/customary kitchen standard: 1 cup = 236.588 mL, tbsp = 14.787 mL, tsp = 4.929 mL)
const VOLUME_ML: Record<string, number> = {
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  fl_oz: 29.5735,
  pint: 473.176,
  quart: 946.353,
  ml: 1,
  l: 1000,
};

// Weight in grams
const WEIGHT_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

export function normalizeUnit(unit: string): CanonicalUnit {
  const cleaned = (unit || '').trim().toLowerCase().replace(/\.$/, '');
  return UNIT_ALIASES[cleaned] || 'other';
}

export function isVolumeUnit(unit: CanonicalUnit): boolean {
  return unit in VOLUME_ML;
}

export function isWeightUnit(unit: CanonicalUnit): boolean {
  return unit in WEIGHT_G;
}

export function formatUnitLabel(unit: CanonicalUnit, quantity: number, fallbackRaw = ''): string {
  const plural = quantity > 1.02;
  switch (unit) {
    case 'cup':
      return plural ? 'cups' : 'cup';
    case 'tbsp':
      return 'tbsp';
    case 'tsp':
      return 'tsp';
    case 'fl_oz':
      return 'fl oz';
    case 'pint':
      return plural ? 'pints' : 'pint';
    case 'quart':
      return plural ? 'quarts' : 'quart';
    case 'ml':
      return 'mL';
    case 'l':
      return 'L';
    case 'g':
      return 'g';
    case 'kg':
      return 'kg';
    case 'oz':
      return 'oz';
    case 'lb':
      return plural ? 'lbs' : 'lb';
    default:
      return fallbackRaw;
  }
}

export function lookupDensity(ingredientName: string): DensityEntry | null {
  if (!ingredientName) return null;
  const cleaned = ingredientName
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .split(',')[0]
    .trim();

  if (DENSITIES[cleaned]) return DENSITIES[cleaned];
  if (INGREDIENT_ALIASES[cleaned] && DENSITIES[INGREDIENT_ALIASES[cleaned]]) {
    return DENSITIES[INGREDIENT_ALIASES[cleaned]];
  }

  const sortedKeys = Object.keys(DENSITIES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cleaned.includes(key)) {
      return DENSITIES[key];
    }
  }

  for (const [alias, target] of Object.entries(INGREDIENT_ALIASES)) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(cleaned) && DENSITIES[target]) {
      return DENSITIES[target];
    }
  }

  return null;
}

export function convertBetweenUnits(
  quantity: number,
  fromUnit: CanonicalUnit,
  toUnit: CanonicalUnit,
  ingredientName: string
): number | null {
  if (fromUnit === toUnit) return quantity;

  // Volume -> Volume
  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    const ml = quantity * VOLUME_ML[fromUnit];
    return ml / VOLUME_ML[toUnit];
  }

  // Weight -> Weight
  if (isWeightUnit(fromUnit) && isWeightUnit(toUnit)) {
    const grams = quantity * WEIGHT_G[fromUnit];
    return grams / WEIGHT_G[toUnit];
  }

  const density = lookupDensity(ingredientName);

  // Volume -> Weight using ingredient density
  if (isVolumeUnit(fromUnit) && isWeightUnit(toUnit)) {
    let grams: number;
    if (density) {
      if (fromUnit === 'cup') grams = quantity * density.cup;
      else if (fromUnit === 'tbsp') grams = quantity * density.tablespoon;
      else if (fromUnit === 'tsp') grams = quantity * density.teaspoon;
      else {
        const cups = (quantity * VOLUME_ML[fromUnit]) / VOLUME_ML.cup;
        grams = cups * density.cup;
      }
    } else {
      // Water-density fallback when unknown liquid/semi-solid
      grams = quantity * VOLUME_ML[fromUnit];
    }
    return grams / WEIGHT_G[toUnit];
  }

  // Weight -> Volume using ingredient density
  if (isWeightUnit(fromUnit) && isVolumeUnit(toUnit)) {
    const grams = quantity * WEIGHT_G[fromUnit];
    const cupGrams = density ? density.cup : VOLUME_ML.cup;
    const cups = grams / cupGrams;
    const ml = cups * VOLUME_ML.cup;
    return ml / VOLUME_ML[toUnit];
  }

  return null;
}

export function computeGramEquivalent(
  scaledQuantity: number | null,
  rawUnit: string,
  ingredientName: string
): number | null {
  if (scaledQuantity === null || scaledQuantity <= 0) return null;
  const canonical = normalizeUnit(rawUnit);
  if (!isVolumeUnit(canonical)) return null;
  const density = lookupDensity(ingredientName);
  if (!density) return null;

  let grams: number;
  if (canonical === 'cup') grams = scaledQuantity * density.cup;
  else if (canonical === 'tbsp') grams = scaledQuantity * density.tablespoon;
  else if (canonical === 'tsp') grams = scaledQuantity * density.teaspoon;
  else {
    const cups = (scaledQuantity * VOLUME_ML[canonical]) / VOLUME_ML.cup;
    grams = cups * density.cup;
  }
  return Math.round(grams);
}

const LIQUID_KEYWORDS = [
  'water',
  'milk',
  'cream',
  'broth',
  'stock',
  'juice',
  'wine',
  'vinegar',
  'oil',
  'extract',
  'soy sauce',
  'fish sauce',
  'syrup',
  'buttermilk',
];

export function convertForSystem(
  scaledQuantity: number | null,
  rawUnit: string,
  ingredientName: string,
  targetSystem: UnitSystem,
  overrideUnit?: string
): { quantity: number | null; unit: string; canonical: CanonicalUnit } {
  if (scaledQuantity === null) {
    return { quantity: null, unit: rawUnit, canonical: normalizeUnit(rawUnit) };
  }

  const baseCanonical = normalizeUnit(rawUnit);

  if (overrideUnit) {
    const targetCanonical = normalizeUnit(overrideUnit);
    const converted = convertBetweenUnits(
      scaledQuantity,
      baseCanonical,
      targetCanonical,
      ingredientName
    );
    if (converted !== null) {
      return {
        quantity: converted,
        unit: formatUnitLabel(targetCanonical, converted, overrideUnit),
        canonical: targetCanonical,
      };
    }
  }

  if (baseCanonical === 'other') {
    return { quantity: scaledQuantity, unit: rawUnit, canonical: 'other' };
  }

  const lowerIng = ingredientName.toLowerCase();
  const isLiquid = LIQUID_KEYWORDS.some((kw) => lowerIng.includes(kw));

  if (targetSystem === 'metric') {
    if (isWeightUnit(baseCanonical)) {
      const grams = scaledQuantity * WEIGHT_G[baseCanonical];
      if (grams >= 1000) {
        return { quantity: grams / 1000, unit: 'kg', canonical: 'kg' };
      }
      return { quantity: grams, unit: 'g', canonical: 'g' };
    }
    if (isVolumeUnit(baseCanonical)) {
      // Keep small spoon spices readable in mL unless substantial dry ingredient
      const density = lookupDensity(ingredientName);
      if (!isLiquid && density && (baseCanonical === 'cup' || baseCanonical === 'pint' || baseCanonical === 'quart' || baseCanonical === 'tbsp')) {
        const grams = convertBetweenUnits(scaledQuantity, baseCanonical, 'g', ingredientName)!;
        if (grams >= 1000) {
          return { quantity: grams / 1000, unit: 'kg', canonical: 'kg' };
        }
        return { quantity: grams, unit: 'g', canonical: 'g' };
      }
      const ml = scaledQuantity * VOLUME_ML[baseCanonical];
      if (ml >= 1000) {
        return { quantity: ml / 1000, unit: 'L', canonical: 'l' };
      }
      return { quantity: ml, unit: 'mL', canonical: 'ml' };
    }
  } else {
    // US Customary target
    if (baseCanonical === 'g' || baseCanonical === 'kg') {
      const oz = convertBetweenUnits(scaledQuantity, baseCanonical, 'oz', ingredientName)!;
      if (oz >= 16) {
        const lb = oz / 16;
        return { quantity: lb, unit: formatUnitLabel('lb', lb), canonical: 'lb' };
      }
      return { quantity: oz, unit: 'oz', canonical: 'oz' };
    }
    if (baseCanonical === 'ml' || baseCanonical === 'l') {
      const ml = scaledQuantity * VOLUME_ML[baseCanonical];
      if (ml >= 60) {
        const cups = ml / VOLUME_ML.cup;
        return { quantity: cups, unit: formatUnitLabel('cup', cups), canonical: 'cup' };
      }
      if (ml >= 15) {
        const tbsp = ml / VOLUME_ML.tbsp;
        return { quantity: tbsp, unit: 'tbsp', canonical: 'tbsp' };
      }
      const tsp = ml / VOLUME_ML.tsp;
      return { quantity: tsp, unit: 'tsp', canonical: 'tsp' };
    }
    return {
      quantity: scaledQuantity,
      unit: formatUnitLabel(baseCanonical, scaledQuantity, rawUnit),
      canonical: baseCanonical,
    };
  }

  return {
    quantity: scaledQuantity,
    unit: formatUnitLabel(baseCanonical, scaledQuantity, rawUnit),
    canonical: baseCanonical,
  };
}

export function getNextCycledUnit(currentCanonical: CanonicalUnit, ingredientName: string): string | null {
  if (currentCanonical === 'other') return null;
  const hasDensity = Boolean(lookupDensity(ingredientName));
  const cycleOrder: CanonicalUnit[] = hasDensity
    ? ['cup', 'g', 'oz', 'tbsp', 'ml']
    : isVolumeUnit(currentCanonical)
      ? ['cup', 'tbsp', 'tsp', 'ml', 'l']
      : ['g', 'oz', 'lb', 'kg'];

  const idx = cycleOrder.indexOf(currentCanonical);
  const next = cycleOrder[(idx + 1) % cycleOrder.length];
  return formatUnitLabel(next, 2);
}

// Inline Temperature Conversion (°F <-> °C)
export function convertTemperaturesInText(text: string, targetUnit: TempUnit): string {
  if (!text) return '';

  // Match e.g. 350°F, 350 °F, 350F, 350 degrees F, 180°C, 180 degrees C
  return text.replace(
    /\b(\d{2,3})\s*(?:°\s*|degrees?\s+)([FCfc])\b|\b(\d{3})(°?[Ff])\b/g,
    (fullMatch, num1, unit1, num2, unit2) => {
      const val = Number(num1 ?? num2);
      const rawU = String(unit1 ?? unit2).replace('°', '').toUpperCase();
      if (!Number.isFinite(val)) return fullMatch;

      if (rawU === targetUnit) {
        return `${val}°${targetUnit}`;
      }
      if (rawU === 'F' && targetUnit === 'C') {
        const c = Math.round(((val - 32) * 5) / 9 / 5) * 5;
        return `${c}°C`;
      }
      if (rawU === 'C' && targetUnit === 'F') {
        const f = Math.round(((val * 9) / 5 + 32) / 5) * 5;
        return `${f}°F`;
      }
      return fullMatch;
    }
  );
}

export interface DetectedTimeSegment {
  label: string;
  seconds: number;
  start: number;
  end: number;
}

// Detect all time references inside a step (supports single or multiple timers per step!)
export function detectStepTimers(stepText: string): DetectedTimeSegment[] {
  const results: DetectedTimeSegment[] = [];
  if (!stepText) return results;

  const regex =
    /\b(?:for\s+|about\s+|another\s+)?(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(stepText)) !== null) {
    const lowerVal = parseFloat(match[1]);
    const unitRaw = match[3].toLowerCase();
    if (!Number.isFinite(lowerVal) || lowerVal <= 0) continue;

    let multiplier = 60;
    if (unitRaw.startsWith('h')) multiplier = 3600;
    else if (unitRaw.startsWith('s')) multiplier = 1;

    const totalSeconds = Math.round(lowerVal * multiplier);
    if (totalSeconds <= 0) continue;

    // Build readable context phrase e.g. "Bake for 12 minutes" or "Rest on the pan for 5 minutes"
    const before = stepText.slice(Math.max(0, match.index - 36), match.index);
    const cookingVerbMatch = before.match(
      /\b((?:bake|simmer|cook|chill|rest|whisk|beat|boil|roast|sear|steep|rise|knead|wait|cool|marinate|broil|steam|fry|sauté|saute)[^.,;!?]*)$/i
    );
    const rawPhrase = match[0].trim();
    const fullPhrase = cookingVerbMatch
      ? `${cookingVerbMatch[1].trim()} ${rawPhrase}`
      : rawPhrase;
    const label = fullPhrase.charAt(0).toUpperCase() + fullPhrase.slice(1);

    results.push({
      label,
      seconds: totalSeconds,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return results;
}
