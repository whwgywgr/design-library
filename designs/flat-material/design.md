---
title: Flat Design — Material Era
description: The 2013–2018 reaction to glossy Web 2.0 — flat colors, no gradients, an app bar with hamburger drawer, ripple buttons, cards, a floating action button and snackbars. Roboto-era minimalism.
tags: [flat, material, web-app]
order: 12
---

# Flat Design — Material Era

The pendulum swing after Web 2.0: every gradient, bevel and gloss is stripped away. What
remains is bold flat color, typography, elevation shadows and motion that responds to touch.

## Tokens

| Token | Value |
|---|---|
| Primary | `#2196F3` blue (app bar), dark `#1976D2` |
| Accent | `#FF4081` pink (FAB) |
| Background | `#fafafa`, cards `#ffffff` |
| Text | `#212121` primary · `#757575` secondary |
| Elevation | soft card shadows `0 2px 5px rgba(0,0,0,.26)` |
| Type | "Segoe UI"/Roboto stack, 500-weight buttons in CAPS |

## Pieces

App bar with **hamburger drawer** (slide-in + scrim) → flat hero with a pure-CSS phone
mockup → 3 cards with **ripple-effect** buttons → floating action button that fires a
**snackbar** toast — the full Material interaction set, zero dependencies.

## Files

- `index.html` — self-contained, no dependencies, works offline.
