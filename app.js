const { useState, useEffect, useMemo, useRef } = React;
function Icon({ children, size = 16, strokeWidth = 2, className = "" }) {
  return /* @__PURE__ */ React.createElement(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className
    },
    children
  );
}
const Plus = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }));
const Check = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" }));
const X = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }));
const ChevronDown = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("polyline", { points: "6 9 12 15 18 9" }));
const ChevronUp = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("polyline", { points: "18 15 12 9 6 15" }));
const Search = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }));
const Trash2 = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ React.createElement("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" }), /* @__PURE__ */ React.createElement("path", { d: "M10 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M14 11v6" }), /* @__PURE__ */ React.createElement("path", { d: "M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" }));
const RotateCcw = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7L3 8" }), /* @__PURE__ */ React.createElement("polyline", { points: "3 3 3 8 8 8" }));
const Upload = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" }));
const AlertCircle = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" }));
const Stamp = (p) => /* @__PURE__ */ React.createElement(Icon, { ...p }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "8" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
const NEEDS_WORK_FIELDS = [
  { key: "title", label: "Title" },
  { key: "photos", label: "Photos" },
  { key: "price", label: "Price" },
  { key: "description", label: "Description" },
  { key: "specifics", label: "Item specifics" }
];
const SEO_CHECKLIST_FIELDS = [
  { key: "keywordsFront", label: "Top keywords in first 60 characters of title" },
  { key: "fullTitle", label: "Using close to all 80 title characters" },
  { key: "specificsFilled", label: "Every item specific field filled in" },
  { key: "sixPhotos", label: "6+ photos, first one on plain background" },
  { key: "descKeywords", label: "Keywords in first two lines of description" }
];
const PRIORITIES = ["low", "medium", "high"];
const STORAGE_KEY = "ebay-manifest-listings";
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function daysSince(dateStr) {
  const then = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
  const now = /* @__PURE__ */ new Date();
  return Math.floor((now - then) / 864e5);
}
function staleness(days) {
  if (days <= 13) return { color: "#4B7A5A", ring: "#4B7A5A" };
  if (days <= 30) return { color: "#B8862E", ring: "#B8862E" };
  return { color: "#B3401F", ring: "#B3401F" };
}
const emptyDraft = () => ({
  id: null,
  itemNumber: "",
  title: "",
  sku: "",
  category: "",
  priority: "medium",
  lastUpdated: todayISO(),
  notes: "",
  needsWork: Object.fromEntries(NEEDS_WORK_FIELDS.map((f) => [f.key, false])),
  seo: Object.fromEntries(SEO_CHECKLIST_FIELDS.map((f) => [f.key, false]))
});
function normalize(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function dedupeKey(l) {
  if (l.itemNumber && normalize(l.itemNumber)) return "num:" + normalize(l.itemNumber);
  if (l.sku && normalize(l.sku)) return "sku:" + normalize(l.sku);
  return "title:" + normalize(l.title);
}
function findHeader(headers, candidates) {
  const norm = headers.map((h) => normalize(h));
  for (const c of candidates) {
    const idx = norm.findIndex((h) => h === c);
    if (idx !== -1) return headers[idx];
  }
  for (const c of candidates) {
    const idx = norm.findIndex((h) => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
}
function loadListings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveListings(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}
function ListingTracker() {
  const [listings, setListings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState("stale");
  const [query, setQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    setListings(loadListings());
    setLoaded(true);
  }, []);
  function persist(next) {
    setListings(next);
    const ok = saveListings(next);
    setSaveError(!ok);
  }
  function openNew() {
    setDraft(emptyDraft());
    setShowForm(true);
  }
  function saveDraft() {
    if (!draft.title.trim()) return;
    let next;
    if (draft.id) {
      next = listings.map((l) => l.id === draft.id ? draft : l);
    } else {
      next = [...listings, { ...draft, id: uid() }];
    }
    persist(next);
    setShowForm(false);
    setDraft(emptyDraft());
  }
  function editListing(l) {
    setDraft(l);
    setShowForm(true);
  }
  function deleteListing(id) {
    persist(listings.filter((l) => l.id !== id));
  }
  function markUpdatedToday(id) {
    const next = listings.map(
      (l) => l.id === id ? { ...l, lastUpdated: todayISO(), needsWork: Object.fromEntries(NEEDS_WORK_FIELDS.map((f) => [f.key, false])) } : l
    );
    persist(next);
  }
  function toggleNeedsWork(id, key) {
    const next = listings.map(
      (l) => l.id === id ? { ...l, needsWork: { ...l.needsWork, [key]: !l.needsWork[key] } } : l
    );
    persist(next);
  }
  function toggleSeo(id, key) {
    const next = listings.map(
      (l) => l.id === id ? { ...l, seo: { ...l.seo || {}, [key]: !(l.seo || {})[key] } } : l
    );
    persist(next);
  }
  function handleImportFile(file) {
    setImportError(null);
    setImportResult(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const titleCol = findHeader(headers, ["title"]);
          const skuCol = findHeader(headers, ["custom label (sku)", "custom label", "sku"]);
          const numCol = findHeader(headers, ["item number", "itemid", "item id"]);
          const catCol = findHeader(headers, ["category", "category name"]);
          if (!titleCol) {
            setImportError("Couldn't find a Title column in that file. Make sure it's exported from eBay's Active Listings report.");
            return;
          }
          const existingKeys = new Map(listings.map((l) => [dedupeKey(l), l]));
          const seenInFile = /* @__PURE__ */ new Set();
          let added = [];
          let updated = 0;
          let skippedDupe = 0;
          let skippedBlank = 0;
          for (const row of results.data) {
            const title = (row[titleCol] || "").trim();
            if (!title) {
              skippedBlank++;
              continue;
            }
            const candidate = {
              itemNumber: numCol ? (row[numCol] || "").trim() : "",
              sku: skuCol ? (row[skuCol] || "").trim() : "",
              title,
              category: catCol ? (row[catCol] || "").trim() : ""
            };
            const key = dedupeKey(candidate);
            if (seenInFile.has(key)) {
              skippedDupe++;
              continue;
            }
            seenInFile.add(key);
            const existing = existingKeys.get(key);
            if (existing) {
              if (existing.title !== candidate.title || existing.category !== candidate.category || !existing.itemNumber && candidate.itemNumber) {
                existing.title = candidate.title;
                existing.category = candidate.category || existing.category;
                existing.itemNumber = existing.itemNumber || candidate.itemNumber;
                updated++;
              } else {
                skippedDupe++;
              }
              continue;
            }
            added.push({
              ...emptyDraft(),
              id: uid(),
              itemNumber: candidate.itemNumber,
              sku: candidate.sku,
              title: candidate.title,
              category: candidate.category
            });
          }
          const next = [...listings.map((l) => existingKeys.get(dedupeKey(l)) || l), ...added];
          persist(next);
          setImportResult({ added: added.length, updated, skippedDupe, skippedBlank });
        } catch (e) {
          setImportError("Something went wrong reading that file.");
        }
      },
      error: () => setImportError("Something went wrong reading that file.")
    });
  }
  function resetAll() {
    persist([]);
    setConfirmReset(false);
  }
  const filtered = useMemo(() => {
    let arr = listings.filter(
      (l) => l.title.toLowerCase().includes(query.toLowerCase()) || l.sku.toLowerCase().includes(query.toLowerCase())
    );
    if (sortBy === "stale") arr = [...arr].sort((a, b) => daysSince(b.lastUpdated) - daysSince(a.lastUpdated));
    else if (sortBy === "fresh") arr = [...arr].sort((a, b) => daysSince(a.lastUpdated) - daysSince(b.lastUpdated));
    else if (sortBy === "priority") {
      const rank = { high: 0, medium: 1, low: 2 };
      arr = [...arr].sort((a, b) => rank[a.priority] - rank[b.priority]);
    } else if (sortBy === "az") arr = [...arr].sort((a, b) => a.title.localeCompare(b.title));
    return arr;
  }, [listings, sortBy, query]);
  const stats = useMemo(() => {
    const total = listings.length;
    const stale = listings.filter((l) => daysSince(l.lastUpdated) > 30).length;
    const updatedThisWeek = listings.filter((l) => daysSince(l.lastUpdated) <= 6).length;
    const flagged = listings.filter((l) => Object.values(l.needsWork || {}).some(Boolean)).length;
    return { total, stale, updatedThisWeek, flagged };
  }, [listings]);
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Inter', sans-serif" }, className: "min-h-screen bg-[#EDE7D9] text-[#242019]" }, /* @__PURE__ */ React.createElement("header", { className: "border-b-2 border-[#242019] bg-[#EDE7D9] sticky top-0 z-20" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto px-5 py-5 flex items-center justify-between gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-11 h-11 rounded-full border-2 border-[#B3401F] flex items-center justify-center flex-shrink-0", style: { transform: "rotate(-8deg)" } }, /* @__PURE__ */ React.createElement(Stamp, { size: 20, strokeWidth: 2, className: "text-[#B3401F]" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { style: { fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }, className: "text-2xl font-semibold uppercase leading-none" }, "The Manifest"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#6B6152] mt-1 font-medium" }, "Listing freshness & SEO tracker"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setImportResult(null);
        setImportError(null);
        setShowImport(true);
      },
      className: "flex items-center gap-1.5 bg-white border border-[#242019] text-[#242019] px-3.5 py-2.5 rounded-sm text-sm font-semibold hover:bg-[#F4F0E4] transition-colors",
      style: { fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em" }
    },
    /* @__PURE__ */ React.createElement(Upload, { size: 15, strokeWidth: 2.5 }),
    " IMPORT"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: openNew,
      className: "flex items-center gap-1.5 bg-[#242019] text-[#EDE7D9] px-4 py-2.5 rounded-sm text-sm font-semibold hover:bg-[#3a3327] transition-colors",
      style: { fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em" }
    },
    /* @__PURE__ */ React.createElement(Plus, { size: 16, strokeWidth: 2.5 }),
    " ADD ITEM"
  )))), /* @__PURE__ */ React.createElement("main", { className: "max-w-4xl mx-auto px-5 py-6 pb-24" }, loaded && listings.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6" }, /* @__PURE__ */ React.createElement(StatBlock, { label: "Tracked", value: stats.total }), /* @__PURE__ */ React.createElement(StatBlock, { label: "Stale (30d+)", value: stats.stale, accent: "#B3401F" }), /* @__PURE__ */ React.createElement(StatBlock, { label: "Updated this week", value: stats.updatedThisWeek, accent: "#4B7A5A" }), /* @__PURE__ */ React.createElement(StatBlock, { label: "Flagged", value: stats.flagged, accent: "#B8862E" })), saveError && /* @__PURE__ */ React.createElement("div", { className: "mb-4 text-sm bg-[#F4D9CE] border border-[#B3401F] text-[#7A2A13] px-3 py-2 rounded-sm" }, "Couldn't save \u2014 your browser's local storage may be full or disabled for this file."), loaded && listings.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 bg-white border border-[#D8D0BC] rounded-sm px-3 py-2 flex-1 min-w-[160px]" }, /* @__PURE__ */ React.createElement(Search, { size: 15, className: "text-[#8B8578] flex-shrink-0" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: query,
      onChange: (e) => setQuery(e.target.value),
      placeholder: "Search title or SKU",
      className: "bg-transparent outline-none text-sm w-full placeholder:text-[#B0A992]"
    }
  )), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: sortBy,
      onChange: (e) => setSortBy(e.target.value),
      className: "border border-[#D8D0BC] bg-white rounded-sm px-3 py-2 text-sm font-medium outline-none",
      style: { fontFamily: "'Inter', sans-serif" }
    },
    /* @__PURE__ */ React.createElement("option", { value: "stale" }, "Staleest first"),
    /* @__PURE__ */ React.createElement("option", { value: "fresh" }, "Freshest first"),
    /* @__PURE__ */ React.createElement("option", { value: "priority" }, "Priority"),
    /* @__PURE__ */ React.createElement("option", { value: "az" }, "A\u2013Z")
  )), loaded && listings.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center py-16 px-6 border-2 border-dashed border-[#D8D0BC] rounded-sm" }, /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 rounded-full border-2 border-[#B0A992] mx-auto mb-4 flex items-center justify-center", style: { transform: "rotate(-6deg)" } }, /* @__PURE__ */ React.createElement(Stamp, { size: 24, className: "text-[#B0A992]" })), /* @__PURE__ */ React.createElement("h2", { style: { fontFamily: "'Oswald', sans-serif" }, className: "text-lg font-semibold uppercase mb-1" }, "Nothing on the manifest yet"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#6B6152] mb-5 max-w-sm mx-auto" }, "Add your first listing to start tracking when it was last touched and what it still needs."), /* @__PURE__ */ React.createElement("button", { onClick: openNew, className: "inline-flex items-center gap-1.5 bg-[#242019] text-[#EDE7D9] px-4 py-2.5 rounded-sm text-sm font-semibold", style: { fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em" } }, /* @__PURE__ */ React.createElement(Plus, { size: 16, strokeWidth: 2.5 }), " ADD YOUR FIRST ITEM")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, filtered.map((l) => {
    const days = daysSince(l.lastUpdated);
    const st = staleness(days);
    const expanded = expandedId === l.id;
    const needsWorkCount = Object.values(l.needsWork || {}).filter(Boolean).length;
    const seoDone = Object.values(l.seo || {}).filter(Boolean).length;
    return /* @__PURE__ */ React.createElement("div", { key: l.id, className: "bg-white border border-[#D8D0BC] rounded-sm overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-stretch" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 w-20 flex items-center justify-center border-r border-dashed border-[#D8D0BC] py-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center", style: { borderColor: st.ring, transform: "rotate(-5deg)" } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", color: st.color }, className: "text-base font-semibold leading-none" }, days), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'IBM Plex Mono', monospace", color: st.color }, className: "text-[8px] uppercase tracking-wide leading-none mt-1" }, "days"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-sm truncate" }, l.title), /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "'IBM Plex Mono', monospace" }, className: "text-xs text-[#8B8578] mt-0.5" }, l.sku || "no sku", " ", l.category ? `\xB7 ${l.category}` : "")), /* @__PURE__ */ React.createElement(PriorityTag, { priority: l.priority })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mt-2 flex-wrap" }, needsWorkCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-[#B3401F] bg-[#F4D9CE] px-2 py-0.5 rounded-sm" }, needsWorkCount, " field", needsWorkCount > 1 ? "s" : "", " flagged"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-[#8B8578]" }, "SEO checklist ", seoDone, "/", SEO_CHECKLIST_FIELDS.length)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-3 flex-wrap" }, /* @__PURE__ */ React.createElement("button", { onClick: () => markUpdatedToday(l.id), className: "text-xs font-semibold uppercase tracking-wide bg-[#242019] text-[#EDE7D9] px-3 py-1.5 rounded-sm hover:bg-[#3a3327]", style: { fontFamily: "'Oswald', sans-serif" } }, "Mark updated today"), /* @__PURE__ */ React.createElement("button", { onClick: () => setExpandedId(expanded ? null : l.id), className: "text-xs font-medium text-[#6B6152] flex items-center gap-0.5 px-2 py-1.5" }, "Details ", expanded ? /* @__PURE__ */ React.createElement(ChevronUp, { size: 14 }) : /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 })), /* @__PURE__ */ React.createElement("button", { onClick: () => editListing(l), className: "text-xs font-medium text-[#6B6152] px-2 py-1.5" }, "Edit"), /* @__PURE__ */ React.createElement("button", { onClick: () => deleteListing(l.id), className: "text-xs font-medium text-[#B3401F] px-2 py-1.5 ml-auto flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Trash2, { size: 13 }))))), expanded && /* @__PURE__ */ React.createElement("div", { className: "border-t border-[#D8D0BC] bg-[#FAF8F2] px-4 py-4 grid sm:grid-cols-2 gap-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "'Oswald', sans-serif" }, className: "text-xs font-semibold uppercase tracking-wide text-[#6B6152] mb-2" }, "Needs work"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, NEEDS_WORK_FIELDS.map((f) => {
      var _a;
      return /* @__PURE__ */ React.createElement("label", { key: f.key, className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!((_a = l.needsWork) == null ? void 0 : _a[f.key]), onChange: () => toggleNeedsWork(l.id, f.key), className: "accent-[#B3401F] w-4 h-4" }), f.label);
    })), l.notes && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#6B6152] mt-3 italic border-l-2 border-[#D8D0BC] pl-2" }, l.notes)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "'Oswald', sans-serif" }, className: "text-xs font-semibold uppercase tracking-wide text-[#6B6152] mb-2" }, "SEO checklist"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, SEO_CHECKLIST_FIELDS.map((f) => {
      var _a;
      return /* @__PURE__ */ React.createElement("label", { key: f.key, className: "flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!((_a = l.seo) == null ? void 0 : _a[f.key]), onChange: () => toggleSeo(l.id, f.key), className: "accent-[#4B7A5A] w-4 h-4" }), f.label);
    })))));
  })), loaded && listings.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-8 text-center" }, !confirmReset ? /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmReset(true), className: "text-xs text-[#B0A992] hover:text-[#B3401F] flex items-center gap-1 mx-auto" }, /* @__PURE__ */ React.createElement(RotateCcw, { size: 12 }), " Reset all data") : /* @__PURE__ */ React.createElement("div", { className: "text-xs text-[#6B6152] flex items-center justify-center gap-2 flex-wrap" }, "Delete all ", listings.length, " listings? This can't be undone.", /* @__PURE__ */ React.createElement("button", { onClick: resetAll, className: "font-semibold text-[#B3401F]" }, "Yes, delete"), /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmReset(false), className: "font-semibold" }, "Cancel")))), showImport && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 p-0 sm:p-5" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#EDE7D9] w-full sm:max-w-md sm:rounded-sm max-h-[90vh] overflow-y-auto border-t-2 sm:border-2 border-[#242019]" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-5 py-4 border-b border-[#D8D0BC]" }, /* @__PURE__ */ React.createElement("h2", { style: { fontFamily: "'Oswald', sans-serif" }, className: "text-lg font-semibold uppercase" }, "Import from eBay"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowImport(false) }, /* @__PURE__ */ React.createElement(X, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-[#4A4335] space-y-2" }, /* @__PURE__ */ React.createElement("p", null, "In Seller Hub, go to ", /* @__PURE__ */ React.createElement("strong", null, "Active listings"), ", select your items, then ", /* @__PURE__ */ React.createElement("strong", null, "Download reports \u2192 Active listings report"), " and export as CSV."), /* @__PURE__ */ React.createElement("p", { className: "text-[#6B6152]" }, "Items already on your manifest are matched by eBay item number (or SKU, or title) and won't be duplicated \u2014 only new items get added.")), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: fileInputRef,
      type: "file",
      accept: ".csv",
      className: "hidden",
      onChange: (e) => {
        var _a;
        const file = (_a = e.target.files) == null ? void 0 : _a[0];
        if (file) handleImportFile(file);
        e.target.value = "";
      }
    }
  ), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    var _a;
    return (_a = fileInputRef.current) == null ? void 0 : _a.click();
  }, className: "w-full border-2 border-dashed border-[#B0A992] rounded-sm py-8 flex flex-col items-center gap-2 text-[#6B6152] hover:border-[#242019] hover:text-[#242019] transition-colors" }, /* @__PURE__ */ React.createElement(Upload, { size: 22 }), " ", /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium" }, "Choose CSV file")), importError && /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 text-sm bg-[#F4D9CE] border border-[#B3401F] text-[#7A2A13] px-3 py-2 rounded-sm" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 16, className: "flex-shrink-0 mt-0.5" }), " ", importError), importResult && /* @__PURE__ */ React.createElement("div", { className: "text-sm bg-[#E4EDE0] border border-[#4B7A5A] text-[#2F4A34] px-3 py-3 rounded-sm space-y-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "Import complete"), /* @__PURE__ */ React.createElement("p", null, importResult.added, " new item", importResult.added === 1 ? "" : "s", " added"), importResult.updated > 0 && /* @__PURE__ */ React.createElement("p", null, importResult.updated, " existing item(s) refreshed"), importResult.skippedDupe > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[#4B6B4F]" }, importResult.skippedDupe, " already tracked, skipped"), importResult.skippedBlank > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[#4B6B4F]" }, importResult.skippedBlank, " row(s) had no title, skipped"))), /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 border-t border-[#D8D0BC]" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowImport(false), className: "w-full py-2.5 rounded-sm text-sm font-semibold border border-[#D8D0BC]" }, "Done")))), showForm && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 p-0 sm:p-5" }, /* @__PURE__ */ React.createElement("div", { className: "bg-[#EDE7D9] w-full sm:max-w-md sm:rounded-sm max-h-[90vh] overflow-y-auto border-t-2 sm:border-2 border-[#242019]" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-5 py-4 border-b border-[#D8D0BC]" }, /* @__PURE__ */ React.createElement("h2", { style: { fontFamily: "'Oswald', sans-serif" }, className: "text-lg font-semibold uppercase" }, draft.id ? "Edit item" : "New item"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowForm(false) }, /* @__PURE__ */ React.createElement(X, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Title" }, /* @__PURE__ */ React.createElement("input", { value: draft.title, onChange: (e) => setDraft({ ...draft, title: e.target.value }), className: "input", placeholder: "Vintage 1990s denim jacket, size M", autoFocus: true })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "SKU / item #" }, /* @__PURE__ */ React.createElement("input", { value: draft.sku, onChange: (e) => setDraft({ ...draft, sku: e.target.value }), className: "input", placeholder: "JK-1042" })), /* @__PURE__ */ React.createElement(Field, { label: "Category" }, /* @__PURE__ */ React.createElement("input", { value: draft.category, onChange: (e) => setDraft({ ...draft, category: e.target.value }), className: "input", placeholder: "Men's clothing" }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Priority" }, /* @__PURE__ */ React.createElement("select", { value: draft.priority, onChange: (e) => setDraft({ ...draft, priority: e.target.value }), className: "input" }, PRIORITIES.map((p) => /* @__PURE__ */ React.createElement("option", { key: p, value: p }, p[0].toUpperCase() + p.slice(1))))), /* @__PURE__ */ React.createElement(Field, { label: "Last updated" }, /* @__PURE__ */ React.createElement("input", { type: "date", value: draft.lastUpdated, onChange: (e) => setDraft({ ...draft, lastUpdated: e.target.value }), className: "input" }))), /* @__PURE__ */ React.createElement(Field, { label: "Notes (optional)" }, /* @__PURE__ */ React.createElement("textarea", { value: draft.notes, onChange: (e) => setDraft({ ...draft, notes: e.target.value }), className: "input", rows: 2, placeholder: "Photos look washed out, needs retake" }))), /* @__PURE__ */ React.createElement("div", { className: "px-5 py-4 border-t border-[#D8D0BC] flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowForm(false), className: "flex-1 py-2.5 rounded-sm text-sm font-semibold border border-[#D8D0BC]" }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: saveDraft, disabled: !draft.title.trim(), className: "flex-1 py-2.5 rounded-sm text-sm font-semibold bg-[#242019] text-[#EDE7D9] disabled:opacity-40 flex items-center justify-center gap-1.5", style: { fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em" } }, /* @__PURE__ */ React.createElement(Check, { size: 15, strokeWidth: 2.5 }), " ", draft.id ? "SAVE CHANGES" : "ADD TO MANIFEST")))));
}
function Field({ label, children }) {
  return /* @__PURE__ */ React.createElement("label", { className: "block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-medium text-[#6B6152] mb-1" }, label), children);
}
function StatBlock({ label, value, accent }) {
  return /* @__PURE__ */ React.createElement("div", { className: "bg-white border border-[#D8D0BC] rounded-sm px-3 py-2.5" }, /* @__PURE__ */ React.createElement("p", { style: { fontFamily: "'IBM Plex Mono', monospace", color: accent || "#242019" }, className: "text-xl font-semibold leading-none" }, value), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] uppercase tracking-wide text-[#8B8578] mt-1 font-medium" }, label));
}
function PriorityTag({ priority }) {
  const map = {
    high: { bg: "#F4D9CE", text: "#B3401F" },
    medium: { bg: "#F0E4C8", text: "#8A6A1E" },
    low: { bg: "#E4E8DE", text: "#5A6E52" }
  };
  const c = map[priority] || map.medium;
  return /* @__PURE__ */ React.createElement("span", { style: { backgroundColor: c.bg, color: c.text, fontFamily: "'IBM Plex Mono', monospace" }, className: "text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-sm flex-shrink-0" }, priority);
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ React.createElement(ListingTracker, null));
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
    });
  });
}
