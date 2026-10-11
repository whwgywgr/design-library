---
title: Pricing Section — Light Component
description: A clean three-tier pricing component with a monthly/yearly toggle, feature checklists and a highlighted "most popular" plan. Self-contained, light and minimal.
tags: [component, pricing, marketing]
order: 2
---

# Pricing Section — Light Component

A drop-in pricing section for light, content-first sites. One self-contained `index.html` — no dependencies, no build step.

## Layout

- Section header: eyebrow, title, supporting line.
- Billing toggle: **Monthly / Yearly** segmented control. Yearly shows a "save 20%" hint and animates price changes.
- Three plan cards: Starter, **Pro (highlighted, "Most popular")**, Team. Each has price, per-seat note, feature checklist and one CTA.
- Cards align their feature lists so CTAs sit on the same baseline.

## Design tokens

| Token | Value |
|---|---|
| Background | `#fafafa`, cards `#ffffff` |
| Border | `#e6e6e8`, 1px |
| Text | `#18181b` primary · `#55555e` secondary |
| Accent | near-black `#18181b` for CTAs and the highlighted card |
| Radius | 12px cards, 8px buttons |
| Type | system sans, 48px display price, 15px body |

## Behavior

- Toggle switches prices with a small fade/slide; yearly prices are per-month billed annually (20% off).
- Highlighted card keeps a flat near-black treatment — no gradients, no glow.
- Fully responsive: 3 columns → 1 column under 860px, highlighted card first on mobile.

## Usage

Copy the `<section>` and the small `<script>` from `index.html` into your page, or keep the file as a standalone preview. Swap plan data in the markup; prices live in `data-monthly` / `data-yearly` attributes.
