#!/usr/bin/env node
/* ============================================================
   build.js — packs the design library into designs.js

   Collects:
     1. Entries registered in library.json (existing projects, link-only entries)
     2. Auto-discovered folders:  designs/<slug>/  (design.md + code files)

   Everything (markdown docs + full source code + inlined preview HTML)
   is embedded into designs.js so the site works offline from file://
   and can be deployed to any static host as-is.

   Run:  node build.js
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_FILE = path.join(ROOT, "designs.js");
const DESIGNS_DIR = path.join(ROOT, "designs");
const LIB_FILE = path.join(ROOT, "library.json");

const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".md", ".markdown", ".svg", ".txt", ".xml", ".csv"]);
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);
const IMG_INLINE_MAX = 400 * 1024;   // inline images into preview up to 400 KB
const TEXT_MAX = 1024 * 1024;        // skip source files larger than 1 MB

const warnings = [];

function warn(msg) { warnings.push(msg); console.log("  ⚠ " + msg); }
function exists(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }
function readText(p) { return fs.readFileSync(p, "utf8"); }

function langOf(ext) {
  return { ".html": "html", ".htm": "html", ".css": "css", ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".json": "json", ".md": "markdown", ".markdown": "markdown", ".svg": "xml", ".xml": "xml", ".txt": "plaintext", ".csv": "plaintext" }[ext] || "plaintext";
}

/* ---------- frontmatter ---------- */

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: md, raw: md };
  const fm = {};
  m[1].split(/\r?\n/).forEach(function (line) {
    const mm = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!mm) return;
    const k = mm[1].toLowerCase();
    let v = mm[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v.slice(1, -1).split(",").map(function (s) { return s.trim().replace(/^["']|["']$/g, ""); }).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, "");
    }
    fm[k] = v;
  });
  return { fm: fm, body: md.slice(m[0].length), raw: md };
}

function deriveDescription(body) {
  const lines = String(body || "").split(/\r?\n/);
  for (const ln of lines) {
    const t = ln.trim();
    if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("---") || t.startsWith("<") || t.startsWith("|")) continue;
    const clean = t.replace(/\*\*/g, "").replace(/`/g, "").replace(/\[(.*?)\]\(.*?\)/g, "$1");
    return clean.length > 190 ? clean.slice(0, 187) + "…" : clean;
  }
  return "";
}

/* ---------- preview building: inline local css/js/img into one HTML string ---------- */

const SHIM = '<script>(function(){try{window.localStorage.getItem("__probe__")}catch(e){var s={};var o={getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null}};Object.defineProperty(o,"length",{get:function(){return Object.keys(s).length},configurable:true});try{Object.defineProperty(window,"localStorage",{value:o,configurable:true})}catch(e2){}}})();<\/script>';

function isExternal(url) { return /^(https?:)?\/\//i.test(url) || /^(data:|#|mailto:|javascript:)/i.test(url); }

function inlineAssets(html, baseDir) {
  // stylesheets
  html = html.replace(/<link\b[^>]*>/gi, function (tag) {
    if (!/stylesheet/i.test(tag)) return tag;
    const hrefM = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefM || isExternal(hrefM[1])) return tag;
    const p = path.resolve(baseDir, decodeURIComponent(hrefM[1].split("?")[0]));
    if (!exists(p)) return tag;
    const css = readText(p);
    return "<style>\n" + css + "\n</style>";
  });
  // scripts
  html = html.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, function (tag, src) {
    if (isExternal(src)) return tag;
    const p = path.resolve(baseDir, decodeURIComponent(src.split("?")[0]));
    if (!exists(p)) return tag;
    const js = readText(p);
    return "<script>\n" + js.replace(/<\/script/gi, "<\\/script") + "\n<\/script>";
  });
  // images
  html = html.replace(/<img\b[^>]*>/gi, function (tag) {
    const srcM = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!srcM || isExternal(srcM[1])) return tag;
    const p = path.resolve(baseDir, decodeURIComponent(srcM[1].split("?")[0]));
    if (!exists(p)) return tag;
    const ext = path.extname(p).toLowerCase();
    if (!IMG_EXT.has(ext)) return tag;
    const buf = fs.readFileSync(p);
    if (buf.length > IMG_INLINE_MAX) return tag;
    const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : ext === ".avif" ? "image/avif" : "image/jpeg";
    return tag.replace(srcM[1], "data:" + mime + ";base64," + buf.toString("base64"));
  });
  return html;
}

function buildPreviewHtml(fileRec) {
  let html = inlineAssets(fileRec.content, fileRec._baseDir);
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, function (m) { return m + SHIM; });
  } else {
    html = SHIM + html;
  }
  return html;
}

/* ---------- collectors ---------- */

function collectFiles(rootDir, relList, displayPrefix) {
  const files = [];
  for (const rel of relList || []) {
    const p = path.resolve(rootDir, rel);
    if (!exists(p)) { warn("File not found: " + rel + " (in " + rootDir + ")"); continue; }
    const ext = path.extname(p).toLowerCase();
    if (IMG_EXT.has(ext) && !TEXT_EXT.has(ext)) continue; // binaries are inlined into preview only
    if (!TEXT_EXT.has(ext)) continue;
    const st = fs.statSync(p);
    if (st.size > TEXT_MAX) { warn("Skipped (too large): " + rel); continue; }
    files.push({
      path: (displayPrefix ? displayPrefix + "/" : "") + rel.replace(/\\/g, "/"),
      lang: langOf(ext),
      content: readText(p),
      _baseDir: path.dirname(p),
      _mtime: st.mtime.toISOString()
    });
  }
  return files;
}

function walkDesignFolder(dir, prefix) {
  let out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (/^(node_modules|build|dist|\.git)$/i.test(ent.name)) continue;
      out = out.concat(walkDesignFolder(p, prefix ? prefix + "/" + ent.name : ent.name));
    } else if (ent.isFile()) {
      out.push({ abs: p, rel: prefix ? prefix + "/" + ent.name : ent.name });
    }
  }
  return out;
}

function prettify(slug) {
  return slug.split(/[-_]+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
}

function makeDocs(fileName, raw) {
  const parsed = parseFrontmatter(raw);
  return { file: fileName, raw: parsed.raw, body: parsed.body, _fm: parsed.fm };
}

/* entries registered in library.json */
function processRegistryEntry(e, idx) {
  const src = e.source || {};
  const rootDir = path.resolve(ROOT, e.root || src.root || ".");
  let files = [], docs = null, previewRec = null;

  if (e.type === "link") {
    if (!e.url) { warn("Link entry \"" + (e.id || idx) + "\" has no url — skipped"); return null; }
    return {
      id: e.id, title: e.title || e.url, description: e.description || "",
      tags: e.tags || [], type: "link", link: e.url,
      updated: new Date().toISOString(), docs: null, files: [], preview: null,
      _order: e.order != null ? e.order : idx
    };
  }

  files = collectFiles(rootDir, e.files || src.files, "");

  // docs: library-relative path first, then relative to the source root
  if (e.docs) {
    let dp = path.resolve(ROOT, e.docs);
    if (!exists(dp)) dp = path.resolve(rootDir, e.docs);
    if (exists(dp)) docs = makeDocs(path.basename(dp), readText(dp));
    else warn("Docs file not found for \"" + e.id + "\": " + e.docs);
  } else {
    const mdFile = files.find(function (f) { return /\.md$/.test(f.path); });
    if (mdFile) docs = makeDocs(mdFile.path.split("/").pop(), mdFile.content);
  }

  // preview: named entry file, else first html
  const want = e.preview ? String(e.preview).replace(/\\/g, "/") : null;
  previewRec = (want && files.find(function (f) { return f.path === want || f.path.split("/").pop() === want; })) ||
    files.find(function (f) { return /\.html?$/i.test(f.path); }) || null;

  const type = e.type || (previewRec ? "code" : "docs");
  if (type === "code" && !previewRec) warn("No HTML file to preview for \"" + e.id + "\" — showing as docs-only");
  if (!docs && !previewRec && type !== "link") { warn("Entry \"" + e.id + "\" has neither docs nor preview — skipped"); return null; }

  const updated = files.reduce(function (acc, f) { return f._mtime > acc ? f._mtime : acc; }, new Date(0).toISOString());

  return {
    id: e.id, title: e.title || prettify(e.id || "untitled"),
    description: e.description || (docs ? deriveDescription(docs.body) : ""),
    tags: e.tags || [], type: type, link: e.link || null,
    updated: updated,
    docs: docs ? { file: docs.file, raw: docs.raw, body: docs.body } : null,
    files: files.map(function (f) { return { path: f.path, lang: f.lang, content: f.content }; }),
    preview: previewRec ? { file: previewRec.path, html: buildPreviewHtml(previewRec) } : null,
    _order: e.order != null ? e.order : idx
  };
}

/* auto-discovered designs/<slug>/ folders */
function processFolderDesign(slug) {
  const dir = path.join(DESIGNS_DIR, slug);
  const all = walkDesignFolder(dir, "");
  if (!all.length) return null;

  let docs = null, fm = {};
  const files = [];
  let latest = new Date(0);

  for (const item of all) {
    const ext = path.extname(item.abs).toLowerCase();
    if (item.rel.toLowerCase() === "design.md") {
      const raw = readText(item.abs);
      const parsed = parseFrontmatter(raw);
      fm = parsed.fm;
      docs = { file: "design.md", raw: parsed.raw, body: parsed.body, _fm: parsed.fm };
      const st = fs.statSync(item.abs);
      if (st.mtime > latest) latest = st.mtime;
      continue;
    }
    if (IMG_EXT.has(ext) && !TEXT_EXT.has(ext)) continue;
    if (!TEXT_EXT.has(ext)) continue;
    const st = fs.statSync(item.abs);
    if (st.size > TEXT_MAX) { warn("Skipped (too large): designs/" + slug + "/" + item.rel); continue; }
    if (st.mtime > latest) latest = st.mtime;
    files.push({ path: item.rel.replace(/\\/g, "/"), lang: langOf(ext), content: readText(item.abs), _baseDir: path.dirname(item.abs), _mtime: st.mtime.toISOString() });
  }

  const previewRec =
    (fm.preview && files.find(function (f) { return f.path === fm.preview || f.path.split("/").pop() === fm.preview; })) ||
    files.find(function (f) { return /^index\.html?$/i.test(f.path); }) ||
    files.find(function (f) { return /\.html?$/i.test(f.path); }) || null;

  const type = previewRec ? "code" : (docs ? "docs" : null);
  if (!type) { warn("designs/" + slug + " has no html or design.md — skipped"); return null; }

  const tags = Array.isArray(fm.tags) ? fm.tags : (typeof fm.tags === "string" && fm.tags ? fm.tags.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : []);
  const order = fm.order != null && !isNaN(parseInt(fm.order, 10)) ? parseInt(fm.order, 10) : 900;

  return {
    id: slug,
    title: fm.title || (docs && docs._fm.title) || prettify(slug),
    description: fm.description || (docs ? deriveDescription(docs.body) : ""),
    tags: tags, type: type, link: fm.link || null,
    updated: latest.toISOString(),
    docs: docs ? { file: docs.file, raw: docs.raw, body: docs.body } : null,
    files: files.map(function (f) { return { path: f.path, lang: f.lang, content: f.content }; }),
    preview: previewRec ? { file: previewRec.path, html: buildPreviewHtml(previewRec) } : null,
    _order: order
  };
}

/* Compose a self-contained preview from separate html/css/js strings
   (used for imported/<name>.json exports from the website form). */
function composeImportedPreview(html, css, js) {
  let doc = String(html || "");
  const used = { css: false, js: false };

  if (css && String(css).trim()) {
    const styleBlock = "<style>\n" + css + "\n</style>";
    doc = doc.replace(/<link\b[^>]*>/gi, function (tag) {
      if (!/stylesheet/i.test(tag) || used.css) return tag;
      const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (!m || isExternal(m[1])) return tag;
      const base = m[1].split("?")[0].split("/").pop().toLowerCase();
      if (base !== "style.css") return tag;
      used.css = true;
      return styleBlock;
    });
  }
  if (js && String(js).trim()) {
    const scriptBlock = "<script>\n" + String(js).replace(/<\/script/gi, "<\\/script") + "\n<\/script>";
    doc = doc.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, function (tag, src) {
      if (used.js || isExternal(src)) return tag;
      const base = src.split("?")[0].split("/").pop().toLowerCase();
      if (base !== "script.js") return tag;
      used.js = true;
      return scriptBlock;
    });
  }

  const styleBlock = css && String(css).trim() && !used.css ? "<style>\n" + css + "\n</style>" : "";
  const scriptBlock = js && String(js).trim() && !used.js
    ? "<script>\n" + String(js).replace(/<\/script/gi, "<\\/script") + "\n<\/script>" : "";

  const inject = SHIM + (styleBlock ? "\n" + styleBlock : "");
  if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head([^>]*)>/i, function (m) { return m + inject; });
  else doc = inject + doc;
  if (scriptBlock) {
    if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, scriptBlock + "\n</body>");
    else doc += scriptBlock;
  }
  return doc;
}

/* exported from the website's Add-design form (dropped into imported/<name>.json) */
function processImported(data, fileName) {
  if (!data || typeof data !== "object") { warn("imported/" + fileName + " — not an object"); return null; }
  const fileDefs = [
    ["index.html", "html", data.html],
    ["style.css", "css", data.css],
    ["script.js", "javascript", data.js]
  ];
  const files = [];
  let htmlContent = null;
  fileDefs.forEach(function (def) {
    if (def[2] && String(def[2]).trim()) {
      files.push({ path: def[0], lang: def[1], content: String(def[2]), _baseDir: ROOT, _mtime: new Date().toISOString() });
      if (def[1] === "html") htmlContent = String(def[2]);
    }
  });
  let docs = null;
  if (data.markdown && String(data.markdown).trim()) docs = makeDocs("design.md", String(data.markdown));
  if (!htmlContent && !docs && !data.link) { warn("imported/" + fileName + " — has no html, markdown or link"); return null; }
  const type = htmlContent ? "code" : (docs ? "docs" : "link");
  const id = data.id || path.basename(fileName, ".json");
  return {
    id: id,
    title: data.title || prettify(id),
    description: data.description || (docs ? deriveDescription(docs.body) : ""),
    tags: Array.isArray(data.tags) ? data.tags : [],
    type: type,
    link: data.link || null,
    updated: data.exportedAt || new Date().toISOString(),
    docs: docs ? { file: docs.file, raw: docs.raw, body: docs.body } : null,
    files: files.map(function (f) { return { path: f.path, lang: f.lang, content: f.content }; }),
    preview: htmlContent ? {
      file: "index.html",
      html: composeImportedPreview(htmlContent, data.css, data.js)
    } : null,
    _order: data.order != null ? data.order : 3
  };
}

function main() {
  console.log("Building design library…\n");
  const designs = [];

  // 1. registry entries
  let registry = { designs: [] };
  if (exists(LIB_FILE)) {
    try { registry = JSON.parse(readText(LIB_FILE)); }
    catch (e) { warn("library.json is not valid JSON: " + e.message); }
  }
  (registry.designs || []).forEach(function (e, i) {
    const d = processRegistryEntry(e, i);
    if (d) { designs.push(d); console.log("  ✓ " + d.id + "  [" + d.type + "]  files:" + d.files.length + (d.docs ? "  docs:" + d.docs.file : "") + (d.preview ? "  preview:" + fmtKB(d.preview.html) : "")); }
  });

  // 2. designs/ folders
  if (fs.existsSync(DESIGNS_DIR)) {
    fs.readdirSync(DESIGNS_DIR, { withFileTypes: true }).forEach(function (ent) {
      if (!ent.isDirectory() || ent.name.startsWith(".")) return;
      const d = processFolderDesign(ent.name);
      if (d) { designs.push(d); console.log("  ✓ designs/" + d.id + "  [" + d.type + "]  files:" + d.files.length + (d.docs ? "  docs:" + d.docs.file : "") + (d.preview ? "  preview:" + fmtKB(d.preview.html) : "")); }
    });
  } else {
    console.log("  (no designs/ folder — create one or use library.json)");
  }

  // 3. imported/ — JSON exports from the website's Add-design form
  const IMPORTED_DIR = path.join(ROOT, "imported");
  if (fs.existsSync(IMPORTED_DIR)) {
    fs.readdirSync(IMPORTED_DIR, { withFileTypes: true }).forEach(function (ent) {
      if (!ent.isFile() || !/\.json$/i.test(ent.name)) return;
      let data = null;
      try { data = JSON.parse(readText(path.join(IMPORTED_DIR, ent.name))); }
      catch (e) { warn("Invalid JSON in imported/" + ent.name + ": " + e.message); return; }
      const d = processImported(data, ent.name);
      if (d) { designs.push(d); console.log("  ✓ imported/" + ent.name + "  [" + d.type + "]  " + (d.preview ? "preview:" + fmtKB(d.preview.html) : "no preview")); }
    });
  }

  // unique ids
  const seen = {};
  designs.forEach(function (d) {
    let id = d.id || prettify(d.title).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    while (seen[id]) id = id + "-" + (seen[id] + 1);
    seen[id] = (seen[id] || 0) + 1;
    d.id = id;
  });

  // sort: order, then title
  designs.sort(function (a, b) {
    return (a._order - b._order) || String(a.title).localeCompare(String(b.title));
  });
  designs.forEach(function (d) { delete d._order; });

  const payload = {
    generatedAt: new Date().toISOString(),
    count: designs.length,
    designs: designs
  };

  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  fs.writeFileSync(OUT_FILE, "/* AUTO-GENERATED by build.js — do not edit by hand.\n   Add designs via library.json or designs/<slug>/ folders, then run: node build.js */\nwindow.DESIGN_LIBRARY = " + json + ";\n");

  // bump the cache-buster on the designs.js script tag in index.html,
  // so visitors get the fresh library as soon as Pages deploys (no hard refresh needed)
  const idxPath = path.join(ROOT, "index.html");
  if (exists(idxPath)) {
    let idx = readText(idxPath);
    const stamp = Date.now();
    if (/<script src="designs\.js\?v=[^"]*"><\/script>/.test(idx)) {
      idx = idx.replace(/(<script src="designs\.js\?v=)[^"]*("><\/script>)/, "$1" + stamp + "$2");
    } else if (idx.includes('<script src="designs.js"></script>')) {
      idx = idx.replace('<script src="designs.js"></script>', '<script src="designs.js?v=' + stamp + '"></script>');
    }
    fs.writeFileSync(idxPath, idx);
    console.log("  cache-buster in index.html → designs.js?v=" + stamp);
  }

  console.log("\n  " + designs.length + " design(s) packed → designs.js (" + fmtKB(fs.readFileSync(OUT_FILE)) + ")");
  if (warnings.length) console.log("  " + warnings.length + " warning(s)");
  console.log("Done.");
}

function fmtKB(x) {
  const s = typeof x === "string" ? Buffer.byteLength(x) : x.length || Buffer.byteLength(x);
  return (s / 1024).toFixed(1) + " KB";
}

main();
