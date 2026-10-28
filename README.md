<p align="center">
  <img src="assets/banner.svg" alt="Resistor Calculator. Colour codes both ways, on your phone, and it works offline." width="100%">
</p>

<p align="center">
  <a href="https://resistor-calculator-lemon.vercel.app"><img alt="Live app" src="https://img.shields.io/badge/try%20it-live-3fe0c5?style=flat-square&labelColor=0a0e14"></a> <img alt="Works offline" src="https://img.shields.io/badge/works-offline-3fe0c5?style=flat-square&labelColor=0a0e14"> <img alt="4, 5 and 6 band" src="https://img.shields.io/badge/bands-4%20%C2%B7%205%20%C2%B7%206-3fe0c5?style=flat-square&labelColor=0a0e14"> <img alt="Next.js" src="https://img.shields.io/badge/Next.js-App%20Router-a98bff?style=flat-square&labelColor=0a0e14"> <img alt="Installable PWA" src="https://img.shields.io/badge/installable-PWA-f5c451?style=flat-square&labelColor=0a0e14"> <a href="https://github.com/amirh3sam/ResistorChart/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/amirh3sam/ResistorChart?style=flat-square&labelColor=0a0e14&color=f5c451"></a>
</p>

<p align="center">
  <a href="https://resistor-calculator-lemon.vercel.app"><b>Open the app</b></a> ·
  <a href="#what-it-does">What it does</a> ·
  <a href="#both-directions">Both directions</a> ·
  <a href="#development">Development</a> ·
  <a href="#faq">FAQ</a>
</p>

Four coloured stripes on a tiny cylinder, and the chart is always on the other side of the bench. Worse, resistors have no agreed orientation, so half the time you read the bands backwards and get 47Ω instead of 470kΩ.

This reads them in both directions, on the phone already in your hand, and keeps working once you install it — handy, since benches and lab cupboards are where signal goes to die.

- **Tap a band to change it** on a live SVG resistor, rather than hunting through a dropdown.
- **Type a value instead** — `4700`, `4.7k`, `4k7`, `1M`, `0R22` all parse, and the bands follow.
- **4, 5 and 6-band** resistors, with tolerance, min/max range and temperature coefficient.
- **Installs to your home screen** and runs with no connection.

**[Open the calculator →](https://resistor-calculator-lemon.vercel.app)**

## What it does

| | |
|---|---|
| **Colours → value** | Resistance, tolerance, the min/max range that tolerance implies, and temperature coefficient on 6-band parts |
| **Value → colours** | Type what you want and watch the bands update |
| **Standard values** | E12 and E24 lookup, plus the nearest standard value when yours is not one |
| **Reference chart** | The full colour code, collapsed until you want it |
| **Either theme** | Dark and light, because bench lighting is never what you want |

The reading stays pinned to a sticky header while you scroll, so the number is visible while you fiddle with the bands.

## Both directions

Most calculators only go one way. The reverse is the one you need more often: you know you want 4.7kΩ and you are digging through a drawer trying to find it.

```
4700   →  yellow  violet  red     gold
4.7k   →  yellow  violet  red     gold
4k7    →  yellow  violet  red     gold
0R22   →  red     red     silver  gold
1M     →  brown   black   green   gold
```

All five of those parse to the same place. The `4k7` and `0R22` forms are how values are printed on schematics and in catalogues, where a decimal point is easily lost in a photocopy.

> [!TIP]
> If a value is not a standard one, the app offers the nearest E12 or E24 part. Useful when the calculation says 3.3kΩ and the drawer disagrees.

## Development

Next.js App Router, React and Tailwind.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

The whole calculation lives in [`lib/resistor.ts`](lib/resistor.ts) — `calculateFromColors`, `getColorsFromValue` and `parseResistance`. It has no React in it, so it is easy to read and easy to test on its own.

```
app/
├── page.tsx           the calculator
├── resistor-svg.tsx   the tappable resistor
├── smd-panel.tsx      surface-mount codes
├── led-panel.tsx      LED reference
├── service-worker.tsx offline support
└── manifest.ts        home-screen install
```

Deploy with `npx vercel --prod`.

## FAQ

<details>
<summary><b>Which end do I read from?</b></summary>

The tolerance band is usually the odd one out — gold or silver, and set slightly apart from the rest. Put that on the **right**. If there is no gold or silver band, the wider gap goes on the right.

When it is genuinely ambiguous, enter it both ways: one reading will be a standard value and the other almost certainly will not.

</details>

<details>
<summary><b>Does it work without a connection?</b></summary>

Yes. A service worker caches the app on first visit, so after that it loads with no network. That is the point — the places you identify resistors in rarely have good signal.

</details>

<details>
<summary><b>Can I install it like an app?</b></summary>

Yes. On iPhone, Share → Add to Home Screen. On Android, Chrome offers "Install app". It then opens full screen with no browser chrome.

</details>

<details>
<summary><b>What do the 5th and 6th bands mean?</b></summary>

A 5-band resistor adds a third significant digit, for precision parts. The 6th band is the temperature coefficient in ppm/°C — how much the value drifts as it heats up. It only matters in precision analogue work; for most things you can ignore it.

</details>

<details>
<summary><b>My resistor measures differently from the bands</b></summary>

Check the tolerance band first — a ±5% 4.7kΩ part is in spec anywhere from 4.465k to 4.935k. Beyond that, measure it out of circuit; parallel paths on the board will read low every time.

</details>

## About

Made by **[AmirHesam Tech](https://amirhesamtech.com)**. More tech content on TikTok: [@techwithamirh3sam](https://www.tiktok.com/@techwithamirh3sam).

If this saved you a trip to the chart, please give it a star. It helps other people find it.
