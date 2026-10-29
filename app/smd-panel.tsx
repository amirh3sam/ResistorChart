"use client";

import type { ReactNode } from "react";
import { formatOhms, formatTolerance, nearestStandard, parseResistance } from "@/lib/resistor";
import {
  E96,
  EIA96_MULTIPLIERS,
  SMD_FORMAT_LABEL,
  type SmdDecodeResult,
  type SmdEncoding,
  getSmdCodes,
} from "@/lib/smd";
import { FieldLabel, Segmented, Stat, TextField } from "./ui";

export type SmdMode = "code" | "value";

const EXAMPLES = ["103", "472", "4R7", "R47", "1002", "01C", "68X", "000"];
const E96_SERIES = E96.map((v) => v / 100);

export function SmdChip({ code, compact }: { code: string; compact?: boolean }) {
  // Shrink the text so 4–5 character codes still fit on the chip.
  const size = code.length >= 5 ? 30 : code.length === 4 ? 36 : 42;
  return (
    <svg viewBox="0 0 220 110" className="block h-auto w-full" role="img" aria-label={`SMD resistor marked ${code || "blank"}`}>
      <defs>
        <linearGradient id={compact ? "smd-term-c" : "smd-term"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f2f4" />
          <stop offset="0.5" stopColor="#b9bdc4" />
          <stop offset="1" stopColor="#7d828b" />
        </linearGradient>
      </defs>
      <rect x="4" y="14" width="48" height="82" rx="6" fill={`url(#${compact ? "smd-term-c" : "smd-term"})`} />
      <rect x="168" y="14" width="48" height="82" rx="6" fill={`url(#${compact ? "smd-term-c" : "smd-term"})`} />
      <rect x="36" y="10" width="148" height="90" rx="5" fill="#16171a" />
      <rect x="36" y="10" width="148" height="10" rx="5" fill="#fff" fillOpacity="0.08" />
      <text
        x="110"
        y="57"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f4f4f4"
        fontSize={size}
        fontWeight="700"
        letterSpacing="2"
        style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
      >
        {code || "?"}
      </text>
    </svg>
  );
}

export function SmdPanel({
  mode,
  onMode,
  code,
  onCode,
  valueInput,
  onValueInput,
  decoded,
}: {
  mode: SmdMode;
  onMode: (m: SmdMode) => void;
  code: string;
  onCode: (c: string) => void;
  valueInput: string;
  onValueInput: (v: string) => void;
  decoded: SmdDecodeResult;
}) {
  return (
    <>
      <Segmented
        label="SMD calculator mode"
        value={mode}
        options={[
          { value: "code", label: "Code → Value" },
          { value: "value", label: "Value → Code" },
        ]}
        onChange={onMode}
      />
      {mode === "code" ? (
        <CodeToValue code={code} onCode={onCode} decoded={decoded} />
      ) : (
        <ValueToCode valueInput={valueInput} onValueInput={onValueInput} onUseCode={(c) => {
          onCode(c);
          onMode("code");
        }} />
      )}
      <SmdGuide />
    </>
  );
}

function CodeToValue({ code, onCode, decoded }: { code: string; onCode: (c: string) => void; decoded: SmdDecodeResult }) {
  return (
    <>
      <section className="rounded-3xl border border-border bg-surface p-4">
        <div className="mx-auto max-w-64">
          <SmdChip code={code.trim().toUpperCase()} />
        </div>
        <div className="mt-4">
          <TextField
            label="Code printed on the resistor"
            mono
            value={code}
            onChange={(e) => onCode(e.target.value.toUpperCase().slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. 103, 4R7, 01C"
          />
        </div>
        <div className="mt-4 mb-1.5">
          <FieldLabel text="Or try an example" kind="pick" />
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => onCode(ex)}
              className={`min-h-10 shrink-0 rounded-xl border px-3 font-mono text-sm font-semibold active:scale-95 ${
                code.toUpperCase() === ex ? "border-accent bg-accent/15" : "border-border bg-surface-2"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {decoded.ok ? (
        <section className="rounded-3xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">Value</p>
              <p className="text-4xl font-bold tabular-nums">{formatOhms(decoded.ohms)}</p>
              <p className="mt-0.5 text-sm text-muted tabular-nums">{decoded.ohms.toLocaleString("en-US")} Ω</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {decoded.tolerance !== null && (
                <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-fg">
                  {formatTolerance(decoded.tolerance)}
                </span>
              )}
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
                {SMD_FORMAT_LABEL[decoded.format]}
              </span>
            </div>
          </div>
          <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm">{decoded.explanation}</p>
          {decoded.tolerance !== null && decoded.ohms > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Minimum" value={formatOhms(decoded.ohms * (1 - decoded.tolerance / 100))} />
              <Stat label="Maximum" value={formatOhms(decoded.ohms * (1 + decoded.tolerance / 100))} />
            </dl>
          )}
          {decoded.tolerance !== null && (
            <p className="mt-2 text-xs text-muted">
              SMD codes don&apos;t encode tolerance; this is the usual tolerance for this code format. Check the datasheet for the exact part.
            </p>
          )}
        </section>
      ) : (
        code.trim() !== "" && (
          <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{decoded.error}</p>
        )
      )}
    </>
  );
}

function ValueToCode({
  valueInput,
  onValueInput,
  onUseCode,
}: {
  valueInput: string;
  onValueInput: (v: string) => void;
  onUseCode: (code: string) => void;
}) {
  const ohms = parseResistance(valueInput);
  const valid = Number.isFinite(ohms) && ohms >= 0;
  const codes = valid ? getSmdCodes(ohms) : null;
  const nearestE96 = valid && ohms > 0 ? nearestStandard(ohms, E96_SERIES) : Number.NaN;

  return (
    <>
      <section className="flex flex-col gap-1.5 rounded-3xl border border-border bg-surface p-4">
        <TextField
          label="Resistance"
          suffix="Ω"
          value={valueInput}
          onChange={(e) => onValueInput(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. 10k, 4.7, 0.1"
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pt-1">
          {["k", "M"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onValueInput(valueInput.replace(/[kKmMrRgG]$/, "") + s)}
              className="min-h-10 min-w-12 rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold active:scale-95"
            >
              {s}
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
        {valueInput.trim() !== "" && !valid && (
          <p className="pt-1 text-sm font-medium text-danger">Enter a value like 4700, 4.7k or 0.22</p>
        )}
      </section>

      {codes && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CodeCard title="3-digit" hint="Usually ±5% (E24)" enc={codes.threeDigit} onUse={onUseCode} />
          <CodeCard title="4-digit" hint="Usually ±1% (E96)" enc={codes.fourDigit} onUse={onUseCode} />
          <CodeCard
            title="EIA-96"
            hint="±1% parts, 0603 and smaller"
            enc={codes.eia96}
            onUse={onUseCode}
            missing={
              Number.isFinite(nearestE96) ? (
                <>
                  Not an E96 value. Nearest:{" "}
                  <button className="font-semibold text-accent underline" onClick={() => onValueInput(formatOhms(nearestE96).replace(/ ?Ω$/, "").replace(" ", ""))}>
                    {formatOhms(nearestE96)}
                  </button>
                </>
              ) : (
                "No EIA-96 code for 0 Ω"
              )
            }
          />
        </section>
      )}
    </>
  );
}

function CodeCard({
  title,
  hint,
  enc,
  onUse,
  missing,
}: {
  title: string;
  hint: string;
  enc: SmdEncoding | null;
  onUse: (code: string) => void;
  missing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-3 sm:flex-col sm:items-stretch">
      <div className="w-28 shrink-0 sm:w-full">
        <SmdChip code={enc?.code ?? "—"} compact />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">{title}</p>
        {enc ? (
          <>
            <p className="font-mono text-2xl font-bold tracking-wider">{enc.code}</p>
            <p className="text-xs text-muted">
              {enc.exact ? hint : `Rounded to ${formatOhms(enc.ohms)}`}
            </p>
            <button onClick={() => onUse(enc.code)} className="mt-1 text-xs font-semibold text-accent underline">
              Decode this code
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">{missing ?? "Can't be encoded in this format"}</p>
        )}
      </div>
    </div>
  );
}

function SmdGuide() {
  return (
    <>
      <details className="group rounded-3xl border border-border bg-surface" open>
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          How to read SMD resistor codes
          <span className="text-muted transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
          <GuideRow code="103" title="3-digit code" text="Two digits, then the number of zeros to add: 10 + 000 = 10,000 Ω = 10 kΩ. Common on ±5% parts." />
          <GuideRow code="1002" title="4-digit code" text="Three digits, then the number of zeros: 100 + 00 = 10 kΩ. Used on ±1% parts." />
          <GuideRow code="4R7" title="R = decimal point" text="Values under 10 Ω (or 100 Ω for 4-digit) use R as the decimal point: 4R7 = 4.7 Ω, R47 = 0.47 Ω, 47R0 = 47 Ω." />
          <GuideRow code="01C" title="EIA-96 code" text="Two digits pick a value from the E96 table below, the letter is the multiplier: 01 = 100, C = ×100 → 10 kΩ. Used on tiny ±1% parts." />
          <GuideRow code="000" title="Zero-ohm jumper" text="0, 00, 000 or 0000 is a 0 Ω link used as a wire bridge." />
          <p className="text-xs text-muted">
            Tip: very small parts (0402 and below) usually have no marking at all. Use a multimeter or the reel label.
          </p>
        </div>
      </details>

      <details className="group rounded-3xl border border-border bg-surface">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          EIA-96 code table
          <span className="text-muted transition group-open:rotate-180" aria-hidden>
            ▾
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">Multiplier letter</p>
          <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
            {EIA96_MULTIPLIERS.map((m) => (
              <div key={m.letter} className="rounded-xl bg-surface-2 px-2 py-1.5 text-center">
                <span className="font-mono font-bold">
                  {m.letter}
                  {m.alt && <span className="text-muted"> / {m.alt}</span>}
                </span>
                <span className="block text-xs text-muted">×{Number.parseFloat((10 ** m.exp).toPrecision(6))}</span>
              </div>
            ))}
          </div>
          <p className="pt-1 text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">Code → value</p>
          <div className="grid grid-cols-4 gap-1.5 text-sm tabular-nums sm:grid-cols-6">
            {E96.map((v, i) => (
              <div key={v} className="flex justify-between rounded-lg bg-surface-2 px-2 py-1">
                <span className="font-mono font-semibold">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-muted">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}

function GuideRow({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-20 shrink-0">
        <SmdChip code={code} compact />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-muted">{text}</p>
      </div>
    </div>
  );
}
