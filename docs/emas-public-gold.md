# Emas Public Gold — Landing Page

## Overview

A single-page marketing site for a fictional Malaysian gold savings product ("Emas Public Gold"). The goal: make saving in physical gold feel effortless and trustworthy, using a warm light palette with gold accents.

- **Type:** landing page (single page, anchored sections)
- **Stack:** plain HTML + CSS + JS, no dependencies, no build step
- **Files:** `index.html` (structure), `styles.css` (all styling), `script.js` (interactions)

## Page structure

1. **Header** — sticky, translucent blur, anchor nav + "Open Account" CTA, collapses to a hamburger on mobile.
2. **Hero** — two columns: copy with badge, headline, lead, dual CTA and trust points; visual side with CSS-drawn gold bars, a live "gold price" ticker card and two floating chips.
3. **Stats strip** — four animated counters (members, transactions, availability, redeemable size).
4. **Why gold** — 4-card value grid (hedge, start small, vault, liquidity).
5. **Products** — 3 pricing-style cards (Savings Account, Gold Bars, Coins & Dinar) with checklists.
6. **How it works** — 3 numbered steps.
7. **Calculator** — three sliders (monthly amount, duration, expected growth) computing projected grams, total invested and projected value; updates the headline price label.
8. **Testimonials** — 3 quote cards with star ratings.
9. **FAQ** — accordion of five questions.
10. **CTA banner + signup form** — split layout with client-side validation and a success modal.
11. **Footer** — 4-column link grid plus legal note.

## Palette

| Role | Value |
|---|---|
| Gold primary / CTAs | `#C9A227` (gradient `#E3C24B → #B58B1B`) |
| Dark section / footer | deep charcoal `#1F1D16` |
| Page background | `#FFFDF6` warm white, alt sections `#FAF6EA` |
| Text | `#26221A` primary, `#6B6558` secondary |

## Typography & motion

- System font stack; hero headline is the largest element on the page.
- `IntersectionObserver`-based reveal-on-scroll for sections, cards and steps.
- Counters ease up on first view; ticker simulates small price drift every few seconds.

## Interactions (script.js)

- Mobile nav toggle with `aria-expanded` state.
- FAQ accordion (one item open at a time).
- Calculator math: grams = Σ monthly saving ÷ monthly gold price with yearly growth compounding.
- Form validation (name/phone/email required, friendly inline error) + success modal.
- Smooth scrolling for anchor links, active section highlighting in nav.

## Notes

- Prices and stats are illustrative demo content only (stated in the footer).
- Design intent: warm, premium, safe — avoid stock-photo clichés, use CSS shapes and emoji sparingly as icons.
