---
title: Motion-Driven — Animated Landing
description: Movement as the design language — staggered word entrances, a living gradient blob, an infinite marquee, a magnetic button and scroll-triggered counters. For premium landing pages and product demos.
tags: [motion, animation, landing-page]
order: 10
---

# Motion-Driven — Animated Landing

Everything responds: words slide up on load with stagger, a colour blob breathes behind the hero, the CTA magnetically follows the cursor, stats count up on view and a marquee never stops.

## Tokens

| Token | Value |
|---|---|
| Background | `#0c0c11` near-black with a breathing violet→cyan blob |
| Ink on dark | `#f2f2f5` · secondary `#9b9ba7` |
| Marquee strip | `#1c1c26` with `✦` separators |
| CTA | `#c8f542` lime pill, ink text |

## Motion inventory

1. Hero words: clip-mask slide-up, 90ms stagger
2. Blob: `border-radius` + position keyframes, 12s loop
3. Magnetic CTA: `pointermove` translate toward cursor, springs back
4. Stats: cubic ease count-up on IntersectionObserver
5. Marquee: infinite `translateX` loop
6. Scroll reveals on every section

## Files

- `index.html` — self-contained, no dependencies, works offline.
