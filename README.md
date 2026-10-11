# Design Library

A personal, Dribbble-style collection of your designs — light, minimalist, content-first.
Every design entry can be **previewed live** (rendered from its full source code), read as
**source code**, and its **design.md** can be read in-app or **downloaded**. Link entries
point to external design websites (Dribbble, Mobbin, Land-book…).

![theme](https://img.shields.io/badge/theme-light_minimal-18181b?style=flat-square)

## Quick start

- **No server needed** — double-click `index.html`. Everything is packed into `designs.js`.
- Or run `start.bat` — rebuilds the library and serves it at `http://localhost:8123`.
- Or serve the folder any way you like (`python -m http.server`, `npx serve`, Netlify, GitHub Pages…).

## What's inside

```
design-library/
├── index.html            ← the site (SPA, hash routing)
├── assets/
│   ├── style.css         ← light minimal design system
│   ├── app.js            ← gallery, preview/code/docs tabs, add/edit form, search
│   └── lib/              ← marked.js + highlight.js (local, offline)
├── designs.js            ← GENERATED — all designs packed for offline use
├── library.json          ← registry: existing projects + link-only entries
├── imported/             ← JSON exports from the site's "Export for build" button
├── build.js              ← packs everything into designs.js   (node build.js)
├── docs/                 ← design docs for registered projects
└── designs/<slug>/       ← self-contained design folders (auto-discovered)
    ├── design.md         ← doc with frontmatter (title/description/tags/link/order)
    └── index.html        ← full code; single-file with inline CSS/JS previews best
```

## Adding a design

### Fastest — the Add design form (in the site)

Click **Add design**, fill in title/tags, paste your full HTML (and optionally a markdown doc) — the live preview renders while you type. You can also **drag & drop** a `.html` / `.md` file anywhere on the page, or use **Import files**.

Saved designs appear instantly and are stored in the **browser's localStorage** — perfect for an MVP / personal use. On each locally-added design's page you get **Edit**, **Delete**, and:

- **Export for build** — downloads `imported-<id>.json`. Drop it into `design-library/imported/` and run `node build.js`; the design becomes a permanent part of `designs.js` and ships with the deployed site.

### Way 1 — a folder in `designs/`

```
designs/my-design/
  design.md
  index.html
```

`design.md` starts with optional frontmatter:

```md
---
title: My Design
description: One-line summary shown on the card.
tags: [landing, component]
link: https://example.com        <!-- optional source website -->
order: 2                         <!-- optional sort position -->
---
# My Design
…
```

The build picks the folder up automatically. Multiple files are fine — the Code tab lists
them all, and the build inlines local `<link>`/`<script>`/`<img>` references into the preview.

### Way 2 — register an existing project in `library.json`

```json
{
  "id": "my-app",
  "title": "My App",
  "description": "…",
  "tags": ["web-app"],
  "source": { "root": "../my-app", "files": ["index.html", "style.css", "script.js"] },
  "docs": "docs/my-app.md",
  "preview": "index.html"
}
```

`root` is relative to `design-library/`, so you can point anywhere in your workspace without
copying files. Link-only entries just need `"type": "link"` and a `url`.

### Then rebuild

```bash
node build.js        # or just run start.bat
```

## Currently in the library

| Entry | Type | Source |
|---|---|---|
| Emas Public Gold — Landing Page | code | workspace root (`../`) |
| LinkHub — Project Link Saver | code | `../linkhub` |
| Pricing Section — Light Component | code | `designs/pricing-section/` |
| Todo List App — Design Spec | docs | `../thetodolist/DESIGN.md` |
| Dribbble · Land-book · Mobbin · Godly · Awwwards | links | external |

## Notes

- **Previews run the real code** — each preview is the design's actual HTML (with local
  CSS/JS/images inlined) in a sandboxed-enough iframe. Desktop/Tablet/Phone widths on the
  detail page; "Open full preview" pops it out into a real tab.
- A tiny localStorage shim is injected into previews so designs that persist data
  (like LinkHub) don't crash in the pop-out tab — data simply isn't persisted there.
- `designs.js` is regenerated, never hand-edited. Add designs → re-run `node build.js`.
- Deploy the folder to any static host and it just works — no server code at all.
