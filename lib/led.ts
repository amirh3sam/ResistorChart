import { E12, E24 } from "./resistor";

export interface LedPreset {
  name: string;
  /** Typical forward voltage for a standard 3–5 mm indicator LED. */
  vf: number;
  hex: string;
}

export const LED_PRESETS: LedPreset[] = [
  { name: "Red", vf: 2.0, hex: "#ef3b3b" },
  { name: "Orange", vf: 2.1, hex: "#ff8a1f" },
  { name: "Yellow", vf: 2.1, hex: "#ffd21f" },
  { name: "Green", vf: 2.2, hex: "#34c759" },
  { name: "Blue", vf: 3.2, hex: "#3b82f6" },
  { name: "White", vf: 3.2, hex: "#f5f7ff" },
  { name: "UV", vf: 3.4, hex: "#9b5cff" },
  { name: "IR", vf: 1.3, hex: "#8b2c2c" },
];

/** Common through-hole / SMD resistor power ratings, in watts. */
export const POWER_RATINGS = [0.125, 0.25, 0.5, 1, 2, 3, 5, 10];

export type ESeriesName = "E12" | "E24";

function clean(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

/** Smallest value from the series that is ≥ `ohms`, so the LED current never exceeds the target. */
export function nextStandardUp(ohms: number, series: number[]): number {
  if (!(ohms > 0)) return Number.NaN;
  const decade = 10 ** Math.floor(Math.log10(ohms));
  for (const v of [...series, 10]) {
    const candidate = clean(v * decade);
    if (candidate >= ohms * (1 - 1e-9)) return candidate;
  }
  return clean(10 * decade);
}

export interface LedInput {
  supply: number;
  vf: number;
  /** Target LED current in amps. */
  current: number;
  count: number;
  series: ESeriesName;
}

export type LedResult =
  | {
      ok: true;
      exactOhms: number;
      ohms: number;
      actualCurrent: number;
      resistorPower: number;
      rating: number | null;
      ledPower: number;
      totalPower: number;
      efficiency: number;
      headroom: number;
    }
  | { ok: false; error: string };

export function calculateLed({ supply, vf, current, count, series }: LedInput): LedResult {
  if (!(supply > 0)) return { ok: false, error: "Enter the supply voltage" };
  if (!(vf > 0)) return { ok: false, error: "Enter the LED forward voltage" };
  if (!(current > 0)) return { ok: false, error: "Enter the LED current" };
  if (!(count >= 1)) return { ok: false, error: "Use at least one LED" };

  const ledVoltage = vf * count;
  const headroom = supply - ledVoltage;
  if (headroom <= 0) {
    return {
      ok: false,
      error: `The supply (${supply} V) must be higher than the total LED voltage (${clean(ledVoltage)} V). Use fewer LEDs in series or a higher supply.`,
    };
  }

  const exactOhms = headroom / current;
  const ohms = nextStandardUp(exactOhms, series === "E12" ? E12 : E24);
  const actualCurrent = headroom / ohms;
  const resistorPower = actualCurrent ** 2 * ohms;
  // Run resistors at no more than half their rating to keep them cool.
  const rating = POWER_RATINGS.find((r) => r >= resistorPower * 2) ?? null;
  const ledPower = ledVoltage * actualCurrent;
  const totalPower = supply * actualCurrent;

  return {
    ok: true,
    exactOhms: clean(exactOhms),
    ohms,
    actualCurrent: clean(actualCurrent),
    resistorPower: clean(resistorPower),
    rating,
    ledPower: clean(ledPower),
    totalPower: clean(totalPower),
    efficiency: ledPower / totalPower,
    headroom: clean(headroom),
  };
}

const FRACTIONS: Record<number, string> = { 0.125: "⅛", 0.25: "¼", 0.5: "½" };

export function formatRating(watts: number): string {
  return `${FRACTIONS[watts] ?? watts} W`;
}

/** "0.0123" A → "12.3 mA", "1.2" A → "1.2 A". */
export function formatCurrent(amps: number): string {
  if (amps >= 1) return `${Number.parseFloat(amps.toPrecision(3))} A`;
  return `${Number.parseFloat((amps * 1000).toPrecision(3))} mA`;
}

export function formatPower(watts: number): string {
  if (watts >= 1) return `${Number.parseFloat(watts.toPrecision(3))} W`;
  return `${Number.parseFloat((watts * 1000).toPrecision(3))} mW`;
}
