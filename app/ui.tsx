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
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid auto-cols-fr grid-flow-col gap-1 border border-border p-1 ${
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
                  : "bg-surface text-fg shadow ring-1 ring-border"
                : "text-muted hover:text-fg"
            }`}
          >
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
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Section label with a badge saying whether the control below is typed into or tapped. */
export function FieldLabel({ text, kind }: { text: ReactNode; kind: "type" | "pick" }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-muted">{text}</span>
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

/** Large, sunken text input that is clearly something you type into. */
export function TextField({
  label,
  suffix,
  mono,
  className = "",
  ...inputProps
}: { label: ReactNode; suffix?: ReactNode; mono?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel text={label} kind="type" />
      <div className="flex cursor-text items-center rounded-2xl border-2 border-accent/60 bg-field shadow-(--field-shadow) transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/25">
        <PencilIcon className="ml-4 h-5 w-5 shrink-0 text-accent" />
        <input
          {...inputProps}
          className={`min-h-16 w-full min-w-0 bg-transparent px-3 text-2xl font-semibold caret-accent outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-muted ${
            mono ? "font-mono tracking-widest" : "tabular-nums"
          } ${className}`}
        />
        {suffix && <span className="pr-4 text-2xl font-semibold text-muted">{suffix}</span>}
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
