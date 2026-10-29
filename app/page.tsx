"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type BandCount,
  type BandRole,
  type ColorName,
  COLORS,
  COLOR_ORDER,
  E12,
  E24,
  calculateFromColors,
  colorsForRole,
  formatMultiplier,
  formatOhms,
  formatTolerance,
  getBandSpecs,
  getColorsFromValue,
  isInSeries,
  nearestStandard,
  parseResistance,
} from "@/lib/resistor";
import { calculateLed, formatRating } from "@/lib/led";
import { decodeSmdCode } from "@/lib/smd";
import { type SmdMode, SmdChip, SmdPanel } from "./smd-panel";
import { type LedState, LedGlyph, LedPanel, ledHex } from "./led-panel";
import { type NetworkState, NetworkPanel, networkTotal } from "./network-panel";
import { ResistorSvg } from "./resistor-svg";
import { type Mode, type SavedState, type Tab, DEFAULT_STATE, saveState, useSavedState } from "./saved-state";
import { ThemeToggle } from "./theme-toggle";
import { FieldLabel, Segmented, Stat, TextField } from "./ui";

const DEFAULT_TEMPCO: ColorName = "brown";

function defaultTolerance(count: BandCount): ColorName {
  return count === 4 ? "gold" : "brown";
}

/** "4.7 kΩ" -> "4.7k", suitable for the value input. */
function shortOhms(ohms: number): string {
  return formatOhms(ohms).replace(/ ?Ω$/, "").replace(" ", "");
}

/** Bands for a value, falling back to 1 kΩ if the value cannot be encoded. */
function bandsFor(ohms: number, count: BandCount, tol: ColorName, tc: ColorName): ColorName[] {
  const res = getColorsFromValue(ohms, count, tol, tc);
  if (res.ok) return res.bands;
  return (getColorsFromValue(1000, count, tol, tc) as { bands: ColorName[] }).bands;
}

export default function Home() {
  const { saved, hydrated } = useSavedState();
  // Remount with the saved state once it's read, right after hydration.
  return <Calculator key={saved ? "saved" : "default"} initial={saved ?? DEFAULT_STATE} persist={hydrated} />;
}

function Calculator({ initial, persist }: { initial: SavedState; persist: boolean }) {
  const [count, setCount] = useState<BandCount>(initial.count);
  const [bands, setBands] = useState<ColorName[]>(initial.bands);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [activeBand, setActiveBand] = useState(0);
  const [valueInput, setValueInput] = useState(initial.valueInput);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [network, setNetwork] = useState<NetworkState>(initial.network);
  const [led, setLed] = useState<LedState>(initial.led);
  const [smdMode, setSmdMode] = useState<SmdMode>(initial.smdMode);
  const [smdCode, setSmdCode] = useState(initial.smdCode);
  const [smdValue, setSmdValue] = useState(initial.smdValue);

  // Skipped during hydration so the defaults never overwrite a saved session.
  useEffect(() => {
    if (!persist) return;
    delete document.documentElement.dataset.restoring;
    saveState({ tab, count, bands, mode, valueInput, smdMode, smdCode, smdValue, led, network });
  }, [persist, tab, count, bands, mode, valueInput, smdMode, smdCode, smdValue, led, network]);

  const specs = getBandSpecs(count);
  const result = useMemo(() => calculateFromColors(bands, count), [bands, count]);
  const tolIndex = specs.findIndex((s) => s.role === "tolerance");
  const tcIndex = specs.findIndex((s) => s.role === "tempCoef");
  const tolerance = bands[tolIndex];
  const tempCoef = tcIndex >= 0 ? bands[tcIndex] : DEFAULT_TEMPCO;

  const parsed = parseResistance(valueInput);
  const fromValue = getColorsFromValue(parsed, count, tolerance, tempCoef);

  function changeCount(next: BandCount) {
    if (next === count) return;
    // Keep the tolerance the user chose, but use the conventional default when
    // moving between 4-band (usually ±5%) and precision 5/6-band (usually ±1%).
    const tol = tolerance === defaultTolerance(count) ? defaultTolerance(next) : tolerance;
    const target = mode === "value" && Number.isFinite(parsed) ? parsed : result.ohms;
    setBands(bandsFor(target, next, tol, tempCoef));
    setCount(next);
    setActiveBand((i) => Math.min(i, getBandSpecs(next).length - 1));
  }

  function setBand(index: number, color: ColorName) {
    setBands((prev) => prev.map((c, i) => (i === index ? color : c)));
    // Advance to the next band so a full code can be entered with quick taps.
    if (index < specs.length - 1) setActiveBand(index + 1);
  }

  function changeValueInput(text: string) {
    setValueInput(text);
    const res = getColorsFromValue(parseResistance(text), count, tolerance, tempCoef);
    if (res.ok) setBands(res.bands);
  }

  function applyValue(ohms: number) {
    const res = getColorsFromValue(ohms, count, tolerance, tempCoef);
    if (!res.ok) return;
    setBands(res.bands);
    setValueInput(shortOhms(ohms));
  }

  function openInBands(ohms: number) {
    setTab("bands");
    setMode("colors");
    applyValue(ohms);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function switchMode(next: Mode) {
    if (next === "value") setValueInput(shortOhms(result.ohms));
    setMode(next);
  }

  const smdDecoded = decodeSmdCode(smdCode);
  const smdValueOhms = parseResistance(smdValue);
  const ledResult = calculateLed({
    supply: Number(led.supply),
    vf: Number(led.vf),
    current: Number(led.current) / 1000,
    count: led.count,
    series: led.series,
  });

  let header: { visual: ReactNode; value: string; tolerance: string | null };
  if (tab === "network") {
    const total = networkTotal(network);
    header = {
      visual: <NetworkIcon className="h-10 w-full text-accent" />,
      value: Number.isFinite(total) ? formatOhms(total) : "—",
      tolerance: network.mode === "series" ? "series" : "parallel",
    };
  } else if (tab === "led") {
    header = {
      visual: <LedGlyph hex={ledHex(led)} />,
      value: ledResult.ok ? formatOhms(ledResult.ohms) : "—",
      tolerance: ledResult.ok && ledResult.rating ? formatRating(ledResult.rating) : null,
    };
  } else if (tab === "bands") {
    header = {
      visual: <ResistorSvg bands={bands} count={count} activeBand={-1} compact />,
      value: formatOhms(result.ohms),
      tolerance: formatTolerance(result.tolerance),
    };
  } else if (smdMode === "code") {
    header = {
      visual: <SmdChip code={smdCode.trim().toUpperCase()} compact />,
      value: smdDecoded.ok ? formatOhms(smdDecoded.ohms) : "—",
      tolerance: smdDecoded.ok && smdDecoded.tolerance !== null ? formatTolerance(smdDecoded.tolerance) : null,
    };
  } else {
    const ok = Number.isFinite(smdValueOhms) && smdValueOhms >= 0;
    header = { visual: <SmdChip code="Ω" compact />, value: ok ? formatOhms(smdValueOhms) : "—", tolerance: null };
  }

  return (
    <div className="restore-hide mx-auto flex w-full max-w-xl flex-1 flex-col">
      <StickyResult {...header} />

      <main className="flex flex-col gap-4 px-4 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <Segmented
          label="Resistor type"
          variant="primary"
          columns={2}
          value={tab}
          options={[
            { value: "bands", label: <><BandsIcon />Color Bands</> },
            { value: "smd", label: <><ChipIcon />SMD Code</> },
            { value: "led", label: <><LedIcon />LED Resistor</> },
            { value: "network", label: <><NetworkIcon className="h-4 w-4" />Series / Parallel</> },
          ]}
          onChange={setTab}
        />

        {tab === "network" ? (
          <NetworkPanel state={network} onChange={(patch) => setNetwork((s) => ({ ...s, ...patch }))} onOpenInBands={openInBands} />
        ) : tab === "led" ? (
          <LedPanel state={led} onChange={(patch) => setLed((s) => ({ ...s, ...patch }))} result={ledResult} onOpenInBands={openInBands} />
        ) : tab === "smd" ? (
          <SmdPanel
            mode={smdMode}
            onMode={setSmdMode}
            code={smdCode}
            onCode={setSmdCode}
            valueInput={smdValue}
            onValueInput={setSmdValue}
            decoded={smdDecoded}
          />
        ) : (
          <>
          <Segmented
            label="Number of bands"
            value={count}
            options={[
              { value: 4, label: "4 Band" },
              { value: 5, label: "5 Band" },
              { value: 6, label: "6 Band" },
            ]}
            onChange={changeCount}
          />

          <section className="rounded-3xl border border-border bg-surface p-4">
            <ResistorSvg bands={bands} count={count} activeBand={mode === "colors" ? activeBand : -1} onBandClick={(i) => {
              setMode("colors");
              setActiveBand(i);
            }} />
            <div className="mt-2 flex justify-center gap-1.5 text-[11px] text-muted">
              {specs.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-border" style={{ background: COLORS[bands[i]].hex }} />
                  {COLORS[bands[i]].label}
                </span>
              ))}
            </div>
          </section>

          <ResultCard result={result} />

          <Segmented
            label="Calculator mode"
            value={mode}
            options={[
              { value: "colors", label: "Colors → Value" },
              { value: "value", label: "Value → Colors" },
            ]}
            onChange={switchMode}
          />

          {mode === "colors" ? (
            <section className="rounded-3xl border border-border bg-surface p-4">
              <div className="mb-2">
                <FieldLabel text="Pick band, then color" kind="pick" />
              </div>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Bands">
                {specs.map((s, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={activeBand === i}
                    onClick={() => setActiveBand(i)}
                    className={`flex min-h-14 shrink-0 flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition ${
                      activeBand === i ? "border-accent bg-surface-2 ring-2 ring-accent/40" : "border-border bg-surface"
                    }`}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{s.label}</span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Swatch color={bands[i]} className="h-3.5 w-3.5" />
                      {COLORS[bands[i]].label}
                    </span>
                  </button>
                ))}
              </div>
              <ColorPalette
                role={specs[activeBand].role}
                selected={bands[activeBand]}
                onSelect={(c) => setBand(activeBand, c)}
              />
            </section>
          ) : (
            <ValueInputPanel
              count={count}
              valueInput={valueInput}
              onValueInput={changeValueInput}
              fromValue={fromValue}
              parsed={parsed}
              tolerance={tolerance}
              tempCoef={tcIndex >= 0 ? tempCoef : null}
              onTolerance={(c) => setBands((prev) => prev.map((b, i) => (i === tolIndex ? c : b)))}
              onTempCoef={(c) => setBands((prev) => prev.map((b, i) => (i === tcIndex ? c : b)))}
              onApply={applyValue}
            />
          )}

          <ESeriesPanel ohms={result.ohms} onPick={(v) => applyValue(v)} />

          <ReferenceChart />
          </>
        )}

        <footer className="flex flex-col gap-1.5 pt-2 text-center text-xs text-muted">
          <p>
            Made by{" "}
            <a href="https://amirhesamtech.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-fg underline underline-offset-4">
              AmirHesam Tech
            </a>
            {" · "}
            <a href="https://www.tiktok.com/@techwithamirh3sam" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              @techwithamirh3sam
            </a>
          </p>
          <p>Tip: add this page to your home screen for a full-screen app.</p>
        </footer>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StickyResult({ visual, value, tolerance }: { visual: ReactNode; value: string; tolerance: string | null }) {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-20 shrink-0" aria-hidden>
          {visual}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[11px] font-medium uppercase tracking-widest text-muted">
            <span className="sr-only">Resistor Calculator </span>by AmirHesam Tech
          </h1>
          <p className="truncate text-2xl font-bold tabular-nums" aria-live="polite">
            {value} {tolerance && <span className="text-base font-semibold text-accent">{tolerance}</span>}
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Swatch({ color, className = "" }: { color: ColorName; className?: string }) {
  const info = COLORS[color];
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-black/20 dark:border-white/25 ${className}`}
      style={
        color === "none"
          ? { background: "repeating-linear-gradient(45deg, transparent 0 3px, var(--muted) 3px 4px)" }
          : { background: info.hex }
      }
    />
  );
}

function roleValueLabel(role: BandRole, color: ColorName): string {
  const info = COLORS[color];
  switch (role) {
    case "digit":
      return String(info.digit);
    case "multiplier":
      return formatMultiplier(info.multiplierExp!);
    case "tolerance":
      return formatTolerance(info.tolerance!);
    case "tempCoef":
      return `${info.tempCoef} ppm`;
  }
}

function ColorPalette({ role, selected, onSelect }: { role: BandRole; selected: ColorName; onSelect: (c: ColorName) => void }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {colorsForRole(role).map((c) => {
        const info = COLORS[c];
        const isSel = c === selected;
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            aria-pressed={isSel}
            className={`relative flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 text-center transition active:scale-95 ${
              isSel ? "border-accent" : "border-black/10 dark:border-white/10"
            }`}
            style={
              c === "none"
                ? { background: "var(--surface-2)", color: "var(--fg)" }
                : { background: info.hex, color: info.text }
            }
          >
            <span className="text-base font-bold leading-tight">{roleValueLabel(role, c)}</span>
            <span className="text-[11px] font-medium opacity-80">{info.label}</span>
            {isSel && (
              <span className="absolute top-1 right-1.5 text-xs font-bold" aria-hidden>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ResultCard({ result }: { result: ReturnType<typeof calculateFromColors> }) {
  const inE12 = isInSeries(result.ohms, E12);
  const inE24 = isInSeries(result.ohms, E24);
  return (
    <section className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Value</p>
          <p className="text-4xl font-bold tabular-nums">{formatOhms(result.ohms)}</p>
          <p className="mt-0.5 text-sm text-muted tabular-nums">{result.ohms.toLocaleString("en-US")} Ω</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-fg">{formatTolerance(result.tolerance)}</span>
          <div className="flex gap-1">
            <SeriesBadge name="E12" on={inE12} />
            <SeriesBadge name="E24" on={inE24} />
          </div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Stat label="Minimum" value={formatOhms(result.min)} />
        <Stat label="Maximum" value={formatOhms(result.max)} />
        {result.tempCoef !== null && <Stat label="Temp. coefficient" value={`${result.tempCoef} ppm/K`} wide />}
      </dl>
    </section>
  );
}

function SeriesBadge({ name, on }: { name: string; on: boolean }) {
  return (
    <span
      title={on ? `Standard ${name} value` : `Not an ${name} value`}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        on ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "border-border text-muted line-through opacity-70"
      }`}
    >
      {name}
    </span>
  );
}

function ValueInputPanel({
  count,
  valueInput,
  onValueInput,
  fromValue,
  parsed,
  tolerance,
  tempCoef,
  onTolerance,
  onTempCoef,
  onApply,
}: {
  count: BandCount;
  valueInput: string;
  onValueInput: (s: string) => void;
  fromValue: ReturnType<typeof getColorsFromValue>;
  parsed: number;
  tolerance: ColorName;
  tempCoef: ColorName | null;
  onTolerance: (c: ColorName) => void;
  onTempCoef: (c: ColorName) => void;
  onApply: (ohms: number) => void;
}) {
  const showError = valueInput.trim() !== "" && !fromValue.ok;
  const e12 = nearestStandard(parsed, E12);
  const e24 = nearestStandard(parsed, E24);
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-1.5">
        <TextField
          label="Target resistance"
          suffix="Ω"
          value={valueInput}
          onChange={(e) => onValueInput(e.target.value)}
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. 4700, 4.7k, 4k7, 1M"
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pt-1">
          {["k", "M", "R"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onValueInput(valueInput.replace(/[kKmMrRgG]$/, "") + s)}
              className="min-h-10 min-w-12 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold active:scale-95"
            >
              {s === "R" ? "Ω" : s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onValueInput("")}
            className="min-h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-muted active:scale-95"
          >
            Clear
          </button>
        </div>
      </div>

      {showError && <p className="text-sm font-medium text-danger">{fromValue.ok ? "" : fromValue.error}</p>}
      {fromValue.ok && !fromValue.exact && (
        <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">
          A {count}-band code holds {count === 4 ? 2 : 3} significant digits — rounded to{" "}
          <strong className="text-fg">{formatOhms(fromValue.ohms)}</strong>.
        </p>
      )}

      {Number.isFinite(e12) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Nearest standard:</span>
          <button onClick={() => onApply(e12)} className="min-h-10 rounded-xl border border-border bg-surface-2 px-3 font-semibold active:scale-95">
            E12 · {formatOhms(e12)}
          </button>
          <button onClick={() => onApply(e24)} className="min-h-10 rounded-xl border border-border bg-surface-2 px-3 font-semibold active:scale-95">
            E24 · {formatOhms(e24)}
          </button>
        </div>
      )}

      <ChipPicker label="Tolerance" role="tolerance" selected={tolerance} onSelect={onTolerance} />
      {tempCoef && <ChipPicker label="Temperature coefficient" role="tempCoef" selected={tempCoef} onSelect={onTempCoef} />}
    </section>
  );
}

function ChipPicker({ label, role, selected, onSelect }: { label: string; role: BandRole; selected: ColorName; onSelect: (c: ColorName) => void }) {
  return (
    <div>
      <div className="mb-1.5">
        <FieldLabel text={label} kind="pick" />
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {colorsForRole(role).map((c) => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            aria-pressed={c === selected}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${
              c === selected ? "border-accent bg-accent/15" : "border-border bg-surface-2"
            }`}
          >
            <Swatch color={c} className="h-3.5 w-3.5" />
            {roleValueLabel(role, c)}
          </button>
        ))}
      </div>
    </div>
  );
}

const DECADES = [
  { exp: 0, label: "Ω" },
  { exp: 1, label: "10 Ω" },
  { exp: 2, label: "100 Ω" },
  { exp: 3, label: "kΩ" },
  { exp: 4, label: "10 kΩ" },
  { exp: 5, label: "100 kΩ" },
  { exp: 6, label: "MΩ" },
];

function ESeriesPanel({ ohms, onPick }: { ohms: number; onPick: (v: number) => void }) {
  const [series, setSeries] = useState<"E12" | "E24">("E12");
  const [decade, setDecade] = useState(3);
  const values = series === "E12" ? E12 : E24;
  return (
    <details className="group rounded-3xl border border-border bg-surface" open>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        Standard values (E12 / E24)
        <span className="text-muted transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-sm text-muted">
          E12 values are stocked at ±10%, E24 at ±5%. Tap a value to load it into the calculator.
        </p>
        <Segmented
          label="E-series"
          value={series}
          options={[
            { value: "E12", label: "E12 (12 values)" },
            { value: "E24", label: "E24 (24 values)" },
          ]}
          onChange={setSeries}
        />
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {DECADES.map((d) => (
            <button
              key={d.exp}
              onClick={() => setDecade(d.exp)}
              className={`min-h-10 shrink-0 rounded-xl border px-3 text-sm font-semibold ${
                decade === d.exp ? "border-accent bg-accent/15" : "border-border bg-surface-2 text-muted"
              }`}
            >
              ×{d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {values.map((v) => {
            const value = Number.parseFloat((v * 10 ** decade).toPrecision(6));
            const active = Math.abs(value - ohms) / value < 1e-9;
            return (
              <button
                key={v}
                onClick={() => onPick(value)}
                className={`min-h-12 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-95 ${
                  active ? "border-accent bg-accent/15 text-fg ring-1 ring-accent" : "border-border bg-surface-2"
                }`}
              >
                {shortOhms(value)}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function ReferenceChart() {
  return (
    <details className="group rounded-3xl border border-border bg-surface">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        Color code reference chart
        <span className="text-muted transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="overflow-x-auto px-2 pb-3">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-2 py-2 font-medium">Color</th>
              <th className="px-2 py-2 text-center font-medium">Digit</th>
              <th className="px-2 py-2 font-medium">Multiplier</th>
              <th className="px-2 py-2 font-medium">Tol.</th>
              <th className="px-2 py-2 font-medium">ppm/K</th>
            </tr>
          </thead>
          <tbody>
            {COLOR_ORDER.map((c) => {
              const info = COLORS[c];
              return (
                <tr key={c} className="border-t border-border">
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Swatch color={c} className="h-5 w-5" />
                      {info.label}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">{info.digit ?? "—"}</td>
                  <td className="px-2 py-2">{info.multiplierExp !== null ? formatMultiplier(info.multiplierExp) : "—"}</td>
                  <td className="px-2 py-2">{info.tolerance !== null ? formatTolerance(info.tolerance) : "—"}</td>
                  <td className="px-2 py-2">{info.tempCoef ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-2 pt-2 text-xs text-muted">
          Read from the end with bands grouped closest together. The wider-spaced band is tolerance.
        </p>
      </div>
    </details>
  );
}

function BandsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="M2 12h3M19 12h3" />
      <rect x="5" y="7" width="14" height="10" rx="3" />
      <path d="M9 7v10M12 7v10M16 7v10" />
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="6" y="7" width="12" height="10" rx="1" />
      <path d="M3 9h3v6H3zM18 9h3v6h-3z" />
    </svg>
  );
}

function LedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M8 20v-9a4 4 0 0 1 8 0v9M6 20h12M10 20v3M14 20v3" />
      <path d="M4 6 2.5 4.5M20 6l1.5-1.5M12 3V1" />
    </svg>
  );
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 12h3M19 12h3M5 7v10M19 7v10M5 7h4M15 7h4M5 17h4M15 17h4" />
      <rect x="9" y="5" width="6" height="4" rx="1" />
      <rect x="9" y="15" width="6" height="4" rx="1" />
    </svg>
  );
}
