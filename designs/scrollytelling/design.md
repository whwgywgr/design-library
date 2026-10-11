---
title: Scrollytelling — Product Story
description: A sticky visual that morphs — colour, shape and caption — while story steps scroll past it. The classic scroll-driven narrative for product launches and campaign pages.
tags: [scrollytelling, story, scroll]
order: 6
---

# Scrollytelling — Product Story

Left half is pinned (`position: sticky`); the right half is a tall column of chapters. An IntersectionObserver watches each chapter and drives the visual: number, headline, colour and a morphing blob.

## Tokens

| Token | Value |
|---|---|
| Page | `#0f1115` dark stage |
| Chapter colours | `#6366f1` → `#06b6d4` → `#f59e0b` → `#22c55e` |
| Step text | 15px system sans on `#171a21` cards |
| Blob | 260px div with animated `border-radius` |

## Structure

1. The Idea — indigo, dot
2. The Build — cyan, rounded square
3. The Launch — amber, star
4. The Growth — green, full circle

## Files

- `index.html` — self-contained, no dependencies, works offline.
