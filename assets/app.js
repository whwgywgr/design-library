/* ============================================================
   Design Library — app
   Hash routing:  #/  → gallery    #/d/<id>  → design detail
   Everything is served from window.DESIGN_LIBRARY (built by build.js),
   so the site works from file:// and from any static host.
   ============================================================ */

(function () {
  "use strict";

  var MAN = window.DESIGN_MANIFEST || { designs: [], generatedAt: null };
  var BUILTIN = (MAN.designs || []).map(function (d) { d._light = true; return d; });
  var LOCAL_KEY = "designlib.local.v1";
  var storageOK = (function () {
    try { var t = "__dl_probe__"; localStorage.setItem(t, "1"); localStorage.removeItem(t); return true; }
    catch (e) { return false; }
  })();
  var LOCAL = loadLocal();
  var DESIGNS = mergeDesigns();
  var state = { q: "", tag: "All" };

  /* ---------- helpers ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function byId(id) {
    for (var i = 0; i < DESIGNS.length; i++) if (DESIGNS[i].id === id) return DESIGNS[i];
    return null;
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url || ""; }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function fmtSize(str) {
    var kb = (new TextEncoder().encode(str).length) / 1024;
    return kb >= 100 ? Math.round(kb) + " KB" : kb.toFixed(1) + " KB";
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast(okMsg); }
      catch (e) { toast("Copy failed — select the code manually"); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else fallback();
  }

  var toastTimer = null;
  function toast(msg, ms) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, ms || 1800);
  }

  /* ---------- local designs (added through the form, saved in this browser) ---------- */

  var PREVIEW_SHIM = '<script>(function(){try{window.localStorage.getItem("__probe__")}catch(e){var s={};var o={getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null}};Object.defineProperty(o,"length",{get:function(){return Object.keys(s).length},configurable:true});try{Object.defineProperty(window,"localStorage",{value:o,configurable:true})}catch(e2){}}})();<\/script>';

  function loadLocal() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function persistLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(LOCAL)); }
    catch (e) { toast("Could not save — browser storage is full or blocked", 3500); }
  }

  function mergeDesigns() {
    var locals = LOCAL.slice().sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); });
    return locals.concat(BUILTIN);
  }

  function refreshDesigns() {
    DESIGNS = mergeDesigns();
    updateCounts();
  }

  function slugify(s) {
    var out = String(s || "design").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return out || "design";
  }

  function stripFrontmatter(md) {
    var m = String(md || "").match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    return m ? md.slice(m[0].length) : String(md || "");
  }

  function uniqueId(base, exceptId) {
    var ids = {};
    DESIGNS.forEach(function (d) { ids[d.id] = 1; });
    if (exceptId) delete ids[exceptId];
    var id = base, i = 2;
    while (ids[id]) id = base + "-" + (i++);
    return id;
  }

  function readFileAsText(file) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = function () { resolve(""); };
      r.readAsText(file);
    });
  }

  function isExternalRef(u) {
    return /^(https?:)?\/\//i.test(u) || /^(data:|#|mailto:|javascript:)/i.test(u);
  }

  /* Build a self-contained preview document: swaps local <link>/<script src>
     tags for the provided separate CSS/JS files, and injects any that were
     never referenced, so separate or single-file designs both render. */
  function buildPreviewHtml(html, cssFiles, jsFiles) {
    var doc = String(html || "");
    cssFiles = cssFiles || [];
    jsFiles = jsFiles || [];
    var usedCss = [], usedJs = [];

    doc = doc.replace(/<link\b[^>]*>/gi, function (tag) {
      if (!/stylesheet/i.test(tag)) return tag;
      var m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (!m || isExternalRef(m[1])) return tag;
      var base = m[1].split("?")[0].split("/").pop().toLowerCase();
      for (var i = 0; i < cssFiles.length; i++) {
        if (cssFiles[i].name.toLowerCase() === base && usedCss.indexOf(cssFiles[i]) === -1) {
          usedCss.push(cssFiles[i]);
          return "<style>\n" + cssFiles[i].content + "\n</style>";
        }
      }
      return tag;
    });

    doc = doc.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, function (tag, src) {
      if (isExternalRef(src)) return tag;
      var base = src.split("?")[0].split("/").pop().toLowerCase();
      for (var j = 0; j < jsFiles.length; j++) {
        if (jsFiles[j].name.toLowerCase() === base && usedJs.indexOf(jsFiles[j]) === -1) {
          usedJs.push(jsFiles[j]);
          return "<script>\n" + jsFiles[j].content.replace(/<\/script/gi, "<\\/script") + "\n<\/script>";
        }
      }
      return tag;
    });

    var styleBlock = cssFiles.filter(function (c) { return usedCss.indexOf(c) === -1; })
      .map(function (c) { return "<style>\n" + c.content + "\n</style>"; }).join("\n");
    var scriptBlock = jsFiles.filter(function (j) { return usedJs.indexOf(j) === -1; })
      .map(function (j) { return "<script>\n" + j.content.replace(/<\/script/gi, "<\\/script") + "\n<\/script>"; }).join("\n");

    var inject = PREVIEW_SHIM + (styleBlock ? "\n" + styleBlock : "");
    if (/<head[^>]*>/i.test(doc)) {
      doc = doc.replace(/<head([^>]*)>/i, function (m) { return m + inject; });
    } else {
      doc = inject + doc;
    }
    if (scriptBlock) {
      if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, scriptBlock + "\n</body>");
      else doc += scriptBlock;
    }
    return doc;
  }

  /* ---------- lazy content loading ----------
     Manifest entries are light (no code). Full content lives in data/<id>.json
     chunks fetched on demand — with a designs.js fallback for file:// / offline. */

  var CONTENT = {};

  function ensureFullLibrary() {
    if (window.DESIGN_LIBRARY) return Promise.resolve();
    return new Promise(function (res) {
      var s = document.createElement("script");
      s.src = "designs.js";
      s.onload = res;
      s.onerror = res;
      document.head.appendChild(s);
    });
  }

  function getContent(d) {
    if (!d._light) return Promise.resolve(d);      // local / already-full record
    if (CONTENT[d.id]) return Promise.resolve(CONTENT[d.id]);
    function fallback() {
      return ensureFullLibrary().then(function () {
        var full = (window.DESIGN_LIBRARY && window.DESIGN_LIBRARY.designs.find(function (x) { return x.id === d.id; })) || d;
        full._light = false;
        CONTENT[d.id] = full;
        return full;
      });
    }
    if (location.protocol === "file:") return fallback();
    return fetch("data/" + encodeURIComponent(d.id) + ".json?v=" + encodeURIComponent(MAN.generatedAt || ""))
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (full) { full._light = false; CONTENT[d.id] = full; return full; })
      .catch(fallback);
  }

  function hasPreview(d) { return !!(d.preview || d.hasPreview); }
  function hasDocs(d) { return !!(d.docs || d.hasDocs); }

  /* ---------- icons ---------- */

  var I = {
    code: '<svg class="icon" viewBox="0 0 24 24"><path d="m8 8-5 4 5 4"/><path d="m16 8 5 4-5 4"/><path d="m13 5-2 14"/></svg>',
    eye: '<svg class="icon" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    doc: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>',
    link: '<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    external: '<svg class="icon" viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    download: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
    copy: '<svg class="icon" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    back: '<svg class="icon" viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    desktop: '<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    tablet: '<svg class="icon" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
    file: '<svg class="icon" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/></svg>',
    folder: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    layers: '<svg class="icon" viewBox="0 0 24 24"><path d="m12 2 10 6-10 6L2 8Z"/><path d="m2 14 10 6 10-6"/></svg>',
    pencil: '<svg class="icon" viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
    trash: '<svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };

  var TYPE_LABEL = { code: "Code", docs: "Docs", link: "Link" };
  var TYPE_ICON = { code: I.code, docs: I.doc, link: I.link };

  /* ---------- routing ---------- */

  function route() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/d\/([^/?]+)/);
    if (m) renderDetail(decodeURIComponent(m[1]));
    else renderGallery();
    window.scrollTo({ top: 0 });
  }

  /* ---------- gallery ---------- */

  function allTags() {
    var counts = {};
    DESIGNS.forEach(function (d) {
      (d.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    }).map(function (t) { return { name: t, count: counts[t] }; });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DESIGNS.filter(function (d) {
      if (state.tag !== "All" && (d.tags || []).indexOf(state.tag) === -1) return false;
      if (!q) return true;
      var hay = (d.title + " " + (d.description || "") + " " + (d.tags || []).join(" ")).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function typeBadge(type) {
    return '<span class="card-preview-type">' + (TYPE_ICON[type] || I.file) + esc(TYPE_LABEL[type] || "Item") + "</span>";
  }

  function cardPreview(d) {
    if (d.type === "link") {
      return '<div class="card-preview">' + typeBadge("link") +
        '<div class="card-preview-placeholder">' +
        '<div class="ph-big" aria-hidden="true">' + esc(domainOf(d.link).charAt(0).toUpperCase()) + "</div>" +
        '<div class="ph-domain">' + I.external + esc(domainOf(d.link)) + "</div>" +
        "</div></div>";
    }
    if (d.type === "docs" || !hasPreview(d)) {
      return '<div class="card-preview">' + typeBadge("docs") +
        '<div class="card-preview-placeholder">' +
        '<div class="ph-big" aria-hidden="true">M&darr;</div>' +
        '<div class="ph-domain">' + I.doc + "Design document</div>" +
        "</div></div>";
    }
    return '<div class="card-preview">' + typeBadge("code") + "</div>";
  }

  function cardHTML(d) {
    return '<a class="card" href="#/d/' + encodeURIComponent(d.id) + '" data-id="' + esc(d.id) + '">' +
      cardPreview(d) +
      '<div class="card-body">' +
      '<h3 class="card-title">' + esc(d.title) + "</h3>" +
      (d.description ? '<p class="card-desc">' + esc(d.description) + "</p>" : "") +
      '<div class="card-tags">' +
      (d.tags || []).slice(0, 4).map(function (t) { return '<span class="mini-tag">' + esc(t) + "</span>"; }).join("") +
      "</div>" +
      '<span class="card-meta">' + fmtDate(d.updated) + (d.local ? " · on this device" : "") + "</span>" +
      "</div></a>";
  }

  function renderGallery() {
    document.title = "Design Library";
    var tags = allTags();
    var items = filtered();

    var html =
      '<div class="container">' +
      '<div class="gallery-hero"><h1>Design Library</h1>' +
      "<p>Your personal collection — open any design to see the live result, browse the full source code, read or download the design document, and visit the original site.</p></div>" +
      '<div class="toolbar"><button class="chip' + (state.tag === "All" ? " active" : "") + '" data-tag="All">All <span class="chip-n">' + DESIGNS.length + "</span></button>" +
      tags.map(function (t) {
        return '<button class="chip' + (state.tag === t.name ? " active" : "") + '" data-tag="' + esc(t.name) + '">' +
          esc(t.name) + ' <span class="chip-n">' + t.count + "</span></button>";
      }).join("") +
      '<span class="toolbar-meta">' + items.length + " design" + (items.length === 1 ? "" : "s") + "</span></div>";

    if (!DESIGNS.length) {
      html += '<div class="empty">' + I.folder +
        "<h3>No designs yet</h3><p>Click <b>Add design</b> to create your first one — or drop a <b>.html</b> file anywhere on this page.</p></div>";
    } else if (!items.length) {
      html += '<div class="empty">' + I.search +
        "<h3>Nothing found</h3><p>Try a different search or tag.</p></div>";
    } else {
      html += '<div class="grid" id="grid">' +
        items.map(cardHTML).join("") + "</div>";
    }
    html += "</div>";
    $("#app").innerHTML = html;

    // tag chips
    $all(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.tag = chip.getAttribute("data-tag");
        renderGallery();
      });
    });

    // live card previews (lazy)
    if (items.length) attachCardPreviews(items);
  }

  function attachCardPreviews(items) {
    var boxes = [];
    items.forEach(function (d) {
      if (d.type !== "code" || !hasPreview(d)) return;
      var card = $('.card[data-id="' + d.id + '"]');
      if (!card) return;
      var box = $(".card-preview", card);
      boxes.push({ box: box, id: d.id });
    });

    function fit(frame, box) {
      var w = box.clientWidth;
      if (w > 0) frame.style.transform = "scale(" + (w / 1200) + ")";
    }

    function mount(item) {
      var box = item.box;
      if (box.getAttribute("data-mounted")) return;
      box.setAttribute("data-mounted", "1");
      var loading = document.createElement("div");
      loading.className = "loading";
      loading.textContent = "loading preview…";
      box.appendChild(loading);
      var frame = document.createElement("iframe");
      frame.className = "card-preview-frame";
      frame.setAttribute("tabindex", "-1");
      frame.setAttribute("aria-hidden", "true");
      box.appendChild(frame);
      fit(frame, box);

      getContent(byId(item.id)).then(function (full) {
        if (!box.isConnected) return;
        frame.onload = function () { if (loading.parentNode) loading.remove(); };
        frame.srcdoc = (full && full.preview) ? full.preview.html : "";
        fit(frame, box);
        setTimeout(function () { if (loading.parentNode) loading.remove(); }, 1200);
      });
    }

    function unmount(item) {
      var box = item.box;
      if (!box.getAttribute("data-mounted")) return;
      var f = box.querySelector("iframe");
      if (f) f.remove(); // stops the design's scripts/CPU when scrolled far away
      delete box.dataset.mounted;
    }

    if ("IntersectionObserver" in window) {
      var near = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            var item = boxes.filter(function (b) { return b.box === en.target; })[0];
            if (item) mount(item);
          }
        });
      }, { rootMargin: "260px" });
      var far = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) {
            var item = boxes.filter(function (b) { return b.box === en.target; })[0];
            if (item) unmount(item);
          }
        });
      }, { rootMargin: "-460px 0px -460px 0px" });
      boxes.forEach(function (b) { near.observe(b.box); far.observe(b.box); });
    } else {
      boxes.forEach(function (b) { mount(b); });
    }

    addEventListener("resize", function () {
      document.querySelectorAll(".card-preview-frame").forEach(function (f) {
        if (f.parentElement) fit(f, f.parentElement);
      });
    });
  }

  /* ---------- detail ---------- */

  function openFullPreview(d) {
    var blob = new Blob([d.preview.html], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function renderDetail(id) {
    var d = byId(id);
    var app = $("#app");
    if (!d) {
      app.innerHTML = '<div class="container"><div class="empty">' + I.search +
        '<h3>Design not found</h3><p>It may have been renamed or removed. <a href="#/">Back to the library.</a></p></div></div>';
      return;
    }
    document.title = d.title + " — Design Library";

    var actions = "";
    if (d.type === "link") {
      actions = '<a class="btn btn-primary" href="' + esc(d.link) + '" target="_blank" rel="noopener">' + I.external + "Visit website</a>";
    } else {
      if (d.type === "code" && hasPreview(d)) {
        actions += '<button class="btn btn-primary" data-act="open-preview">' + I.external + "Open full preview</button>";
      }
      if (hasDocs(d)) {
        actions += '<button class="btn" data-act="download-docs">' + I.download + "Download design.md</button>";
      }
    }
    if (d.local) {
      actions += '<button class="btn" data-act="edit">' + I.pencil + "Edit</button>" +
        '<button class="btn" data-act="export">' + I.download + "Export for build</button>" +
        '<button class="btn" data-act="delete">' + I.trash + "Delete</button>";
    }

    var tabs = "";
    if (d.type === "code") {
      if (hasPreview(d)) {
        tabs += '<button class="tab active" data-tab="preview">' + I.eye + "Preview</button>";
      }
      tabs += '<button class="tab' + (hasPreview(d) ? "" : " active") + '" data-tab="code">' + I.code + 'Code <span class="tab-n">' + (d.files ? d.files.length : 0) + "</span></button>";
    }
    if (hasDocs(d)) {
      tabs += '<button class="tab' + (d.type !== "code" ? " active" : "") + '" data-tab="docs">' + I.doc + "Design doc</button>";
    }

    app.innerHTML =
      '<div class="container detail">' +
      '<a class="back-link" href="#/">' + I.back + "Library</a>" +
      '<div class="detail-head"><div class="detail-head-text">' +
      '<h1 class="detail-title">' + esc(d.title) + "</h1>" +
      (d.description ? '<p class="detail-sub">' + esc(d.description) + "</p>" : "") +
      '<div class="detail-tags">' + (d.tags || []).map(function (t) { return '<span class="mini-tag">' + esc(t) + "</span>"; }).join("") +
      '<span class="card-meta" style="align-self:center">Updated ' + fmtDate(d.updated) + "</span>" +
      "</div></div>" +
      '<div class="detail-actions">' + actions + "</div></div>" +
      (tabs ? '<div class="tabs">' + tabs + "</div>" : "") +
      '<div class="panel" id="panel"></div>' +
      "</div>";

    // actions
    var actOpen = $('[data-act="open-preview"]');
    if (actOpen) actOpen.addEventListener("click", function () { getContent(d).then(openFullPreview); });
    var actDocs = $('[data-act="download-docs"]');
    if (actDocs) actDocs.addEventListener("click", function () {
      getContent(d).then(function (full) {
        download("design.md", (full.docs && (full.docs.raw || full.docs.content)) || "", "text/markdown;charset=utf-8");
        toast("design.md downloaded");
      });
    });
    var actEdit = $('[data-act="edit"]');
    if (actEdit) actEdit.addEventListener("click", function () { openForm(d, null); });
    var actExport = $('[data-act="export"]');
    if (actExport) actExport.addEventListener("click", function () { exportLocalDesign(d); });
    var actDelete = $('[data-act="delete"]');
    if (actDelete) actDelete.addEventListener("click", function () { deleteLocalDesign(d); });

    // tabs
    var active = d.type === "code" ? (hasPreview(d) ? "preview" : "code") : (hasDocs(d) ? "docs" : null);
    if (active) showTab(d, active);

    $all(".tab").forEach(function (t) {
      t.addEventListener("click", function () {
        $all(".tab").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        showTab(d, t.getAttribute("data-tab"));
      });
    });
  }

  function showTab(d, tab) {
    var panel = $("#panel");
    if (!panel) return;
    panel.innerHTML = '<div class="loading-big">Loading…</div>';
    getContent(d).then(function (full) {
      if (tab === "preview") renderPreviewPanel(full, panel);
      else if (tab === "code") renderCodePanel(full, panel);
      else if (tab === "docs") renderDocsPanel(full, panel);
    });
  }

  /* ---------- preview tab ---------- */

  function renderPreviewPanel(d, panel) {
    panel.innerHTML =
      '<div class="preview-stage">' +
      '<div class="preview-toolbar">' +
      '<span class="pt-label">' + I.layers + ' preview · rendered from full source</span>' +
      '<div class="seg" role="group" aria-label="Viewport width">' +
      '<button data-w="" class="active">' + I.desktop + 'Desktop</button>' +
      '<button data-w="w-tablet">' + I.tablet + 'Tablet</button>' +
      '<button data-w="w-phone">' + I.phone + 'Phone</button>' +
      "</div></div>" +
      '<div class="preview-frame-wrap"><iframe class="preview-frame" title="Live preview"></iframe></div>' +
      "</div>";

    var frame = $(".preview-frame", panel);
    frame.srcdoc = (d.preview && d.preview.html) ? d.preview.html :
      '<body style="font-family:sans-serif;color:#9a9aa3;display:grid;place-items:center;height:100vh;margin:0">No preview available for this design.</body>';

    $all(".seg button", panel).forEach(function (b) {
      b.addEventListener("click", function () {
        $all(".seg button", panel).forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        frame.className = "preview-frame " + (b.getAttribute("data-w") || "");
      });
    });
  }

  /* ---------- code tab ---------- */

  function renderCodePanel(d, panel) {
    var files = d.files || [];
    var current = files[0];

    panel.innerHTML =
      '<div class="code-layout">' +
      '<div class="file-list"><div class="file-list-title">Files</div>' +
      files.map(function (f, i) {
        return '<button class="file-item' + (i === 0 ? " active" : "") + '" data-f="' + i + '">' +
          I.file + esc(f.path) + '<span class="fi-size">' + fmtSize(f.content) + "</span></button>";
      }).join("") +
      "</div>" +
      '<div class="code-pane">' +
      '<div class="code-pane-head"><span class="cp-file" id="cpFile"></span>' +
      '<div class="cp-actions">' +
      '<button class="btn btn-sm" id="cpCopy">' + I.copy + "Copy</button>" +
      '<button class="btn btn-sm" id="cpDl">' + I.download + "Download</button>" +
      "</div></div>" +
      '<div class="code-scroll"><pre><code class="hljs" id="codeEl"></code></pre></div>' +
      "</div></div>";

    function showFile(f) {
      current = f;
      $("#cpFile").innerHTML = I.file + " " + esc(f.path);
      var el = $("#codeEl");
      el.className = "hljs";
      el.removeAttribute("data-lang");
      el.textContent = f.content;
      if (window.hljs) {
        try { hljs.highlightElement(el); } catch (e) { /* leave plain */ }
      }
    }

    $all(".file-item", panel).forEach(function (b) {
      b.addEventListener("click", function () {
        $all(".file-item", panel).forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        showFile(files[parseInt(b.getAttribute("data-f"), 10)]);
      });
    });

    $("#cpCopy").addEventListener("click", function () {
      copyText(current.content, "Copied " + current.path);
    });
    $("#cpDl").addEventListener("click", function () {
      var name = current.path.split("/").pop();
      download(name, current.content);
      toast("Downloaded " + name);
    });

    showFile(files[0] || { path: "—", content: "" });
  }

  /* ---------- docs tab ---------- */

  function renderDocsPanel(d, panel) {
    var body = d.docs.body || d.docs.content || "";
    var html;
    try { html = window.marked ? marked.parse(body) : "<pre>" + esc(body) + "</pre>"; }
    catch (e) { html = "<pre>" + esc(body) + "</pre>"; }

    panel.innerHTML =
      '<div class="docs-pane">' +
      '<div class="docs-head"><span class="dh-file">' + I.doc + " " + esc(d.docs.file || "design.md") + "</span>" +
      '<div class="cp-actions">' +
      '<button class="btn btn-sm" id="mdCopy">' + I.copy + "Copy markdown</button>" +
      '<button class="btn btn-sm" id="mdDl">' + I.download + "Download .md</button>" +
      "</div></div>" +
      '<div class="md" id="mdBody">' + html + "</div></div>";

    if (window.hljs) {
      $all("#mdBody pre code").forEach(function (el) {
        try { hljs.highlightElement(el); } catch (e) { /* noop */ }
      });
    }

    $("#mdCopy").addEventListener("click", function () { copyText(d.docs.raw || body, "Markdown copied"); });
    $("#mdDl").addEventListener("click", function () {
      download("design.md", d.docs.raw || body, "text/markdown;charset=utf-8");
      toast("design.md downloaded");
    });
  }

  /* ---------- add / edit design form ---------- */

  function openForm(existing, prefill) {
    if (document.querySelector(".modal-backdrop")) return;
    var isEdit = !!existing;
    var bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.innerHTML =
      '<div class="modal modal-wide" role="dialog" aria-modal="true" aria-label="' + (isEdit ? "Edit design" : "Add a design") + '">' +
      '<div class="modal-head">' + I.folder + "<h3>" + (isEdit ? "Edit design" : "Add a design") + "</h3>" +
      '<button class="modal-close" aria-label="Close">' +
      '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body form-body">' +
      '<div class="form-grid">' +
      '<div class="form-col">' +
      '<div class="field-row"><label>Title *</label><input type="text" id="fTitle" placeholder="My awesome design"></div>' +
      '<div class="field-row"><label>Short description</label><input type="text" id="fDesc" placeholder="One line shown on the card"></div>' +
      '<div class="field-row"><label>Tags <span class="ft-hint">comma separated</span></label><input type="text" id="fTags" placeholder="landing, component, dashboard"></div>' +
      '<div class="field-row"><label>Source website <span class="ft-hint">optional</span></label><input type="url" id="fLink" placeholder="https://…"></div>' +
      '<div class="field-row"><label>HTML <span class="ft-hint">index.html — the page markup</span></label>' +
      '<textarea id="fHtml" rows="8" spellcheck="false" placeholder="&lt;!DOCTYPE html&gt; …paste your code, or drop .html / .css / .js files anywhere…"></textarea></div>' +
      '<div class="field-row"><label>CSS <span class="ft-hint">optional — separate style.css</span></label>' +
      '<textarea id="fCss" rows="5" spellcheck="false" placeholder="/* leave empty if your CSS is already inline in the HTML */"></textarea></div>' +
      '<div class="field-row"><label>JavaScript <span class="ft-hint">optional — separate script.js</span></label>' +
      '<textarea id="fJs" rows="5" spellcheck="false" placeholder="// leave empty if your JS is already inline in the HTML"></textarea></div>' +
      '<div class="field-row"><label>Design doc <span class="ft-hint">optional markdown, becomes design.md</span></label>' +
      '<textarea id="fMd" rows="4" spellcheck="false" placeholder="# My Design&#10;- palette, typography, structure…"></textarea></div>' +
      "</div>" +
      '<div class="form-col"><div class="pv-box">' +
      '<div class="pv-label">' + I.eye + " Live preview</div>" +
      '<div class="pv-stage">' +
      '<iframe class="pv-frame" id="fPreview" title="Live preview"></iframe>' +
      '<div class="pv-empty" id="fPreviewEmpty">The live preview appears here.<br>Start by pasting your code into the <b>HTML</b> field above.</div>' +
      "</div></div></div>" +
      "</div>" +
      '<div class="form-actions">' +
      '<button class="btn btn-primary" id="fSave">' + (isEdit ? "Save changes" : "Add to library") + "</button>" +
      '<button class="btn" id="fImport">' + I.file + "Import files…</button>" +
      '<span class="form-note">Saved in this browser · open the design and use <b>Export for build</b> to make it permanent</span>' +
      "</div></div></div>";
    document.body.appendChild(bd);

    var fTitle = $("#fTitle", bd), fDesc = $("#fDesc", bd), fTags = $("#fTags", bd),
      fLink = $("#fLink", bd), fHtml = $("#fHtml", bd), fCss = $("#fCss", bd),
      fJs = $("#fJs", bd), fMd = $("#fMd", bd), pv = $("#fPreview", bd);

    if (isEdit) {
      fTitle.value = existing.title;
      fDesc.value = existing.description || "";
      fTags.value = (existing.tags || []).join(", ");
      fLink.value = existing.link || "";
      (existing.files || []).forEach(function (f) {
        if (f.lang === "css") fCss.value = f.content;
        else if (f.lang === "javascript") fJs.value = f.content;
        else if (/\.html?$/i.test(f.path)) fHtml.value = f.content;
      });
      if (existing.docs) fMd.value = existing.docs.raw || existing.docs.body || "";
    } else {
      // restore an unsaved draft, if there is one
      var draft = null;
      try { draft = JSON.parse(localStorage.getItem("designlib.formDraft") || "null"); } catch (e) { draft = null; }
      if (draft) {
        fTitle.value = draft.title || "";
        fDesc.value = draft.description || "";
        fTags.value = draft.tags || "";
        fLink.value = draft.link || "";
        fHtml.value = draft.html || "";
        fCss.value = draft.css || "";
        fJs.value = draft.js || "";
        fMd.value = draft.md || "";
        if (draft.title || draft.html || draft.css || draft.js || draft.md) toast("Unsaved draft restored", 2500);
      }
      if (prefill) {
        if (prefill.html) fHtml.value = prefill.html;
        if (prefill.css) fCss.value = prefill.css;
        if (prefill.js) fJs.value = prefill.js;
        if (prefill.markdown) fMd.value = prefill.markdown;
        if (prefill.title) fTitle.value = prefill.title;
        if (prefill.link) fLink.value = prefill.link;
      }
    }

    // keep an automatic draft so an accidental close never loses work
    var draftTimer = null;
    function saveDraft() {
      if (isEdit) return;
      try {
        localStorage.setItem("designlib.formDraft", JSON.stringify({
          title: fTitle.value, description: fDesc.value, tags: fTags.value,
          link: fLink.value, html: fHtml.value, css: fCss.value, js: fJs.value, md: fMd.value
        }));
      } catch (e) { /* storage full or blocked */ }
    }
    function clearDraft() {
      try { localStorage.removeItem("designlib.formDraft"); } catch (e) { /* noop */ }
    }

    function updatePreview() {
      var empty = !fHtml.value.trim();
      pv.srcdoc = empty ? "" : buildPreviewHtml(fHtml.value,
        fCss.value.trim() ? [{ name: "style.css", content: fCss.value }] : [],
        fJs.value.trim() ? [{ name: "script.js", content: fJs.value }] : []);
      var ph = $("#fPreviewEmpty", bd);
      if (ph) ph.style.display = empty ? "flex" : "none";
    }
    var pvTimer = null;
    function queuePreview() {
      clearTimeout(pvTimer);
      pvTimer = setTimeout(updatePreview, 400);
    }
    [fTitle, fDesc, fTags, fLink, fHtml, fCss, fJs, fMd].forEach(function (el) {
      el.addEventListener("input", function () {
        queuePreview();
        clearTimeout(draftTimer);
        draftTimer = setTimeout(saveDraft, 500);
      });
    });
    updatePreview();

    function close() { bd.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    bd.addEventListener("click", function (e) { if (e.target === bd) close(); });
    $(".modal-close", bd).addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    setTimeout(function () { fTitle.focus(); }, 50);

    // import files straight into the fields
    var fi = document.createElement("input");
    fi.type = "file";
    fi.multiple = true;
    fi.accept = ".html,.htm,.css,.js,.md,.markdown,.txt";
    fi.style.display = "none";
    bd.appendChild(fi);
    $("#fImport", bd).addEventListener("click", function () { fi.click(); });
    fi.addEventListener("change", function () {
      var files = Array.prototype.slice.call(fi.files || []);
      var pending = files.length;
      if (!pending) return;
      files.forEach(function (file) {
        readFileAsText(file).then(function (text) {
          if (text) {
            var nm = file.name.toLowerCase();
            if (/\.html?$/.test(nm)) {
              fHtml.value = text;
              if (!fTitle.value.trim()) fTitle.value = file.name.replace(/\.[^.]+$/, "");
              updatePreview();
            } else if (/\.css$/.test(nm)) {
              fCss.value = text;
              updatePreview();
            } else if (/\.js$/.test(nm)) {
              fJs.value = text;
              updatePreview();
            } else {
              fMd.value = text;
            }
          }
          if (--pending === 0) { fi.value = ""; toast("Files imported into the form"); }
        });
      });
    });

    $("#fSave", bd).addEventListener("click", function () {
      var title = fTitle.value.trim();
      var html = fHtml.value;
      var css = fCss.value;
      var js = fJs.value;
      var md = fMd.value;
      var link = fLink.value.trim();
      if (!title) { fTitle.focus(); toast("Give the design a title"); return; }
      if (!html.trim() && !md.trim() && !link) { fHtml.focus(); toast("Paste HTML code, markdown, or add a link"); return; }
      var files = [];
      if (html.trim()) files.push({ path: "index.html", lang: "html", content: html });
      if (css.trim()) files.push({ path: "style.css", lang: "css", content: css });
      if (js.trim()) files.push({ path: "script.js", lang: "javascript", content: js });
      var record = {
        id: isEdit ? existing.id : uniqueId(slugify(title)),
        title: title,
        description: fDesc.value.trim(),
        tags: fTags.value.split(",").map(function (t) { return t.trim(); }).filter(Boolean),
        type: html.trim() ? "code" : (md.trim() ? "docs" : "link"),
        link: link || null,
        updated: new Date().toISOString(),
        local: true,
        files: files,
        preview: html.trim() ? {
          file: "index.html",
          html: buildPreviewHtml(html,
            css.trim() ? [{ name: "style.css", content: css }] : [],
            js.trim() ? [{ name: "script.js", content: js }] : [])
        } : null,
        docs: md.trim() ? { file: "design.md", raw: md, body: stripFrontmatter(md) } : null
      };
      if (isEdit) {
        for (var i = 0; i < LOCAL.length; i++) if (LOCAL[i].id === existing.id) LOCAL[i] = record;
      } else {
        LOCAL.push(record);
      }
      persistLocal();
      refreshDesigns();
      clearDraft();
      close();
      toast(isEdit ? "Design updated" : "Design added to your library");
      var target = "#/d/" + encodeURIComponent(record.id);
      if (location.hash === target) route(); else location.hash = target;
    });
  }

  function pickFile(d, lang) {
    var f = (d.files || []).filter(function (x) {
      return x.lang === lang || (lang === "html" && /\.html?$/i.test(x.path));
    })[0];
    return f ? f.content : null;
  }

  function exportLocalDesign(d) {
    var payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      id: d.id,
      title: d.title,
      description: d.description || "",
      tags: d.tags || [],
      link: d.link || null,
      html: pickFile(d, "html"),
      css: pickFile(d, "css"),
      js: pickFile(d, "javascript"),
      markdown: d.docs ? (d.docs.raw || d.docs.body) : null
    };
    download("imported-" + d.id + ".json", JSON.stringify(payload, null, 2), "application/json");
    toast("Downloaded imported-" + d.id + ".json — drop it into design-library/imported/ and run node build.js", 4200);
  }

  function deleteLocalDesign(d) {
    if (!window.confirm('Delete "' + d.title + '" from this browser?')) return;
    LOCAL = LOCAL.filter(function (x) { return x.id !== d.id; });
    persistLocal();
    refreshDesigns();
    toast("Design deleted");
    if (location.hash === "#/") route(); else location.hash = "#/";
  }

  /* ---------- drag & drop import ---------- */

  function setupDragDrop() {
    var depth = 0;
    function hasFiles(e) {
      if (!e.dataTransfer) return false;
      var types = e.dataTransfer.types || [];
      for (var i = 0; i < types.length; i++) if (types[i] === "Files") return true;
      return false;
    }
    function hint(on) {
      var el = $("#dropHint");
      if (el) el.classList.toggle("show", !!on);
    }
    window.addEventListener("dragenter", function (e) {
      if (!hasFiles(e)) return;
      depth++;
      hint(true);
    });
    window.addEventListener("dragleave", function () {
      depth = Math.max(0, depth - 1);
      if (!depth) hint(false);
    });
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) {
      e.preventDefault();
      depth = 0;
      hint(false);
      var files = (e.dataTransfer && e.dataTransfer.files) || [];
      if (files.length) handleDroppedFiles(files);
    });
  }

  function handleDroppedFiles(files) {
    var prefill = {};
    var list = Array.prototype.slice.call(files);
    var pending = list.length, fired = false;
    function open() {
      if (fired) return;
      fired = true;
      openForm(null, prefill);
    }
    list.forEach(function (file) {
      readFileAsText(file).then(function (text) {
        var nm = file.name.toLowerCase();
        if (/\.html?$/.test(nm)) {
          prefill.html = text;
          if (!prefill.title) prefill.title = file.name.replace(/\.[^.]+$/, "");
        } else if (/\.css$/.test(nm)) {
          prefill.css = text;
        } else if (/\.js$/.test(nm)) {
          prefill.js = text;
        } else {
          prefill.markdown = text;
        }
        if (--pending === 0) open();
      });
    });
  }

  /* ---------- guide modal ---------- */

  var GUIDE_HTML =
    "<h4>Fastest — right here, saved in this browser</h4>" +
    "<p>Click <code>Add design</code>, paste your HTML — plus separate CSS and JavaScript files if you have them, and an optional markdown doc — then save. It appears in the library instantly. Designs added this way live in your browser's storage; to make one permanent for everyone, open it and press <b>Export for build</b>, drop the downloaded <code>imported-&lt;id&gt;.json</code> into <code>design-library/imported/</code>, then run <code>node build.js</code>. You can also drag &amp; drop <code>.html</code>, <code>.css</code>, <code>.js</code> or <code>.md</code> files anywhere on this page.</p>" +
    "<h4>Way 1 — a design folder <code>designs/&lt;slug&gt;/</code></h4>" +
    "<p>Create a folder with your design document and a self-contained page. The build picks it up automatically:</p>" +
    "<pre>designs/my-design/\n" +
    "  design.md      ← doc, starts with frontmatter\n" +
    "  index.html     ← full code (inline CSS/JS = best preview)</pre>" +
    "<pre>---\n" +
    "title: My Design\ndescription: One-line summary.\n" +
    "tags: [landing, component]\n" +
    "link: https://example.com   ← optional source link\n" +
    "---\n# My Design …</pre>" +
    "<h4>Way 2 — register an existing project in <code>library.json</code></h4>" +
    "<p>Point an entry at any folder in your workspace; list the files to collect:</p>" +
    "<pre>{\n" +
    '  \"id\": \"my-app\",\n' +
    '  \"title\": \"My App\",\n' +
    '  \"description\": \"…\", \"tags\": [\"web-app\"],\n' +
    '  \"source\": { \"root\": \"../my-app\",\n' +
    '              \"files\": [\"index.html\", \"style.css\"] },\n' +
    '  \"preview\": \"index.html\"\n' +
    "}</pre>" +
    "<p>Link-only entries just need <code>\"type\": \"link\"</code> and a <code>url</code>.</p>" +
    "<h4>Then rebuild the library</h4>" +
    "<p>Run <code>node build.js</code> (or <code>start.bat</code>) inside <code>design-library/</code>. Designs are packed into per-design chunks (<code>data/</code>) plus a light manifest for fast lazy loading, with a full <code>designs.js</code> fallback so the site keeps working offline from a double-click or any static host.</p>";

  function openGuide() {
    var bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="How to add a design">' +
      '<div class="modal-head">' + I.folder + "<h3>Adding a design</h3>" +
      '<button class="modal-close" aria-label="Close">' +
      '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="modal-body">' + GUIDE_HTML + "</div></div>";
    document.body.appendChild(bd);
    function close() { bd.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    bd.addEventListener("click", function (e) { if (e.target === bd) close(); });
    $(".modal-close", bd).addEventListener("click", close);
    document.addEventListener("keydown", onKey);
  }

  /* ---------- global chrome ---------- */

  function updateCounts() {
    $("#brandCount").textContent = DESIGNS.length + " items";
    $("#footerStats").textContent = DESIGNS.length + " designs · " + allTags().length + " tags";
  }

  function initChrome() {
    updateCounts();
    $("#footerGenerated").textContent = MAN.generatedAt
      ? "Library built " + fmtDate(MAN.generatedAt)
      : "";

    $("#searchInput").addEventListener("input", function (e) {
      state.q = e.target.value;
      if (!location.hash || location.hash === "#/" || /^#\/\??$/.test(location.hash)) {
        renderGallery();
      } else if (location.hash.indexOf("#/d/") === 0) {
        location.hash = "#/"; // typing from a detail page jumps back to the filtered gallery
      }
    });

    $("#addBtn").addEventListener("click", function () { openForm(null, null); });
    $("#footerGuide").addEventListener("click", function (e) { e.preventDefault(); openGuide(); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== $("#searchInput") &&
          !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault();
        $("#searchInput").focus();
      }
    });

    setupDragDrop();
    if (!storageOK) toast("Browser storage unavailable — added designs last only for this session", 4000);
  }

  /* ---------- boot ---------- */

  initChrome();
  window.addEventListener("hashchange", route);
  route();
})();
