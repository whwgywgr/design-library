---
title: Metro — Windows 8 Tiles
description: The Metro / Modern UI era (2011–2013) — solid colour tiles with no borders, no shadows and no radius, Segoe UI Light typography, live tiles that flip on their own, and apps that open full-screen.
tags: [metro, tiles, windows8]
order: 12
---

# Metro — Windows 8 Tiles

The bridge between glossy Web 2.0 and flat minimalism: Microsoft's Metro language. Every
tile is a solid rectangle of pure colour, typography is huge and light, and the whole
"start screen" scrolls sideways.

## Tokens

| Token | Value |
|---|---|
| Background | `#1a1a1f` near-black |
| Tile palette | blue `#2672ec` · teal `#00aba9` · green `#00a300` · orange `#f09609` · pink `#d80073` · red `#e51400` · purple `#7e3878` |
| Tiles | 84px unit, 8px gap, **zero** border/radius/shadow |
| Type | "Segoe UI Light" 200–300 weight, huge headers |
| Motion | live-tile flip every 3s; click a tile → full-screen app with back arrow |

## Structure

Horizontally-scrolling start screen: group "Mail & People" (with a live mail tile) →
group "Media" → group "Fun". Click any tile — the "app" opens full-screen in its colour.

## Files

- `index.html` — self-contained, no dependencies, works offline.
