---
title: Glassmorphism — Glass UI Kit
description: Frosted-glass cards floating over animated colour blobs — backdrop blur, soft borders and depth. Suited to futuristic dashboards, media players and tech app UI.
tags: [glassmorphism, ui, blur]
order: 7
---

# Glassmorphism — Glass UI Kit

The material is the design: `backdrop-filter: blur(20px) saturate(160%)` panels at 10–18% white, 1px light borders and large soft shadows, floating over slow-moving colour blobs.

## Tokens

| Token | Value |
|---|---|
| Background | indigo→violet gradient + 3 blurred blobs (`#22d3ee`, `#f472b6`, `#a3e635`) |
| Glass | `rgba(255,255,255,0.12)` · border `rgba(255,255,255,0.35)` · blur 20px |
| Radius | 22px panels, 999px pills |
| Text | white at 100/70/55% |

## Pieces

Now-playing glass widget (with fake equaliser), 3 glass stat chips, a glass dock of icon buttons, and pointer-tilt on the main card.

## Files

- `index.html` — self-contained, no dependencies, works offline.
