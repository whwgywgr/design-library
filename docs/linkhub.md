# LinkHub — Project Link Saver

## Overview

A one-page utility for collecting links to your own projects: paste a name, URL, category and (optionally) a screenshot — the card is saved locally in the browser and opens in one click. The visual direction is **neo-brutalism**: thick black borders, hard offset shadows, loud yellow accent, marquee header.

- **Type:** web app (single page, client-only)
- **Stack:** HTML + CSS + JS, data in `localStorage`
- **Files:** `index.html`, `style.css`, `script.js`

## Core features

- **Add project** — name, link, category, credit, image (URL or file upload, auto-resized and compressed to a data URL), created date.
- **Custom categories** — any typed category becomes a filter chip with a count; chip colors derive from the category name.
- **Cards** — image or first-letter fallback on a category-colored background; whole card is the click target.
- **Search + sort** — newest / oldest / name A–Z.
- **Grid / list view toggle** — preference persisted.
- **Edit & delete** per card.

## Visual language

| Token | Value |
|---|---|
| Theme attribute | `<html data-theme="neo-brutalism">` |
| Accent | `#FFD43B` yellow |
| Ink | `#141414` borders, shadows and text |
| Surface | white cards on light background |
| Type | Google Fonts: Archivo Black (display), Space Grotesk / Nunito (body), JetBrains Mono (meta) |
| Signature | 2–3px solid black borders, hard shadows (`6px 6px 0 #141414`), scrolling marquee strip, rotated hover states |

## Data model (localStorage)

- `linkhub.projects` — array of `{ id, name, url, category, credit, image, createdAt }`
- `linkhub.view` — `"grid" | "list"`

## Notes

- No backend, no build step — open `index.html` and it works.
- Category chips, filter bar and counts are rendered dynamically from the stored data.
- Images are downscaled client-side before storage so localStorage stays small.
