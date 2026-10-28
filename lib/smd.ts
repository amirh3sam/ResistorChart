import { formatOhms } from "./resistor";

export type SmdFormat = "3-digit" | "4-digit" | "eia96" | "r-notation" | "jumper";

export const SMD_FORMAT_LABEL: Record<SmdFormat, string> = {
  "3-digit": "3-digit (E24)",
  "4-digit": "4-digit (E96)",
  eia96: "EIA-96",
  "r-notation": "R notation",
  jumper: "Zero-ohm jumper",
};

/** EIA-96 code 01–96 maps to E96[code - 1]. */
export const E96 = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169,
  174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294,
  301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511,
  523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887,
  909, 931, 953, 976,
];

/** EIA-96 multiplier letters. Some makers use R/S/H in place of Y/X/B. */
export const EIA96_MULTIPLIERS: { letter: string; alt?: string; exp: number }[] = [
  { letter: "Z", exp: -3 },
  { letter: "Y", alt: "R", exp: -2 },
  { letter: "X", alt: "S", exp: -1 },
  { letter: "A", exp: 0 },
  { letter: "B", alt: "H", exp: 1 },
  { letter: "C", exp: 2 },
  { letter: "D", exp: 3 },
  { letter: "E", exp: 4 },
  { letter: "F", exp: 5 },
];

export type SmdDecodeResult =
  | { ok: true; ohms: number; format: SmdFormat; tolerance: number | null; explanation: string }
  | { ok: false; error: string };

function clean(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

function pow10Label(exp: number): string {
  return exp < 0 ? `${clean(10 ** exp)}` : `10${"⁰¹²³⁴⁵⁶⁷⁸⁹"[exp] ?? `^${exp}`}`;
}

/** Decode a printed SMD resistor code such as "103", "4R7", "1002", "01C" or "000". */
export function decodeSmdCode(input: string): SmdDecodeResult {
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return { ok: false, error: "Enter the code printed on the resistor" };

  if (/^0+$/.test(code) || code === "0R" || code === "R0") {
    return { ok: true, ohms: 0, format: "jumper", tolerance: null, explanation: "All zeros marks a 0 Ω jumper link." };
  }

  // R marks the decimal point: 4R7 = 4.7 Ω, R47 = 0.47 Ω, 10R0 = 10 Ω.
  if (/^\d*R\d*$/.test(code) && code.length >= 2 && code.length <= 5) {
    const ohms = clean(Number(code.replace("R", ".")));
    const digits = code.replace("R", "").replace(/^0+/, "").length;
    return {
      ok: true,
      ohms,
      format: "r-notation",
      tolerance: digits >= 3 ? 1 : 5,
      explanation: `R is the decimal point: ${code} = ${formatOhms(ohms)}.`,
    };
  }

  const eia = code.match(/^(\d{2})([A-Z])$/);
  if (eia) {
    const index = Number(eia[1]);
    const mult = EIA96_MULTIPLIERS.find((m) => m.letter === eia[2] || m.alt === eia[2]);
    if (index < 1 || index > 96) return { ok: false, error: "EIA-96 codes run from 01 to 96" };
    if (!mult) return { ok: false, error: `“${eia[2]}” is not an EIA-96 multiplier letter` };
    const base = E96[index - 1];
    const ohms = clean(base * 10 ** mult.exp);
    return {
      ok: true,
      ohms,
      format: "eia96",
      tolerance: 1,
      explanation: `${eia[1]} → ${base} (EIA-96 table), ${eia[2]} → ×${clean(10 ** mult.exp)}. ${base} × ${clean(
        10 ** mult.exp,
      )} = ${formatOhms(ohms)}.`,
    };
  }

  if (/^\d{3,4}$/.test(code)) {
    const sig = code.slice(0, -1);
    const exp = Number(code.slice(-1));
    const ohms = clean(Number(sig) * 10 ** exp);
    const four = code.length === 4;
    return {
      ok: true,
      ohms,
      format: four ? "4-digit" : "3-digit",
      tolerance: four ? 1 : 5,
      explanation: `First ${four ? "three" : "two"} digits ${sig}, last digit ${exp} = number of zeros. ${Number(
        sig,
      )} × ${pow10Label(exp)} = ${formatOhms(ohms)}.`,
    };
  }

  return { ok: false, error: "Unrecognised code. Try formats like 103, 4R7, 1002 or 01C" };
}

export interface SmdEncoding {
  code: string;
  ohms: number;
  exact: boolean;
}

/** Encode with `digits` significant digits, using R notation for small values. */
function encodeDigits(ohms: number, digits: 2 | 3): SmdEncoding | null {
  if (!(ohms > 0)) return null;
  let exp = Math.floor(Math.log10(ohms)) - (digits - 1);
  let sig = Math.round(clean(ohms / 10 ** exp));
  if (sig >= 10 ** digits) {
    sig = Math.round(sig / 10);
    exp += 1;
  }
  if (exp > 9) return null;
  const actual = clean(sig * 10 ** exp);
  const exact = Math.abs(actual - ohms) / ohms < 1e-9;

  if (exp >= 0) return { code: `${sig}${exp}`, ohms: actual, exact };

  // Below 10 Ω (3-digit) or 100 Ω (4-digit): place R at the decimal point.
  const s = String(sig).padStart(digits, "0");
  const intLen = s.length + exp;
  let code: string;
  if (intLen >= 0) code = `${s.slice(0, intLen)}R${s.slice(intLen)}`;
  else {
    // Milliohm values, e.g. 0.047 Ω → R047, 0.005 Ω → R005.
    code = `R${"0".repeat(-intLen)}${s}`.replace(/0+$/, "");
    if (code.length > digits + 2) return null;
  }
  return { code, ohms: actual, exact };
}

function encodeEia96(ohms: number): SmdEncoding | null {
  if (!(ohms > 0)) return null;
  const exp = Math.floor(Math.log10(ohms)) - 2;
  const sig = clean(ohms / 10 ** exp);
  const index = E96.findIndex((v) => Math.abs(v - sig) < 1e-6);
  const mult = EIA96_MULTIPLIERS.find((m) => m.exp === exp);
  if (index < 0 || !mult) return null;
  return { code: `${String(index + 1).padStart(2, "0")}${mult.letter}`, ohms, exact: true };
}

export interface SmdCodes {
  threeDigit: SmdEncoding | null;
  fourDigit: SmdEncoding | null;
  eia96: SmdEncoding | null;
}

export function getSmdCodes(ohms: number): SmdCodes {
  if (ohms === 0) {
    const zero = { ohms: 0, exact: true };
    return { threeDigit: { code: "000", ...zero }, fourDigit: { code: "0000", ...zero }, eia96: null };
  }
  return {
    threeDigit: encodeDigits(ohms, 2),
    fourDigit: encodeDigits(ohms, 3),
    eia96: encodeEia96(ohms),
  };
}
