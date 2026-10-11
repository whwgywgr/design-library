---
title: Neumorphism — Soft UI Player
description: The 2019–2020 soft-UI trend — monochrome surfaces extruded and pressed with dual light/dark shadows, like everything is carved from the same soft material. Fits music players, settings and fitness widgets.
tags: [neumorphism, soft-ui, player]
order: 14
---

# Neumorphism — Soft UI Player

Everything is the same colour as the background; shape comes only from paired shadows —
dark bottom-right, light top-left for raised, inverted for pressed. A working music
player plus small widgets, all carved from one surface.

## Tokens

| Token | Value |
|---|---|
| Surface | `#e0e5ec` — bg, cards and controls share it |
| Raised | `9px 9px 18px rgba(163,177,198,0.6), -9px -9px 18px rgba(255,255,255,0.85)` |
| Pressed (inset) | `inset 6px 6px 12px rgba(163,177,198,0.7), inset -6px -6px 12px rgba(255,255,255,0.8)` |
| Text | `#5b6472` primary · `#98a2b3` muted |
| Radius | 20–24px everywhere |

## Interaction

Play/pause runs the progress bar with a real timer, prev/next swap tracks, the volume
slider and toggle switch are fully styled neumorphic controls, and the ambient switch
flips the page between light and dark soft-UI.

## Files

- `index.html` — self-contained, no dependencies, works offline.
