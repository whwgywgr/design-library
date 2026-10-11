---
title: 3D Interactive — CSS Scene
description: A rotating 3D cube built with pure CSS transforms — drag to spin it, release for inertia, or let it auto-rotate. No WebGL, no libraries. For tech products and premium brand moments.
tags: [3d, interactive, css]
order: 5
---

# 3D Interactive — CSS Scene

Proof that "3D website" doesn't require WebGL: a perspective scene, six transformed faces and a JS pointer handler with velocity and inertia.

## Tokens

| Token | Value |
|---|---|
| Stage | `#0e0f13` with a soft radial glow |
| Cube size | 220px, faces use gradient + big glyph |
| Face set A | blue→cyan duotone |
| Face set B | magenta→violet duotone |
| Type | system sans, mono for the HUD readout |

## Interaction

- **Drag** anywhere on the stage to rotate (pointer events).
- **Release** with velocity → inertia decay.
- Idle for 2s → slow auto-rotation resumes.
- Theme buttons swap the face gradients via CSS variables.

## Files

- `index.html` — self-contained, no dependencies, works offline.
