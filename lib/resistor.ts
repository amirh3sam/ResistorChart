export type BandCount = 4 | 5 | 6;

export type ColorName =
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "grey"
  | "white"
  | "gold"
  | "silver"
  | "none";

export interface ColorInfo {
  name: ColorName;
  label: string;
  hex: string;
  /** Text color that stays readable on top of `hex`. */
  text: string;
  digit: number | null;
  /** Power-of-ten exponent used as the multiplier band. */
  multiplierExp: number | null;
  /** Tolerance in percent. */
  tolerance: number | null;
  /** Temperature coefficient in ppm/K. */
  tempCoef: number | null;
}

export const COLORS: Record<ColorName, ColorInfo> = {
  black: { name: "black", label: "Black", hex: "#1c1c1c", text: "#fff", digit: 0, multiplierExp: 0, tolerance: null, tempCoef: 250 },
  brown: { name: "brown", label: "Brown", hex: "#7b4a2a", text: "#fff", digit: 1, multiplierExp: 1, tolerance: 1, tempCoef: 100 },
  red: { name: "red", label: "Red", hex: "#d62828", text: "#fff", digit: 2, multiplierExp: 2, tolerance: 2, tempCoef: 50 },
  orange: { name: "orange", label: "Orange", hex: "#f77f00", text: "#000", digit: 3, multiplierExp: 3, tolerance: 0.05, tempCoef: 15 },
  yellow: { name: "yellow", label: "Yellow", hex: "#fcd116", text: "#000", digit: 4, multiplierExp: 4, tolerance: 0.02, tempCoef: 25 },
  green: { name: "green", label: "Green", hex: "#2a9d3f", text: "#fff", digit: 5, multiplierExp: 5, tolerance: 0.5, tempCoef: 20 },
  blue: { name: "blue", label: "Blue", hex: "#1d4ed8", text: "#fff", digit: 6, multiplierExp: 6, tolerance: 0.25, tempCoef: 10 },
  violet: { name: "violet", label: "Violet", hex: "#7e3fbf", text: "#fff", digit: 7, multiplierExp: 7, tolerance: 0.1, tempCoef: 5 },
  grey: { name: "grey", label: "Grey", hex: "#8a8a8a", text: "#000", digit: 8, multiplierExp: 8, tolerance: 0.01, tempCoef: 1 },
  white: { name: "white", label: "White", hex: "#f5f5f5", text: "#000", digit: 9, multiplierExp: 9, tolerance: null, tempCoef: null },
  gold: { name: "gold", label: "Gold", hex: "#c9a227", text: "#000", digit: null, multiplierExp: -1, tolerance: 5, tempCoef: null },
  silver: { name: "silver", label: "Silver", hex: "#c0c0c0", text: "#000", digit: null, multiplierExp: -2, tolerance: 10, tempCoef: null },
  none: { name: "none", label: "None", hex: "transparent", text: "inherit", digit: null, multiplierExp: null, tolerance: 20, tempCoef: null },
};

export const COLOR_ORDER: ColorName[] = [
  "black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "grey", "white", "gold", "silver", "none",
];

export type BandRole = "digit" | "multiplier" | "tolerance" | "tempCoef";

export interface BandSpec {
  role: BandRole;
  label: string;
}

export function getBandSpecs(count: BandCount): BandSpec[] {
  const digits = count === 4 ? 2 : 3;
  const specs: BandSpec[] = [];
  const ordinals = ["1st Digit", "2nd Digit", "3rd Digit"];
  for (let i = 0; i < digits; i++) specs.push({ role: "digit", label: ordinals[i] });
  specs.push({ role: "multiplier", label: "Multiplier" });
  specs.push({ role: "tolerance", label: "Tolerance" });
  if (count === 6) specs.push({ role: "tempCoef", label: "Temp. Coeff." });
  return specs;
}

/** Colors that are valid for a given band role. */
export function colorsForRole(role: BandRole): ColorName[] {
  return COLOR_ORDER.filter((c) => {
    const info = COLORS[c];
    switch (role) {
      case "digit":
        return info.digit !== null;
      case "multiplier":
        return info.multiplierExp !== null;
      case "tolerance":
        return info.tolerance !== null;
      case "tempCoef":
        return info.tempCoef !== null;
    }
  });
}

export interface ResistorResult {
  ohms: number;
  tolerance: number;
  min: number;
  max: number;
  tempCoef: number | null;
}

/** Fix floating point noise such as 0.1 * 47 = 4.7000000000000002. */
function clean(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

export function calculateFromColors(bands: ColorName[], count: BandCount): ResistorResult {
  const specs = getBandSpecs(count);
  if (bands.length < specs.length) throw new Error(`Expected ${specs.length} bands, got ${bands.length}`);

  let significand = 0;
  let exp = 0;
  let tolerance = 20;
  let tempCoef: number | null = null;

  specs.forEach((spec, i) => {
    const info = COLORS[bands[i]];
    switch (spec.role) {
      case "digit":
        significand = significand * 10 + (info.digit ?? 0);
        break;
      case "multiplier":
        exp = info.multiplierExp ?? 0;
        break;
      case "tolerance":
        tolerance = info.tolerance ?? 20;
        break;
      case "tempCoef":
        tempCoef = info.tempCoef;
        break;
    }
  });

  const ohms = clean(significand * 10 ** exp);
  return {
    ohms,
    tolerance,
    min: clean(ohms * (1 - tolerance / 100)),
    max: clean(ohms * (1 + tolerance / 100)),
    tempCoef,
  };
}

export type ColorsFromValueResult =
  | { ok: true; bands: ColorName[]; exact: boolean; ohms: number }
  | { ok: false; error: string };

/**
 * Find band colors for a resistance. Values that need more significant
 * digits than the band count allows are rounded to the nearest
 * representable value and flagged as `exact: false`.
 */
export function getColorsFromValue(
  ohms: number,
  count: BandCount,
  tolerance: ColorName = count === 4 ? "gold" : "brown",
  tempCoef: ColorName = "brown",
): ColorsFromValueResult {
  if (!Number.isFinite(ohms) || ohms <= 0) return { ok: false, error: "Enter a resistance greater than 0 Ω" };

  const digits = count === 4 ? 2 : 3;
  // Exponent so that significand has exactly `digits` digits.
  let exp = Math.floor(Math.log10(ohms)) - (digits - 1);
  let significand = Math.round(clean(ohms / 10 ** exp));
  if (significand >= 10 ** digits) {
    significand = Math.round(significand / 10);
    exp += 1;
  }

  // Small values: shift into the gold/silver multipliers, padding digits with leading zeros.
  if (exp < -2) {
    significand = Math.round(clean(ohms * 100));
    exp = -2;
    if (significand === 0) return { ok: false, error: "Value too small (minimum 0.01 Ω)" };
  }
  if (exp > 9) return { ok: false, error: "Value too large for color code" };

  const digitColors = String(significand)
    .padStart(digits, "0")
    .split("")
    .map((d) => COLOR_ORDER.find((c) => COLORS[c].digit === Number(d))!);
  const multiplier = COLOR_ORDER.find((c) => COLORS[c].multiplierExp === exp)!;

  const bands: ColorName[] = [...digitColors, multiplier, tolerance];
  if (count === 6) bands.push(tempCoef);

  const actual = clean(significand * 10 ** exp);
  return { ok: true, bands, exact: Math.abs(actual - ohms) / ohms < 1e-9, ohms: actual };
}

const SI_PREFIXES: [number, string][] = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
];

/** Format ohms like "4.7 kΩ", "1 MΩ", "0.22 Ω". */
export function formatOhms(ohms: number): string {
  if (ohms === 0) return "0 Ω";
  for (const [scale, prefix] of SI_PREFIXES) {
    if (ohms >= scale) return `${trimNumber(ohms / scale)} ${prefix}Ω`;
  }
  return `${trimNumber(ohms)} Ω`;
}

function trimNumber(n: number): string {
  return String(Number.parseFloat(n.toPrecision(4)));
}

export function formatTolerance(t: number): string {
  return `±${t}%`;
}

export function formatMultiplier(exp: number): string {
  const value = 10 ** exp;
  if (exp < 0) return `×${value}`;
  return `×${formatOhms(value).replace(/ ?Ω$/, "").replace(" ", "")}`;
}

/**
 * Parse user input like "4700", "4.7k", "4k7", "1M", "2.2 MΩ", "0R22", "470 ohm".
 * Returns NaN when the input cannot be understood.
 */
export function parseResistance(input: string): number {
  const s = input.trim().toLowerCase().replace(/ω|ohms?|Ω/gi, "").replace(/\s+/g, "").replace(",", ".");
  if (!s) return Number.NaN;
  const mult: Record<string, number> = { r: 1, "": 1, k: 1e3, m: 1e6, g: 1e9 };

  // RKM notation: 4k7, 0r22, 1m5
  const rkm = s.match(/^(\d+)([rkmg])(\d+)$/);
  if (rkm) return Number(`${rkm[1]}.${rkm[3]}`) * mult[rkm[2]];

  const std = s.match(/^(\d*\.?\d+(?:e[+-]?\d+)?)([rkmg]?)$/);
  if (std) return Number(std[1]) * mult[std[2]];

  return Number.NaN;
}

export const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

export const E24 = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5,
  8.2, 9.1,
];

/** Nearest value from an E-series (with decade scaling) to `ohms`. */
export function nearestStandard(ohms: number, series: number[]): number {
  if (!(ohms > 0)) return Number.NaN;
  const decade = 10 ** Math.floor(Math.log10(ohms));
  const candidates = [...series.map((v) => v * decade), 10 * decade, series[series.length - 1] * decade / 10];
  let best = candidates[0];
  for (const c of candidates) {
    // Compare on a log scale, which is how E-series values are spaced.
    if (Math.abs(Math.log(c / ohms)) < Math.abs(Math.log(best / ohms))) best = c;
  }
  return clean(best);
}

export function isInSeries(ohms: number, series: number[]): boolean {
  return ohms > 0 && Math.abs(nearestStandard(ohms, series) - ohms) / ohms < 1e-9;
}
