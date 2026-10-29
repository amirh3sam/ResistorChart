"use client";

import { useSyncExternalStore } from "react";
import { type BandCount, type ColorName, COLORS, colorsForRole, getBandSpecs } from "@/lib/resistor";
import { LED_PRESETS } from "@/lib/led";
import type { LedState } from "./led-panel";
import type { NetworkState } from "./network-panel";
import type { SmdMode } from "./smd-panel";
import { STATE_KEY } from "@/lib/storage-keys";

export type Tab = "bands" | "smd" | "led" | "network";
export type Mode = "colors" | "value";

/** Everything needed to reopen the app exactly where it was left. */
export interface SavedState {
  tab: Tab;
  count: BandCount;
  bands: ColorName[];
  mode: Mode;
  valueInput: string;
  smdMode: SmdMode;
  smdCode: string;
  smdValue: string;
  led: LedState;
  network: NetworkState;
}

/** 4.7 kΩ in each band count, used when saved bands don't fit the saved count. */
const DEFAULT_BANDS: Record<BandCount, ColorName[]> = {
  4: ["yellow", "violet", "red", "gold"],
  5: ["yellow", "violet", "black", "brown", "brown"],
  6: ["yellow", "violet", "black", "brown", "brown", "brown"],
};

export const DEFAULT_STATE: SavedState = {
  tab: "bands",
  count: 4,
  bands: DEFAULT_BANDS[4],
  mode: "colors",
  valueInput: "4.7k",
  smdMode: "code",
  smdCode: "103",
  smdValue: "10k",
  led: { supply: "5", vf: "2", current: "20", count: 1, series: "E12", color: "Red" },
  network: { mode: "series", values: ["1k", "2.2k"], voltage: "", target: "", series: "E12" },
};


const MAX_TEXT = 32;

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length <= MAX_TEXT ? value : fallback;
}

function validBands(value: unknown, count: BandCount): ColorName[] | null {
  const specs = getBandSpecs(count);
  if (!Array.isArray(value) || value.length !== specs.length) return null;
  const ok = value.every((c, i) => c in COLORS && colorsForRole(specs[i].role).includes(c as ColorName));
  return ok ? (value as ColorName[]) : null;
}

/** Turn whatever is in storage into a valid state, keeping each field that checks out. */
export function sanitize(raw: unknown): SavedState {
  const d = DEFAULT_STATE;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const count = pick<BandCount>(r.count, [4, 5, 6], d.count);
  const led = (r.led ?? {}) as Record<string, unknown>;
  const net = (r.network ?? {}) as Record<string, unknown>;
  const ledCount = typeof led.count === "number" && Number.isInteger(led.count) ? Math.min(10, Math.max(1, led.count)) : d.led.count;
  const values = Array.isArray(net.values) ? net.values.slice(0, 10).map((v) => text(v, "")) : d.network.values;

  return {
    tab: pick<Tab>(r.tab, ["bands", "smd", "led", "network"], d.tab),
    count,
    // Bands from a different band count can't be reused, so fall back to 4.7 kΩ in that count.
    bands: validBands(r.bands, count) ?? DEFAULT_BANDS[count],
    mode: pick<Mode>(r.mode, ["colors", "value"], d.mode),
    valueInput: text(r.valueInput, d.valueInput),
    smdMode: pick<SmdMode>(r.smdMode, ["code", "value"], d.smdMode),
    smdCode: text(r.smdCode, d.smdCode),
    smdValue: text(r.smdValue, d.smdValue),
    led: {
      supply: text(led.supply, d.led.supply),
      vf: text(led.vf, d.led.vf),
      current: text(led.current, d.led.current),
      count: ledCount,
      series: pick(led.series, ["E12", "E24"] as const, d.led.series),
      color: pick(led.color, LED_PRESETS.map((p) => p.name), d.led.color),
    },
    network: {
      mode: pick(net.mode, ["series", "parallel"] as const, d.network.mode),
      values: values.length ? values : d.network.values,
      voltage: text(net.voltage, d.network.voltage),
      target: text(net.target, d.network.target),
      series: pick(net.series, ["E12", "E24"] as const, d.network.series),
    },
  };
}

export function saveState(state: SavedState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or storage full: the app still works, it just won't remember.
  }
}

// Read storage once per page load. Later saves must not change the snapshot,
// or the calculator would remount on every keystroke.
let snapshot: SavedState | null | undefined;

function readOnce(): SavedState | null {
  if (snapshot === undefined) {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      snapshot = raw ? sanitize(JSON.parse(raw)) : null;
    } catch {
      snapshot = null;
    }
  }
  return snapshot;
}

const noSubscribe = () => () => {};

/**
 * The state saved by the last visit, or null. The server (and hydration) see
 * null, so the static HTML always matches; the saved state arrives in the
 * render right after hydration.
 */
export function useSavedState(): { saved: SavedState | null; hydrated: boolean } {
  const saved = useSyncExternalStore(noSubscribe, readOnce, () => null);
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return { saved, hydrated };
}
