# Resistor Calculator

Mobile-first resistor color code calculator built with Next.js (App Router), React and Tailwind CSS. Installable as a home-screen app (PWA).

- 4, 5 and 6-band resistors with a live SVG preview (tap a band to edit it)
- Colors → Value: resistance, tolerance, min/max range, temperature coefficient
- Value → Colors: type `4700`, `4.7k`, `4k7`, `1M`, `0R22` and the bands update
- E12 / E24 standard value lookup and "nearest standard value" suggestions
- Collapsible color code reference chart
- Sticky header keeps the current reading visible; dark and light themes
- Web app manifest, Apple web-app metadata and an offline service worker

## Development

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

The calculation logic lives in `lib/resistor.ts` (`calculateFromColors`, `getColorsFromValue`, `parseResistance`).

## Deploy

```bash
npx vercel --prod
```
