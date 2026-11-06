# Brand guide — applying Questivity's identity

The platform is themed from **three places**. Change them and the whole app (login, sidebar, buttons,
cards, progress bars, certificates, assistant) follows.

| What | Where | Current value |
|---|---|---|
| Colours | `src/app/globals.css` → `:root` | see table below |
| Fonts | `src/app/layout.tsx` (Google Fonts via `next/font`) | Open Sans (body), Montserrat (headings) |
| Logos | `public/brand/logo.svg`, `logo-white.svg`, `mark.svg`, `src/app/icon.svg` | **placeholder wordmark** |
| Names, tagline, assistant name, contact | `src/config/brand.ts` | Questivity LMS · Quest Assistant |

## Colour tokens

Values are RGB triplets (so Tailwind opacity modifiers like `bg-brand/10` work).

| Token | Use | Default | Hex |
|---|---|---|---|
| `--brand-primary` | Buttons, links, active states | `11 79 140` | `#0B4F8C` |
| `--brand-primary-dark` | Sidebar, hero banners | `7 46 87` | `#072E57` |
| `--brand-primary-light` | Tints, selected rows | `225 236 247` | `#E1ECF7` |
| `--brand-accent` | Highlights, certificate, CTAs | `242 140 40` | `#F28C28` |
| `--brand-ink` | Body text | `23 32 46` | `#17202E` |
| `--brand-muted` | Secondary text | `96 108 124` | `#606C7C` |
| `--brand-surface` | Page background | `246 248 251` | `#F6F8FB` |
| `--brand-line` | Borders | `222 228 236` | `#DEE4EC` |
| `--brand-radius` | Corner radius | `10px` | |

> **Action required:** the defaults are a corporate blue + orange palette chosen to suit an IT
> infrastructure brand. Replace them with the exact values from Questivity's brand guidelines or from
> the official logo artwork. To convert hex → triplet: `#0B4F8C` → `11 79 140`.
> Also update `themeColor` in `src/app/layout.tsx`.

## Logos

Replace the SVGs in `public/brand/` with the official artwork, keeping the file names:

- `logo.svg` — full-colour logo for light backgrounds (login on mobile, certificate)
- `logo-white.svg` — reversed logo for the dark sidebar and login panel
- `mark.svg` / `src/app/icon.svg` — square icon (favicon)

PNG works too — change the file extension in `src/config/brand.ts` and the `Image` `src` attributes
(`src/components/app-shell.tsx`, `src/app/login/page.tsx`, `src/app/(app)/certificates/[id]/page.tsx`).

## Fonts

If the brand guide specifies typefaces, swap them in `src/app/layout.tsx`, e.g.:

```ts
import { Poppins, Inter } from "next/font/google";
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const display = Poppins({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display" });
```

For licensed fonts not on Google Fonts, use `next/font/local` with the font files in `src/fonts/`.
