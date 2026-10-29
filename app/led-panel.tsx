"use client";

import type { ReactNode } from "react";
import { formatOhms, getColorsFromValue, COLORS } from "@/lib/resistor";
import {
  type ESeriesName,
  type LedResult,
  LED_PRESETS,
  formatCurrent,
  formatPower,
  formatRating,
} from "@/lib/led";
import { ResistorSvg } from "./resistor-svg";
import { FieldLabel, Segmented, Stat, TextField } from "./ui";

export interface LedState {
  supply: string;
  vf: string;
  current: string;
  count: number;
  series: ESeriesName;
  /** Preset name whose Vf was last applied, used for the LED color in the diagram. */
  color: string;
}

const CURRENT_PRESETS = [2, 5, 10, 20, 30];
const SUPPLY_PRESETS = [3.3, 5, 9, 12, 24];
const MAX_LEDS = 10;

export function ledHex(state: LedState): string {
  return LED_PRESETS.find((p) => p.name === state.color)?.hex ?? "#ef3b3b";
}

export function LedPanel({
  state,
  onChange,
  result,
  onOpenInBands,
}: {
  state: LedState;
  onChange: (patch: Partial<LedState>) => void;
  result: LedResult;
  onOpenInBands: (ohms: number) => void;
}) {
  const hex = ledHex(state);
  return (
    <>
      <section className="rounded-3xl border border-border bg-surface p-4">
        <LedCircuit
          supply={state.supply}
          count={state.count}
          hex={hex}
          ohms={result.ok ? result.ohms : null}
          current={result.ok ? result.actualCurrent : null}
        />
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-2">
          <TextField
            label="Supply voltage"
            suffix="V"
            inputMode="decimal"
            value={state.supply}
            onChange={(e) => onChange({ supply: e.target.value })}
            placeholder="e.g. 5"
          />
          <ChipRow>
            {SUPPLY_PRESETS.map((v) => (
              <Chip key={v} on={Number(state.supply) === v} onClick={() => onChange({ supply: String(v) })}>
                {v} V
              </Chip>
            ))}
          </ChipRow>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel text="LED color" kind="pick" />
          <ChipRow>
            {LED_PRESETS.map((p) => (
              <Chip key={p.name} on={state.color === p.name} onClick={() => onChange({ color: p.name, vf: String(p.vf) })}>
                <span className="h-3.5 w-3.5 rounded-full border border-black/20 dark:border-white/25" style={{ background: p.hex }} />
                {p.name}
                <span className="font-normal text-muted">{p.vf} V</span>
              </Chip>
            ))}
          </ChipRow>
          <TextField
            label="LED forward voltage"
            suffix="V"
            inputMode="decimal"
            value={state.vf}
            onChange={(e) => onChange({ vf: e.target.value })}
            placeholder="e.g. 2.0"
          />
          <p className="text-xs text-muted">Typical values shown. Check your LED&apos;s datasheet for the exact forward voltage.</p>
        </div>

        <div className="flex flex-col gap-2">
          <TextField
            label="LED current"
            suffix="mA"
            inputMode="decimal"
            value={state.current}
            onChange={(e) => onChange({ current: e.target.value })}
            placeholder="e.g. 20"
          />
          <ChipRow>
            {CURRENT_PRESETS.map((v) => (
              <Chip key={v} on={Number(state.current) === v} onClick={() => onChange({ current: String(v) })}>
                {v} mA
              </Chip>
            ))}
          </ChipRow>
          <p className="text-xs text-muted">Standard 5 mm LEDs: 20 mA max. 5–10 mA is usually bright enough for indicators.</p>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel text="LEDs in series" kind="pick" />
          <div className="flex items-center gap-3">
            <StepButton label="One fewer LED" disabled={state.count <= 1} onClick={() => onChange({ count: state.count - 1 })}>
              −
            </StepButton>
            <span className="min-w-12 text-center text-2xl font-bold tabular-nums" aria-live="polite">
              {state.count}
            </span>
            <StepButton label="One more LED" disabled={state.count >= MAX_LEDS} onClick={() => onChange({ count: state.count + 1 })}>
              +
            </StepButton>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel text="Round to standard values" kind="pick" />
          <Segmented
            label="E-series"
            value={state.series}
            options={[
              { value: "E12", label: "E12 (common)" },
              { value: "E24", label: "E24 (closer)" },
            ]}
            onChange={(series) => onChange({ series })}
          />
        </div>
      </section>

      {result.ok ? <LedResultCard result={result} onOpenInBands={onOpenInBands} /> : (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{result.error}</p>
      )}

      <details className="group rounded-3xl border border-border bg-surface">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          How it&apos;s calculated
          <span className="text-muted transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="flex flex-col gap-2 px-4 pb-4 text-sm text-muted">
          <p className="rounded-2xl bg-surface-2 px-3 py-2 font-mono text-fg">R = (V<sub>supply</sub> − n × V<sub>f</sub>) ÷ I</p>
          <p>
            The resistor drops the voltage the LEDs don&apos;t use. The result is rounded <strong className="text-fg">up</strong> to the
            next standard value so the LED never gets more current than you asked for.
          </p>
          <p>
            Power rating is chosen at least 2× the power the resistor burns (P = I² × R), so it stays cool.
          </p>
          <p>
            Wiring several LEDs in series wastes less power than giving each its own resistor, as long as the supply is
            comfortably above their total forward voltage.
          </p>
        </div>
      </details>
    </>
  );
}

function LedResultCard({ result, onOpenInBands }: { result: Extract<LedResult, { ok: true }>; onOpenInBands: (ohms: number) => void }) {
  const bands = getColorsFromValue(result.ohms, 4, "gold");
  const lowHeadroom = result.headroom < 1;
  return (
    <section className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">Use a resistor of</p>
          <p className="text-4xl font-bold tabular-nums">{formatOhms(result.ohms)}</p>
          <p className="mt-0.5 text-sm text-muted tabular-nums">Exact: {formatOhms(result.exactOhms)}</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-fg">
          {result.rating ? `${formatRating(result.rating)} min` : "> 10 W"}
        </span>
      </div>

      {bands.ok && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <div className="w-24 shrink-0">
            <ResistorSvg bands={bands.bands} count={4} activeBand={-1} compact />
          </div>
          <div className="min-w-0 flex-1 text-xs text-muted">
            {bands.bands.map((c) => COLORS[c].label).join(" · ")}
            <button onClick={() => onOpenInBands(result.ohms)} className="mt-0.5 block font-semibold text-accent underline">
              Open in Color Bands
            </button>
          </div>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Stat label="LED current" value={formatCurrent(result.actualCurrent)} />
        <Stat label="Resistor power" value={formatPower(result.resistorPower)} />
        <Stat label="LED power" value={formatPower(result.ledPower)} />
        <Stat label="Efficiency" value={`${Math.round(result.efficiency * 100)}%`} />
      </dl>

      {!result.rating && (
        <p className="mt-3 rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
          The resistor would burn over 5 W. Use a constant-current LED driver instead.
        </p>
      )}
      {result.rating && lowHeadroom && (
        <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">
          Only {result.headroom} V is left for the resistor, so brightness will change noticeably with supply and LED
          variation. A higher supply or fewer LEDs in series is more stable.
        </p>
      )}
    </section>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{children}</div>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 ${
        on ? "border-accent bg-accent/15" : "border-border bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-2xl font-semibold transition active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Schematic: supply → resistor → LED(s) → back to supply. */
function LedCircuit({
  supply,
  count,
  hex,
  ohms,
  current,
}: {
  supply: string;
  count: number;
  hex: string;
  ohms: number | null;
  current: number | null;
}) {
  const shown = Math.min(count, 3);
  const ledXs = Array.from({ length: shown }, (_, i) => 196 + i * 40 - (shown - 1) * 20);
  return (
    <svg viewBox="0 0 320 150" className="block h-auto w-full text-fg" role="img" aria-label="LED circuit diagram">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
        {/* wires */}
        <path d="M40 58V30H90M150 30H300V120H40V82" />
        {/* battery */}
        <path d="M24 58h32M32 70h16" strokeWidth="3" />
        <path d="M40 70v12" />
      </g>
      <text x="62" y="62" fontSize="12" fill="currentColor" opacity="0.7">+</text>
      <text x="33" y="104" textAnchor="end" fontSize="13" fontWeight="600" fill="currentColor">{supply || "?"} V</text>

      {/* resistor */}
      <rect x="90" y="22" width="60" height="16" rx="3" fill="var(--accent)" />
      <text x="120" y="14" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
        {ohms !== null ? formatOhms(ohms) : "R"}
      </text>

      {/* LEDs on the return wire, pointing in the direction of current flow */}
      {ledXs.map((x, i) => (
        <g key={i} transform={`translate(${x} 120)`}>
          <rect x="-16" y="-14" width="32" height="28" fill="var(--surface)" />
          <path d="M10 -12 L-10 0 L10 12 Z" fill={hex} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-10 -12 V12" stroke="currentColor" strokeWidth="2.5" />
          <g stroke={hex} strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M-2 -16 l-6 -8 M-9 -21 l1 -3 l3 1" />
            <path d="M6 -16 l-6 -8 M-1 -21 l1 -3 l3 1" />
          </g>
        </g>
      ))}
      {count > 3 && (
        <text x="196" y="146" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">
          × {count} LEDs
        </text>
      )}

      {current !== null && (
        <g>
          <path d="M210 30h24" stroke="var(--accent)" strokeWidth="2.5" />
          <path d="M230 25l6 5-6 5" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <text x="222" y="52" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--accent)">
            {formatCurrent(current)}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Small LED drawing for the sticky header. */
export function LedGlyph({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 80 50" className="block h-auto w-full" aria-hidden>
      <circle cx="40" cy="20" r="16" fill={hex} opacity="0.25" />
      <path d="M30 34V20a10 10 0 0 1 20 0v14Z" fill={hex} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <rect x="27" y="34" width="26" height="4" rx="1" fill={hex} />
      <path d="M35 38v10M45 38v7" stroke="#a9adb5" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
