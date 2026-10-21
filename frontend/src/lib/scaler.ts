const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 0.1,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const DISPLAY_FRACTIONS: Array<{ value: number; glyph: string }> = [
  { value: 0.125, glyph: '⅛' },
  { value: 1 / 6, glyph: '⅙' },
  { value: 0.2, glyph: '⅕' },
  { value: 0.25, glyph: '¼' },
  { value: 1 / 3, glyph: '⅓' },
  { value: 0.375, glyph: '⅜' },
  { value: 0.5, glyph: '½' },
  { value: 0.625, glyph: '⅝' },
  { value: 2 / 3, glyph: '⅔' },
  { value: 0.75, glyph: '¾' },
  { value: 5 / 6, glyph: '⅚' },
  { value: 0.875, glyph: '⅞' },
];

const UNSCALABLE_UNITS = new Set([
  'pinch',
  'pinches',
  'dash',
  'dashes',
  'smidgen',
  'drop',
  'drops',
  'splash',
  'handful',
  'handfuls',
]);

const UNSCALABLE_PHRASES = [
  'to taste',
  'as needed',
  'for garnish',
  'for serving',
  'for dusting',
  'for greasing',
  'optional',
];

export function parseFractionString(input: string): number | null {
  if (!input) return null;
  let cleaned = input.trim();
  if (!cleaned) return null;

  // Replace unicode fraction characters like "2½" or "½"
  for (const [glyph, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (cleaned.includes(glyph)) {
      const prefix = cleaned.replace(glyph, '').trim();
      const whole = prefix ? Number(prefix) : 0;
      if (!Number.isNaN(whole)) {
        return whole + val;
      }
    }
  }

  // Handle mixed fraction "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den !== 0) return whole + num / den;
  }

  // Handle simple fraction "3/4"
  const fracMatch = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den !== 0) return num / den;
  }

  cleaned = cleaned.replace(',', '.');
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

export function isUnscalableIngredient(
  quantity: number | null | undefined,
  unit: string,
  ingredient: string,
  preparation = ''
): boolean {
  if (quantity === null || quantity === undefined || Number.isNaN(quantity) || quantity <= 0) {
    return true;
  }
  const u = (unit || '').trim().toLowerCase();
  if (UNSCALABLE_UNITS.has(u)) {
    return true;
  }
  const combined = `${unit} ${ingredient} ${preparation}`.toLowerCase();
  return UNSCALABLE_PHRASES.some((phrase) => combined.includes(phrase));
}

export function scaleQuantity(
  baseQuantity: number | null,
  multiplier: number,
  unscalable = false
): number | null {
  if (unscalable || baseQuantity === null || baseQuantity === undefined) {
    return null;
  }
  return baseQuantity * multiplier;
}

export function formatQuantity(
  value: number | null | undefined,
  unit = ''
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  if (value <= 0) return '0';

  const lowerUnit = (unit || '').trim().toLowerCase();
  const isMetric = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(
    lowerUnit
  );

  if (isMetric) {
    if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams' || lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
      return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
    }
    return String(Math.round(value * 100) / 100);
  }

  const whole = Math.floor(value + 1e-6);
  const remainder = value - whole;

  if (remainder < 0.04) {
    return String(whole);
  }
  if (remainder > 0.96) {
    return String(whole + 1);
  }

  let bestMatch: { value: number; glyph: string } | null = null;
  let minDiff = Infinity;

  for (const candidate of DISPLAY_FRACTIONS) {
    const diff = Math.abs(remainder - candidate.value);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = candidate;
    }
  }

  if (bestMatch && minDiff <= 0.06) {
    return whole > 0 ? `${whole}${bestMatch.glyph}` : bestMatch.glyph;
  }

  return String(Math.round(value * 100) / 100);
}
