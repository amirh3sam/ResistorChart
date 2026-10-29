"use client";

import { type ReactNode, useMemo } from "react";
import { E12, E24, formatOhms, isInSeries, parseResistance } from "@/lib/resistor";
import { type NetworkMode, analyze, combine, findCombinations } from "@/lib/network";
import { formatCurrent, formatPower } from "@/lib/led";
import { FieldLabel, Segmented, Stat, TextField } from "./ui";

export interface NetworkState {
  mode: NetworkMode;
  values: string[];
  voltage: string;
  target: string;
  series: "E12" | "E24";
}

const MAX_RESISTORS = 10;

/** Parse the typed values; invalid or empty entries come back as NaN. */
export function parseValues(values: string[]): number[] {
  return values.map((v) => {
    const n = parseResistance(v);
    return n >= 0 ? n : Number.NaN;
  });
}

export function networkTotal(state: NetworkState): number {
  const valid = parseValues(state.values).filter((v) => Number.isFinite(v));
  return valid.length ? combine(valid, state.mode) : Number.NaN;
}

export function NetworkPanel({
  state,
  onChange,
  onOpenInBands,
}: {
  state: NetworkState;
  onChange: (patch: Partial<NetworkState>) => void;
  onOpenInBands: (ohms: number) => void;
}) {
  const parsed = parseValues(state.values);
  const valid = parsed.filter((v) => Number.isFinite(v));
  const total = valid.length ? combine(valid, state.mode) : Number.NaN;
  const voltage = Number(state.voltage);
  const stats = valid.length === parsed.length ? analyze(parsed, state.mode, voltage) : null;

  function setValue(i: number, v: string) {
    onChange({ values: state.values.map((old, j) => (j === i ? v : old)) });
  }

  return (
    <>
      <Segmented
        label="Wiring"
        value={state.mode}
        options={[
          { value: "series", label: "Series" },
          { value: "parallel", label: "Parallel" },
        ]}
        onChange={(mode) => onChange({ mode })}
      />

      <section className="rounded-3xl border border-border bg-surface p-4">
        <NetworkDiagram values={parsed} mode={state.mode} />
      </section>

      <section className="flex flex-col gap-2 rounded-3xl border border-border bg-surface p-4">
        <FieldLabel text="Resistor values" kind="type" />
        {state.values.map((v, i) => {
          const bad = v.trim() !== "" && !Number.isFinite(parsed[i]);
          return (
            <div key={i} className="flex items-center gap-2">
              <TextField
                compact
                label={`R${i + 1}`}
                suffix="Ω"
                value={v}
                onChange={(e) => setValue(i, e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. 4.7k"
                aria-invalid={bad}
              />
              <button
                type="button"
                aria-label={`Remove R${i + 1}`}
                disabled={state.values.length <= 1}
                onClick={() => onChange({ values: state.values.filter((_, j) => j !== i) })}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-xl text-muted transition active:scale-95 disabled:opacity-30"
              >
                ×
              </button>
            </div>
          );
        })}
        {parsed.some((n, i) => !Number.isFinite(n) && state.values[i].trim() !== "") && (
          <p className="text-sm font-medium text-danger">Some values aren&apos;t understood. Try 470, 4.7k, 4k7 or 1M.</p>
        )}
        <button
          type="button"
          disabled={state.values.length >= MAX_RESISTORS}
          onClick={() => onChange({ values: [...state.values, ""] })}
          className="mt-1 min-h-12 rounded-xl border border-dashed border-border text-sm font-semibold text-muted transition active:scale-[0.98] disabled:opacity-40"
        >
          + Add resistor
        </button>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Total resistance</p>
        <p className="text-4xl font-bold tabular-nums">{Number.isFinite(total) ? formatOhms(total) : "—"}</p>
        {Number.isFinite(total) && (
          <>
            <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 font-mono text-sm break-words">
              {formula(valid, state.mode, total)}
            </p>
            {total > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <SeriesNote total={total} />
                <button onClick={() => onOpenInBands(total)} className="font-semibold text-accent underline">
                  Open in Color Bands
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-4">
          <TextField
            label="Voltage across it (optional)"
            suffix="V"
            inputMode="decimal"
            value={state.voltage}
            onChange={(e) => onChange({ voltage: e.target.value })}
            placeholder="e.g. 5"
          />
        </div>
        {stats && (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Total current" value={formatCurrent(stats.total.current)} />
              <Stat label="Total power" value={formatPower(stats.total.power)} />
            </dl>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-2 font-medium" />
                    <th className="py-1.5 pr-2 font-medium">Value</th>
                    <th className="py-1.5 pr-2 font-medium">Voltage</th>
                    <th className="py-1.5 pr-2 font-medium">Current</th>
                    <th className="py-1.5 font-medium">Power</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.each.map((b, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 pr-2 font-bold text-accent">R{i + 1}</td>
                      <td className="py-1.5 pr-2">{formatOhms(parsed[i])}</td>
                      <td className="py-1.5 pr-2">{Number.parseFloat(b.voltage.toPrecision(3))} V</td>
                      <td className="py-1.5 pr-2">{formatCurrent(b.current)}</td>
                      <td className="py-1.5">{formatPower(b.power)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <CombinationFinder state={state} onChange={onChange} />
    </>
  );
}

function formula(values: number[], mode: NetworkMode, total: number): ReactNode {
  const parts = values.map((v) => formatOhms(v));
  if (mode === "series" || values.length === 1) return `${parts.join(" + ")} = ${formatOhms(total)}`;
  return `1 ÷ (${parts.map((p) => `1/${p}`).join(" + ")}) = ${formatOhms(total)}`;
}

function SeriesNote({ total }: { total: number }) {
  if (isInSeries(total, E12)) return <Badge>Standard E12 value</Badge>;
  if (isInSeries(total, E24)) return <Badge>Standard E24 value</Badge>;
  return <span className="text-muted">Not a standard value</span>;
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
      {children}
    </span>
  );
}

function CombinationFinder({ state, onChange }: { state: NetworkState; onChange: (patch: Partial<NetworkState>) => void }) {
  const target = parseResistance(state.target);
  // Brute-force search; only rerun when the target or series changes.
  const combos = useMemo(() => findCombinations(target, state.series), [target, state.series]);
  const exact = target > 0 && isInSeries(target, state.series === "E12" ? E12 : E24);

  return (
    <details className="group rounded-3xl border border-border bg-surface" open>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
        Find a combination for a value
        <span className="text-muted transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-sm text-muted">
          Need a value you don&apos;t have? Find two standard resistors that make it.
        </p>
        <TextField
          label="Target resistance"
          suffix="Ω"
          value={state.target}
          onChange={(e) => onChange({ target: e.target.value })}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. 3k, 1234"
        />
        <Segmented
          label="Available values"
          value={state.series}
          options={[
            { value: "E12", label: "E12 parts" },
            { value: "E24", label: "E24 parts" },
          ]}
          onChange={(series) => onChange({ series })}
        />
        {exact && (
          <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
            <strong>{formatOhms(target)}</strong> is already a standard {state.series} value, so one resistor is enough.
          </p>
        )}
        {state.target.trim() !== "" && !(target > 0) && (
          <p className="text-sm font-medium text-danger">Enter a value like 3k or 1234.</p>
        )}
        {combos.map((c) => (
          <div key={`${c.mode}${c.a}${c.b}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{c.mode}</p>
              <p className="font-semibold tabular-nums">
                {formatOhms(c.a)} {c.mode === "series" ? "+" : "∥"} {formatOhms(c.b)} = {formatOhms(c.ohms)}
              </p>
              <p className={`text-xs tabular-nums ${Math.abs(c.error) < 1e-9 ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}>
                {Math.abs(c.error) < 1e-9 ? "Exact" : `${c.error > 0 ? "+" : ""}${(c.error * 100).toFixed(2)}% off`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange({ mode: c.mode, values: [formatShort(c.a), formatShort(c.b)] })}
              className="min-h-10 shrink-0 rounded-xl border border-border bg-surface px-3 text-sm font-semibold active:scale-95"
            >
              Use
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}

function formatShort(ohms: number): string {
  return formatOhms(ohms).replace(/ ?Ω$/, "").replace(" ", "");
}

/** Schematic of the network between terminals A and B. */
function NetworkDiagram({ values, mode }: { values: number[]; mode: NetworkMode }) {
  const label = (v: number, i: number) => (Number.isFinite(v) ? formatOhms(v) : `R${i + 1}`);
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (mode === "series") {
    const shown = values.slice(0, 4);
    const more = values.length - shown.length;
    const slot = 260 / shown.length;
    return (
      <svg viewBox="0 0 320 70" className="block h-auto w-full text-fg" role="img" aria-label="Resistors in series">
        <path d={`M20 40H300`} {...stroke} opacity="0.85" />
        <Terminal x={20} y={40} name="A" />
        <Terminal x={300} y={40} name="B" />
        {shown.map((v, i) => {
          const cx = 30 + slot * (i + 0.5);
          const w = Math.min(46, slot - 14);
          return (
            <g key={i}>
              <rect x={cx - w / 2} y="32" width={w} height="16" rx="3" fill="var(--accent)" />
              <text x={cx} y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
                {label(v, i)}
              </text>
            </g>
          );
        })}
        {more > 0 && (
          <text x="160" y="66" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
            + {more} more in series
          </text>
        )}
      </svg>
    );
  }

  const shown = values.slice(0, 5);
  const more = values.length - shown.length;
  const gap = 34;
  const top = 20;
  const bottom = top + gap * (shown.length - 1);
  const height = bottom + (more > 0 ? 40 : 22);
  return (
    <svg viewBox={`0 0 320 ${height}`} className="block h-auto w-full text-fg" role="img" aria-label="Resistors in parallel">
      <g {...stroke} opacity="0.85">
        <path d={`M20 ${(top + bottom) / 2}H70M250 ${(top + bottom) / 2}H300`} />
        <path d={`M70 ${top}V${bottom}M250 ${top}V${bottom}`} />
        {shown.map((_, i) => (
          <path key={i} d={`M70 ${top + gap * i}H250`} />
        ))}
      </g>
      <Terminal x={20} y={(top + bottom) / 2} name="A" />
      <Terminal x={300} y={(top + bottom) / 2} name="B" />
      {shown.map((v, i) => {
        const y = top + gap * i;
        return (
          <g key={i}>
            <rect x="130" y={y - 8} width="60" height="16" rx="3" fill="var(--accent)" />
            <text x="202" y={y - 11} fontSize="11" fontWeight="700" fill="currentColor">
              {label(v, i)}
            </text>
          </g>
        );
      })}
      {more > 0 && (
        <text x="160" y={bottom + 30} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.7">
          + {more} more in parallel
        </text>
      )}
    </svg>
  );
}

function Terminal({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5" fill="var(--surface)" stroke="currentColor" strokeWidth="2.5" />
      <text x={x} y={y + 20} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" opacity="0.7">
        {name}
      </text>
    </g>
  );
}
