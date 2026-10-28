"use client";

import { type BandCount, type ColorName, COLORS } from "@/lib/resistor";

const BODY_PATH =
  "M80 20C62 20 60 22 60 40V80C60 98 62 100 80 100H104C116 100 118 90 130 90H270C282 90 284 100 296 100H320C338 100 340 98 340 80V40C340 22 338 20 320 20H296C284 20 282 30 270 30H130C118 30 116 20 104 20Z";

// Band centers; the tolerance band sits apart so the reading direction is clear.
const BAND_X: Record<BandCount, number[]> = {
  4: [100, 150, 190, 302],
  5: [96, 140, 174, 208, 302],
  6: [92, 134, 164, 194, 244, 308],
};

export function ResistorSvg({
  bands,
  count,
  activeBand,
  onBandClick,
  compact,
}: {
  bands: ColorName[];
  count: BandCount;
  activeBand: number;
  onBandClick?: (i: number) => void;
  compact?: boolean;
}) {
  // Carbon film (4-band) resistors are usually beige; metal film (5/6-band) blue.
  const body = count === 4 ? "#d8bf8f" : "#7fb3dd";
  const xs = BAND_X[count];
  const id = compact ? "rc" : "rf";
  return (
    <svg viewBox={compact ? "50 10 300 100" : "0 0 400 124"} className="block h-auto w-full" role="img" aria-label="Resistor color bands">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={BODY_PATH} />
        </clipPath>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${id}-lead`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4e6ea" />
          <stop offset="0.5" stopColor="#a9adb5" />
          <stop offset="1" stopColor="#6c7079" />
        </linearGradient>
      </defs>
      <rect x={compact ? 50 : 4} y="56" width={compact ? 300 : 392} height="8" rx="4" fill={`url(#${id}-lead)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <path d={BODY_PATH} fill={body} />
        {xs.map((x, i) =>
          bands[i] === "none" ? null : (
            <rect key={i} x={x - 9} y="10" width="18" height="100" fill={COLORS[bands[i]].hex} className="transition-[fill] duration-300" />
          ),
        )}
        <rect x="50" y="10" width="300" height="100" fill={`url(#${id}-shade)`} />
      </g>
      <path d={BODY_PATH} fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" />
      {!compact &&
        xs.map((x, i) => (
          <g key={i}>
            {activeBand === i && <path d={`M${x - 8} 120 L${x} 110 L${x + 8} 120 Z`} fill="var(--accent)" />}
            {onBandClick && (
              <rect
                x={x - 16}
                y="10"
                width="32"
                height="112"
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onBandClick(i)}
                aria-label={`Edit band ${i + 1}`}
              />
            )}
          </g>
        ))}
    </svg>
  );
}
