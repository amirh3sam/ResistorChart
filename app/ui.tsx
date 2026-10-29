"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Segmented switch. "primary" (accent fill) is reserved for the top-level
 * Color Bands / SMD choice; everything else uses the quieter "secondary" look
 * so only one control on screen shouts.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  variant = "secondary",
  columns,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  variant?: "primary" | "secondary";
  /** Wrap options into this many columns instead of one row. */
  columns?: number;
}) {
  const primary = variant === "primary";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      className={`grid gap-1 border border-border p-1 ${columns ? "" : "auto-cols-fr grid-flow-col"} ${
        primary ? "rounded-2xl bg-surface" : "rounded-xl bg-surface-2/60"
      }`}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-2 px-2 text-sm font-semibold transition active:scale-[0.98] ${
              primary ? "min-h-12 rounded-xl" : "min-h-11 rounded-lg"
            } ${
              on
                ? primary
                  ? "bg-accent text-accent-fg shadow"
                  : "bg-accent/15 text-fg shadow ring-2 ring-accent"
                : "text-muted hover:text-fg"
            }`}
          >
            {on && !primary && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-surface-2 px-3 py-2 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Section label with a badge saying whether the control below is typed into or tapped. */
export function FieldLabel({ text, kind }: { text: ReactNode; kind: "type" | "pick" }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium font-mono uppercase tracking-[0.08em] text-muted">{text}</span>
      {kind === "type" ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
          <KeyboardIcon className="h-3.5 w-3.5" />
          Type
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
          <TapIcon className="h-3.5 w-3.5" />
          Tap to pick
        </span>
      )}
    </span>
  );
}

/**
 * Large, sunken text input that is clearly something you type into.
 * `compact` is for rows in a list: the label sits inside the box instead of above it.
 */
export function TextField({
  label,
  suffix,
  mono,
  compact,
  className = "",
  ...inputProps
}: { label: ReactNode; suffix?: ReactNode; mono?: boolean; compact?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1.5 ${compact ? "min-w-0 flex-1" : ""}`}>
      {!compact && <FieldLabel text={label} kind="type" />}
      <div className="flex cursor-text items-center rounded-2xl border-2 border-accent/60 bg-field shadow-(--field-shadow) transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/25">
        {compact ? (
          <span className="pl-4 text-sm font-bold text-accent">{label}</span>
        ) : (
          <PencilIcon className="ml-4 h-5 w-5 shrink-0 text-accent" />
        )}
        <input
          {...inputProps}
          className={`w-full min-w-0 bg-transparent px-3 font-semibold caret-accent outline-none focus-visible:outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted ${
            compact ? "min-h-12 text-xl" : "min-h-16 text-2xl"
          } ${mono ? "font-mono tracking-widest" : "tabular-nums"} ${className}`}
        />
        {suffix && <span className={`pr-4 font-semibold text-muted ${compact ? "text-xl" : "text-2xl"}`}>{suffix}</span>}
      </div>
    </label>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 15h6" />
    </svg>
  );
}

function TapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M9 11V5a2 2 0 0 1 4 0v5" />
      <path d="M13 10a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4.6 16a2 2 0 0 1 3.2-2.4L9 15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12.5 10 17 19 7" />
    </svg>
  );
}

/** The AmirHesam Tech wordmark: a teal square and spaced monospace caps, as on the banners. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-teal ${className}`}>
      <span className="h-2 w-2 shrink-0 bg-teal" aria-hidden />
      AmirHesam Tech
    </span>
  );
}

/**
 * Banner backdrop: gold dot grid fading in from the right with concentric
 * gold/purple rings. Place inside a `relative overflow-hidden` container.
 */
export function BrandBackdrop({ rings = true }: { rings?: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <span className="brand-dots absolute inset-0" />
      {rings && (
        <svg viewBox="0 0 300 300" className="absolute -right-14 top-1/2 h-40 w-40 -translate-y-1/2">
          {[46, 78, 110, 142].map((r, i) => (
            <circle
              key={r}
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke={i % 2 ? "#a98bff" : "#f5c451"}
              strokeOpacity={0.32 - i * 0.06}
              strokeWidth="1.5"
            />
          ))}
        </svg>
      )}
    </span>
  );
}
