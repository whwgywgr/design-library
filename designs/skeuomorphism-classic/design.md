---
title: Skeuomorphism — Classic Notes
description: The 2010 iOS-era look — linen textures, a yellow legal-pad note with a push pin and red margin line, glossy aqua buttons and heavy soft shadows. The missing era between Web 2.0 and flat design.
tags: [skeuomorphism, notes, classic]
order: 16
---

# Skeuomorphism — Classic Notes

When interfaces imitated real objects: a linen desk, a paper pad held by a push pin,
buttons with glass highlights. This working notes app recreates the 2010 aesthetic with
pure CSS — the paper even has real ruled lines you can write on.

## Tokens

| Token | Value |
|---|---|
| Desk | linen — `#b8c2d0` with 45° crosshatch gradients |
| Top bar | dark gloss `#4a5a75 → #2f3b50` + inset highlight |
| Paper | `#fdf9c4` legal pad, ruled lines every 28px, red margin at 56px |
| Pin | glossy red hemisphere with highlight |
| Buttons | aqua gloss `#8ab4e8 → #2c5590`, inset top shine |
| Type | Marker Felt / Comic Sans for handwriting, system for UI |

## Interaction

Fully working notes app: pick a note from the list, write directly on the pad
(contenteditable), add new notes, delete them — everything persists in localStorage
with a live word count.

## Files

- `index.html` — self-contained, no dependencies, works offline.
