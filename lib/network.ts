import { E12, E24 } from "./resistor";

export type NetworkMode = "series" | "parallel";

function clean(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

/** Total resistance of resistors wired in series or in parallel. */
export function combine(values: number[], mode: NetworkMode): number {
  if (values.length === 0) return Number.NaN;
  if (mode === "series") return clean(values.reduce((a, b) => a + b, 0));
  // A 0 Ω branch shorts the whole parallel group.
  if (values.some((v) => v === 0)) return 0;
  return clean(1 / values.reduce((a, b) => a + 1 / b, 0));
}

export interface BranchStats {
  voltage: number;
  current: number;
  power: number;
}

/** Voltage, current and power in each resistor when `voltage` is applied across the network. */
export function analyze(values: number[], mode: NetworkMode, voltage: number): { total: BranchStats; each: BranchStats[] } | null {
  const total = combine(values, mode);
  if (!(voltage > 0) || !(total > 0)) return null;
  const current = voltage / total;
  const each = values.map((r) =>
    mode === "series"
      ? { voltage: current * r, current, power: current * current * r }
      : { voltage, current: voltage / r, power: (voltage * voltage) / r },
  );
  return { total: { voltage, current, power: voltage * current }, each };
}

export interface Combination {
  mode: NetworkMode;
  a: number;
  b: number;
  ohms: number;
  /** Relative error versus the target, signed. */
  error: number;
}

/** Standard values from 1 Ω to 10 MΩ. */
function standardValues(series: number[]): number[] {
  const out: number[] = [];
  for (let exp = 0; exp <= 6; exp++) for (const v of series) out.push(clean(v * 10 ** exp));
  out.push(1e7);
  return out;
}

/**
 * Best two-resistor combinations (series and parallel) from an E-series
 * that approximate `target`. Brute force over ~170 values is cheap enough per keystroke.
 */
export function findCombinations(target: number, seriesName: "E12" | "E24", limit = 3): Combination[] {
  if (!(target > 0)) return [];
  const values = standardValues(seriesName === "E12" ? E12 : E24);
  const found: Combination[] = [];
  for (let i = 0; i < values.length; i++) {
    const a = values[i];
    for (let j = i; j < values.length; j++) {
      const b = values[j];
      const s = a + b;
      const p = (a * b) / (a + b);
      found.push({ mode: "series", a, b, ohms: clean(s), error: (s - target) / target });
      found.push({ mode: "parallel", a, b, ohms: clean(p), error: (p - target) / target });
    }
  }
  found.sort((x, y) => Math.abs(x.error) - Math.abs(y.error));
  // Keep the closest few, skipping repeats of the same pair.
  const seen = new Set<string>();
  const best: Combination[] = [];
  for (const c of found) {
    const key = `${c.mode}:${c.a}:${c.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    best.push(c);
    if (best.length >= limit) break;
  }
  return best;
}
