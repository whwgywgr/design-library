---
title: Bento Grid — Feature Dashboard
description: Information packed into rounded boxes of different sizes — a bento-box grid mixing stats, a bar chart, lists and a progress ring. Fits dashboards, SaaS features and product overviews.
tags: [bento, grid, dashboard]
order: 3
---

# Bento Grid — Feature Dashboard

The Apple-style bento pattern: a CSS grid where every tile has its own size and job, tied together by one radius and one gap.

## Tokens

| Token | Value |
|---|---|
| Page | `#f6f7f9`, tiles `#ffffff` |
| Border / radius | `#e7e9ee` 1px, tiles 18px |
| Ink | `#17181c` · secondary `#6b7280` |
| Accents | `#3b82f6` blue · `#22c55e` green · `#f59e0b` amber |
| Type | system sans, 13px tile body, 28px stat numbers |

## Layout

6-column grid: a wide chart tile (2×2), counter stat, progress ring (SVG stroke), task list, team strip and a wide status banner — all breathing on a 14px gap.

## Motion

Numbers count up, bars grow and the ring fills on load; staggered tile entrance.

## Files

- `index.html` — self-contained, no dependencies, works offline.
