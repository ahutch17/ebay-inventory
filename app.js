/* ============================================================
   SHELF SYNC - app.js  (v2.0)

   Plain JavaScript. No React, no build step, no JSX.
   Edit this file directly in GitHub and reload the page.

   WHAT CHANGED FROM THE OLD VERSION
   1. Import now READS THE START DATE from your eBay export and parses
      the "Jun-02-26 05:20:12 PDT" format by hand. That is why every row
      used to say 0 DAYS - the old code never looked at that column.
   2. Sold-out scrubbing: anything missing from a fresh export is offered
      for removal in one tap after the import.
   3. Filter by location and filter by category, built from your own file.
   4. Tapping a row opens a card in the middle of the screen with the SEO
      checklist, a live eBay link, reset freshness, and Copy SEO Prompt.
   5. Long lists load 40 at a time so 3,000+ listings stay fast.
   ============================================================ */
'use strict';

var APP_VERSION = '2.0';
var STORAGE_KEY = 'shelf-sync-listings';
var LEGACY_KEY = 'ebay-manifest-listings';   /* old "The Manifest" data */
var PAGE_SIZE = 40;
var EBAY_ITEM_URL = 'https://www.ebay.com/itm/';
var STALE_DAYS = 30;

var SEO_FIELDS = [
  ['keywordsFront', 'Top keywords in the first 60 characters of the title'],
  ['fullTitle', 'Using close to all 80 title characters'],
  ['specificsFilled', 'Every item specific filled in'],
  ['sixPhotos', 'Six or more photos, first on a plain background'],
  ['descKeywords', 'Keywords in the first two lines of the description']
];
var WORK_FIELDS = [
  ['title', 'Title'], ['photos', 'Photos'], ['price', 'Price'],
  ['description', 'Description'], ['specifics', 'Item specifics']
];
var PRIORITIES = ['high', 'medium', 'low'];

/* ---------------- tiny DOM helper ---------------- */
function el(tag, attrs, kids) {
  var n = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
  }
  if (kids) {
    var list = Array.isArray(kids) ? kids : [kids];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c === null || c === undefined || c === false) continue;
      n.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
    }
  }
  return n;
}
function $(id) { return document.getElementById(id); }

/* ---------------- dates ---------------- */
var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* eBay exports look like: Jun-02-26 05:20:12 PDT
   Plain JavaScript cannot read that, so we take it apart ourselves.
   The clock time and timezone are ignored on purpose - we count whole days. */
function parseEbayDate(raw) {
  if (!raw) return null;
  var s = String(raw).trim();
  if (!s) return null;
  var m = s.match(/^([A-Za-z]{3})[a-z]*[-\s]+(\d{1,2})[-,\s]+(\d{2,4})/);
  if (m) {
    var mon = MONTHS[m[1].toLowerCase()];
    if (mon === undefined) return null;
    var year = parseInt(m[3], 10);
    if (m[3].length <= 2) year += year < 70 ? 2000 : 1900;
    var d = new Date(year, mon, parseInt(m[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    var iso = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(iso.getTime()) ? null : iso;
  }
  var fb = new Date(s);
  return isNaN(fb.getTime()) ? null : fb;
}
function toISODate(d) {
  if (!d) return '';
  var mm = String(d.getMonth() + 1), dd = String(d.getDate());
  if (mm.length < 2) mm = '0' + mm;
  if (dd.length < 2) dd = '0' + dd;
  return d.getFullYear() + '-' + mm + '-' + dd;
}
function todayISO() { return toISODate(new Date()); }
function daysSinceISO(iso) {
  if (!iso) return null;
  var p = String(iso).split('-');
  if (p.length !== 3) return null;
  var then = new Date(+p[0], +p[1] - 1, +p[2]);
  if (isNaN(then.getTime())) return null;
  var now = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((start - then) / 86400000));
}

/* The bubble counts from the last freshness reset, otherwise the real start date. */
function baseDate(l) { return l.freshnessResetAt || l.startDate || ''; }
function listingDays(l) { return daysSinceISO(baseDate(l)); }

/* Colour AND a soft fill for the day bubble.
   Past the 30 day target window the bubble fills with the earthy rose tone
   from your design. The numeral stays a darker rust so it is still readable. */
function band(days) {
  if (days === null) return { color: '#54655A', tint: '#F7F2EB', label: 'no date' };
  if (days <= 13) return { color: '#4F7B5C', tint: '#E9F0EA', label: 'fresh' };
  if (days <= STALE_DAYS) return { color: '#6E7A4F', tint: '#F0F1E6', label: 'aging' };
  return { color: '#A2604B', tint: '#F3E4DC', label: 'stale' };
}

/* ---------------- storage ---------------- */
function blankChecks(fields) {
  var o = {};
  for (var i = 0; i < fields.length; i++) o[fields[i][0]] = false;
  return o;
}
function newListing() {
  return {
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    itemNumber: '', title: '', sku: '', category: '',
    startDate: '', freshnessResetAt: '',
    quantity: '', price: '', sold: '', watchers: '',
    priority: 'medium', notes: '',
    work: blankChecks(WORK_FIELDS), seo: blankChecks(SEO_FIELDS),
    lastImportedAt: ''
  };
}
function normalize(raw) {
  var l = newListing();
  if (!raw || typeof raw !== 'object') return l;
  var keys = ['itemNumber', 'title', 'sku', 'category', 'startDate', 'freshnessResetAt',
    'quantity', 'price', 'sold', 'watchers', 'priority', 'notes', 'lastImportedAt'];
  for (var i = 0; i < keys.length; i++) {
    if (raw[keys[i]] !== undefined && raw[keys[i]] !== null) l[keys[i]] = String(raw[keys[i]]);
  }
  if (raw.id) l.id = String(raw.id);
  if (!l.freshnessResetAt && raw.lastUpdated) l.freshnessResetAt = String(raw.lastUpdated);
  if (PRIORITIES.indexOf(l.priority) === -1) l.priority = 'medium';
  var w = raw.work || raw.needsWork || {};
  for (var a = 0; a < WORK_FIELDS.length; a++) l.work[WORK_FIELDS[a][0]] = !!w[WORK_FIELDS[a][0]];
  var s = raw.seo || {};
  for (var b = 0; b < SEO_FIELDS.length; b++) l.seo[SEO_FIELDS[b][0]] = !!s[SEO_FIELDS[b][0]];
  return l;
}
function load() {
  var raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY); } catch (e) { raw = null; }
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch (e) { return []; }
}
function save() {
  var ok = true;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.listings)); }
  catch (e) { toast('Could not save - this device storage may be full.'); ok = false; }
  /* Mirror your own work - resets, checkmarks, notes - to the cloud. */
  try { if (window.Cloud) window.Cloud.noteLocalChange(state.listings); } catch (e2) { }
  return ok;
}

/* ---------------- state ---------------- */
var state = { listings: [], visible: PAGE_SIZE, q: '', loc: '', cat: '', sort: 'stale' };
function findListing(id) {
  for (var i = 0; i < state.listings.length; i++) if (state.listings[i].id === id) return state.listings[i];
  return null;
}

/* ---------------- toast + clipboard ---------------- */
var toastTimer = null;
function toast(msg) {
  var old = $('toast');
  if (old) old.parentNode.removeChild(old);
  var t = el('div', { id: 'toast', role: 'status', text: msg });
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2800);
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () { toast('Copied. Paste it into your AI chat.'); },
      function () { legacyCopy(text); });
  } else legacyCopy(text);
}
function legacyCopy(text) {
  var ta = el('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Copied. Paste it into your AI chat.'); }
  catch (e) { toast('Copy failed - long-press to select instead.'); }
  ta.parentNode.removeChild(ta);
}

/* ---------------- filtering + sorting ---------------- */
function matches(l) {
  if (state.loc && (l.sku || '') !== state.loc) return false;
  if (state.cat && (l.category || '') !== state.cat) return false;
  if (state.q) {
    var hay = ((l.title || '') + ' ' + (l.sku || '') + ' ' + (l.itemNumber || '') + ' ' + (l.category || '')).toLowerCase();
    if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
  }
  return true;
}
function byDays(dir) {
  return function (a, b) {
    var da = listingDays(a), db = listingDays(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return dir === 'desc' ? db - da : da - db;
  };
}
function sortListings(arr) {
  var rank = { high: 0, medium: 1, low: 2 };
  var copy = arr.slice();
  if (state.sort === 'stale') copy.sort(byDays('desc'));
  else if (state.sort === 'fresh') copy.sort(byDays('asc'));
  else if (state.sort === 'priority') copy.sort(function (a, b) { return rank[a.priority] - rank[b.priority]; });
  else if (state.sort === 'watchers') copy.sort(function (a, b) { return (parseInt(b.watchers, 10) || 0) - (parseInt(a.watchers, 10) || 0); });
  else if (state.sort === 'az') copy.sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
  return copy;
}
function uniqueValues(field) {
  var seen = {};
  for (var i = 0; i < state.listings.length; i++) {
    var v = (state.listings[i][field] || '').trim();
    if (v) seen[v] = true;
  }
  return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
}

/* ---------------- rendering ---------------- */
function renderStats() {
  var box = $('stats');
  if (!box) return;
  box.innerHTML = '';
  if (!state.listings.length) { box.hidden = true; return; }
  box.hidden = false;
  var stale = 0, week = 0, flagged = 0;
  for (var i = 0; i < state.listings.length; i++) {
    var l = state.listings[i];
    var d = listingDays(l);
    if (d !== null && d > STALE_DAYS) stale++;
    var r = daysSinceISO(l.freshnessResetAt);
    if (r !== null && r <= 6) week++;
    for (var k in l.work) { if (l.work[k]) { flagged++; break; } }
  }
  var rows = [
    ['Tracked', state.listings.length, '#2F3A33'],
    ['Stale, 30 days plus', stale, '#A2604B'],
    ['Updated this week', week, '#4F7B5C'],
    ['Flagged to fix', flagged, '#6E7A4F']
  ];
  for (var s = 0; s < rows.length; s++) {
    var b = el('b', { text: String(rows[s][1]) });
    b.style.color = rows[s][2];
    box.appendChild(el('div', { class: 'stat' }, [b, el('span', { text: rows[s][0] })]));
  }
}

function fillSelect(sel, values, allLabel, current) {
  sel.innerHTML = '';
  sel.appendChild(el('option', { value: '', text: allLabel }));
  for (var i = 0; i < values.length; i++) sel.appendChild(el('option', { value: values[i], text: values[i] }));
  sel.value = values.indexOf(current) === -1 ? '' : current;
}

function renderControls() {
  var box = $('controls');
  if (!box) return;
  if (!state.listings.length) { box.hidden = true; return; }
  box.hidden = false;
  fillSelect($('fLoc'), uniqueValues('sku'), '📍 All bins', state.loc);
  fillSelect($('fCat'), uniqueValues('category'), '📂 All categories', state.cat);
  state.loc = $('fLoc').value;
  state.cat = $('fCat').value;
  $('fSort').value = state.sort;
}

function listingRow(l) {
  var days = listingDays(l);
  var tone = band(days);
  var color = tone.color;

  var mark = (l.category || l.title || '?').trim().charAt(0).toUpperCase() || '?';
  var flags = 0, seoDone = 0, k;
  for (k in l.work) if (l.work[k]) flags++;
  for (k in l.seo) if (l.seo[k]) seoDone++;

  var meta = el('div', { class: 'row-meta' }, [
    el('span', { class: 'pill', text: l.sku ? l.sku : 'no bin' }),
    l.category ? el('span', { class: 'cat', text: l.category }) : null,
    flags
      ? el('span', { class: 'flag', text: flags + ' to fix' })
      : el('span', { class: 'cat', text: 'SEO ' + seoDone + '/' + SEO_FIELDS.length })
  ]);

  var num = el('b', { class: 'mono', text: days === null ? '--' : String(days) });
  var unit = el('span', { text: days === null ? 'no date' : 'days' });
  num.style.color = color;
  unit.style.color = color;
  var bubble = el('div', { class: 'bubble' }, [num, unit]);
  bubble.style.borderColor = color;
  bubble.style.background = tone.tint;

  return el('button', {
    class: 'row', type: 'button',
    'aria-label': (l.title || 'listing') + ', ' + (days === null ? 'no start date' : days + ' days'),
    onclick: function () { openDetail(l.id); }
  }, [
    el('div', { class: 'thumb', 'aria-hidden': 'true', text: mark }),
    el('div', { class: 'row-main' }, [el('p', { class: 'row-title', text: l.title || '(no title)' }), meta]),
    bubble
  ]);
}

function renderList() {
  var list = $('list');
  if (!list) return;
  list.innerHTML = '';
  if (!state.listings.length) {
    $('empty').hidden = false;
    $('loadMoreWrap').hidden = true;
    $('count').textContent = '';
    return;
  }
  $('empty').hidden = true;

  var shown = sortListings(state.listings.filter(matches));
  $('count').textContent = shown.length === state.listings.length
    ? shown.length + ' listings'
    : shown.length + ' of ' + state.listings.length + ' listings';

  if (!shown.length) {
    list.appendChild(el('p', { class: 'note', text: 'Nothing matches those filters.' }));
    $('loadMoreWrap').hidden = true;
    return;
  }

  var slice = shown.slice(0, state.visible);
  var frag = document.createDocumentFragment();
  for (var i = 0; i < slice.length; i++) frag.appendChild(listingRow(slice[i]));
  list.appendChild(frag);

  var more = shown.length - slice.length;
  $('loadMoreWrap').hidden = more <= 0;
  if (more > 0) $('loadMore').textContent = 'Show ' + Math.min(more, PAGE_SIZE) + ' more, ' + more + ' left';
}

function renderAll() {
  renderStats();
  renderControls();
  renderList();
  var v = $('version');
  if (v) v.textContent = 'Shelf Sync v' + APP_VERSION + ' \u00b7 saved on this device only';
}

/* ---------------- modal plumbing ---------------- */
function closeModal() {
  $('modalMount').innerHTML = '';
  document.body.style.overflow = '';
}
function openModal(title, bodyNodes, footNodes) {
  var card = el('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'card-head' }, [
      el('h2', { text: title }),
      el('button', { class: 'x', type: 'button', 'aria-label': 'Close', text: '\u2715', onclick: closeModal })
    ]),
    el('div', { class: 'card-body' }, bodyNodes),
    footNodes ? el('div', { class: 'card-foot' }, footNodes) : null
  ]);
  var scrim = el('div', { class: 'scrim' }, card);
  scrim.addEventListener('click', function (e) { if (e.target === scrim) closeModal(); });
  $('modalMount').innerHTML = '';
  $('modalMount').appendChild(scrim);
  document.body.style.overflow = 'hidden';
  return card;
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

function field(labelText, control) {
  return el('label', { class: 'field' }, [el('p', { class: 'label', text: labelText }), control]);
}
function textInput(value, placeholder, onInput, type) {
  var i = el('input', { class: 'in', type: type || 'text', placeholder: placeholder || '' });
  i.value = value || '';
  i.addEventListener('input', function () { onInput(i.value); });
  return i;
}

/* ---------------- the SEO prompt ---------------- */
function seoPrompt(l) {
  var url = l.itemNumber ? EBAY_ITEM_URL + l.itemNumber : '(paste your listing link here)';
  var days = listingDays(l);
  var lines = [
    'Audit and rewrite this eBay listing so it ranks better in search and sells faster.',
    '',
    'Listing: ' + url,
    'Current title: ' + (l.title || '(unknown)')
  ];
  if (l.category) lines.push('Category: ' + l.category);
  if (days !== null) lines.push('It has been listed about ' + days + ' days without selling.');
  lines.push('');
  lines.push('Please do all of the following:');
  lines.push('1. Open the listing and audit the current title, description, photos and price.');
  lines.push('2. Write a new title using close to all 80 characters, with the strongest buyer search keywords in the first 60.');
  lines.push('3. Rewrite the item description. Keywords in the first two lines, short scannable lines, no filler or clutter words.');
  lines.push('4. Tell me exactly which item specifics are missing or weak, and what to put in each one.');
  lines.push('5. Sanity check the price against recent completed sales for the same item.');
  lines.push('6. List anything else holding this listing back in search, in priority order.');
  return lines.join('\n');
}

/* ---------------- SCREEN 4: center-peek detail card ---------------- */
function openDetail(id) {
  var isNew = !id;
  var listing = isNew ? newListing() : findListing(id);
  if (!listing) return;

  /* Existing listing: every change saves immediately.
     Brand new listing: nothing is saved until you press Add. */
  function touch() { if (!isNew) { save(); renderStats(); renderList(); } }

  var daysLine = el('p', { class: 'days-line' });
  function refreshDays() {
    var d = listingDays(listing);
    if (d === null) { daysLine.textContent = 'No start date yet, so there is no day count.'; return; }
    daysLine.textContent = d + ' days ' + (listing.freshnessResetAt ? 'since you last updated it.' : 'since the eBay start date.');
  }
  refreshDays();

  var seoBox = el('div');
  var workBox = el('div');
  function drawChecks(box, fields, store) {
    box.innerHTML = '';
    for (var i = 0; i < fields.length; i++) {
      (function (key, label) {
        var cb = el('input', { type: 'checkbox' });
        cb.checked = !!store[key];
        cb.addEventListener('change', function () { store[key] = cb.checked; touch(); });
        box.appendChild(el('label', { class: 'check' }, [cb, el('span', { text: label })]));
      })(fields[i][0], fields[i][1]);
    }
  }
  function redrawChecks() {
    drawChecks(seoBox, SEO_FIELDS, listing.seo);
    drawChecks(workBox, WORK_FIELDS, listing.work);
  }
  redrawChecks();

  var prio = el('select', { class: 'in' });
  for (var p = 0; p < PRIORITIES.length; p++) {
    prio.appendChild(el('option', { value: PRIORITIES[p], text: PRIORITIES[p].charAt(0).toUpperCase() + PRIORITIES[p].slice(1) }));
  }
  prio.value = listing.priority;
  prio.addEventListener('change', function () { listing.priority = prio.value; touch(); });

  var notes = el('textarea', { class: 'in', rows: '3', placeholder: 'Photos look washed out, needs a retake' });
  notes.value = listing.notes;
  notes.addEventListener('input', function () { listing.notes = notes.value; touch(); });

  var actions = el('div', { style: 'display:grid;gap:8px' });
  var copyBtn = el('button', {
    class: 'btn btn-solid btn-full', type: 'button', text: 'Copy SEO prompt',
    onclick: function () { copyText(seoPrompt(listing)); }
  });
  var resetBtn = el('button', {
    class: 'btn btn-quiet btn-full', type: 'button', text: 'Mark updated - reset to 0 days',
    onclick: function () {
      listing.freshnessResetAt = todayISO();
      for (var k in listing.work) listing.work[k] = false;
      touch(); refreshDays(); redrawChecks();
      toast('Freshness reset to 0 days.');
    }
  });
  function buildEbayAction() {
    if (!listing.itemNumber) return el('p', { class: 'note', text: 'Add the eBay item number above to get a direct link.' });
    var a = el('a', { class: 'btn btn-quiet btn-full', href: EBAY_ITEM_URL + listing.itemNumber, target: '_blank', rel: 'noopener', text: 'Open this listing on eBay' });
    a.style.textDecoration = 'none';
    return a;
  }
  var ebaySlot = el('div', {}, buildEbayAction());
  actions.appendChild(copyBtn);
  actions.appendChild(resetBtn);
  actions.appendChild(ebaySlot);

  var body = [
    daysLine,
    field('Title', textInput(listing.title, 'Vintage 1990s denim jacket, size M', function (v) { listing.title = v; touch(); })),
    el('div', { class: 'two' }, [
      field('eBay item number', textInput(listing.itemNumber, '188551378124', function (v) {
        listing.itemNumber = v.trim();
        ebaySlot.innerHTML = '';
        ebaySlot.appendChild(buildEbayAction());
        touch();
      })),
      field('Location / SKU', textInput(listing.sku, 'bookshelf-book', function (v) { listing.sku = v; touch(); }))
    ]),
    el('div', { class: 'two' }, [
      field('Category', textInput(listing.category, 'Books', function (v) { listing.category = v; touch(); })),
      field('eBay start date', textInput(listing.startDate, '', function (v) { listing.startDate = v; touch(); refreshDays(); }, 'date'))
    ]),
    field('Priority', prio),
    el('div', {}, [el('p', { class: 'label', text: 'SEO checklist' }), seoBox]),
    el('div', {}, [el('p', { class: 'label', text: 'Needs work' }), workBox]),
    field('Notes', notes),
    el('div', {}, [el('p', { class: 'label', text: 'Actions' }), actions])
  ];

  var foot;
  if (isNew) {
    foot = [
      el('button', { class: 'btn btn-quiet', type: 'button', text: 'Cancel', onclick: closeModal }),
      el('button', {
        class: 'btn btn-solid', type: 'button', text: 'Add listing',
        onclick: function () {
          if (!listing.title.trim()) { toast('Give it a title first.'); return; }
          state.listings.push(listing);
          save(); renderAll(); closeModal();
          toast('Added to the shelf.');
        }
      })
    ];
  } else {
    foot = [
      el('button', {
        class: 'btn btn-danger', type: 'button', text: 'Delete',
        onclick: function () {
          var keep = [];
          for (var i = 0; i < state.listings.length; i++) if (state.listings[i].id !== listing.id) keep.push(state.listings[i]);
          state.listings = keep;
          save(); renderAll(); closeModal();
          toast('Listing deleted.');
        }
      }),
      el('button', { class: 'btn btn-solid', type: 'button', text: 'Done', onclick: closeModal })
    ];
  }

  openModal(isNew ? 'New listing' : (listing.title || 'Listing'), body, foot);
}

/* ---------------- CSV import ---------------- */
function normHeader(h) { return String(h || '').trim().toLowerCase(); }

/* Finds a column even if eBay renames it slightly.
   .trim() also removes the invisible marker byte at the very start of the file. */
function findCol(headers, candidates) {
  var norm = [], i;
  for (i = 0; i < headers.length; i++) norm.push(normHeader(headers[i]));
  for (i = 0; i < candidates.length; i++) {
    var exact = norm.indexOf(candidates[i]);
    if (exact !== -1) return headers[exact];
  }
  for (i = 0; i < candidates.length; i++) {
    for (var j = 0; j < norm.length; j++) {
      if (norm[j].indexOf(candidates[i]) !== -1) return headers[j];
    }
  }
  return null;
}
function cell(row, col) { return col ? String(row[col] === undefined || row[col] === null ? '' : row[col]).trim() : ''; }
function keyFor(o) {
  if (o.itemNumber) return 'n:' + o.itemNumber;
  if (o.sku) return 's:' + o.sku.toLowerCase();
  return 't:' + (o.title || '').toLowerCase();
}

function openImport() {
  var body = [
    el('p', { class: 'note' }, 'In Seller Hub open Active listings, then Download report, and export as CSV. Item age is read straight from the Start date column.'),
    el('p', { class: 'note' }, 'Items already on your shelf keep their checklists and notes. Anything missing from the new file has sold, and you will be asked whether to remove it.'),
    el('button', {
      class: 'btn btn-solid btn-full', type: 'button', text: 'Choose CSV file',
      onclick: function () { $('csvInput').click(); }
    }),
    el('div', { id: 'importResult' })
  ];
  openModal('Import from eBay', body, [el('button', { class: 'btn btn-quiet', type: 'button', text: 'Close', onclick: closeModal })]);
}

function runImport(file) {
  var out = $('importResult');
  if (typeof Papa === 'undefined') {
    if (out) { out.innerHTML = ''; out.appendChild(el('p', { class: 'note', text: 'The CSV reader did not load. Check your connection and reload the page.' })); }
    return;
  }
  if (out) { out.innerHTML = ''; out.appendChild(el('p', { class: 'note', text: 'Reading your file...' })); }

  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: function (res) {
      var headers = (res.meta && res.meta.fields) || [];
      var cTitle = findCol(headers, ['title']);
      if (!cTitle) {
        out.innerHTML = '';
        out.appendChild(el('p', { class: 'note', text: 'No Title column found. Make sure this is the eBay active listings report.' }));
        return;
      }
      var cNum = findCol(headers, ['item number', 'itemid', 'item id']);
      var cSku = findCol(headers, ['custom label (sku)', 'custom label', 'sku']);
      var cCat = findCol(headers, ['ebay category 1 name', 'category name', 'category']);
      var cStart = findCol(headers, ['start date', 'start time']);
      var cQty = findCol(headers, ['available quantity', 'quantity']);
      var cPrice = findCol(headers, ['current price', 'start price', 'price']);
      var cSold = findCol(headers, ['sold quantity']);
      var cWatch = findCol(headers, ['watchers']);
      var cVar = findCol(headers, ['variation details']);

      var rows = res.data || [];
      var candidates = [], i, row;

      /* Variation listings repeat the same item number: one parent row plus one
         row per size. Take parent rows first, then any orphan variation rows. */
      for (i = 0; i < rows.length; i++) {
        row = rows[i];
        if (cVar && cell(row, cVar)) continue;
        if (cell(row, cTitle)) candidates.push(row);
      }
      var parentKeys = {};
      for (i = 0; i < candidates.length; i++) {
        parentKeys[keyFor({ itemNumber: cell(candidates[i], cNum), sku: cell(candidates[i], cSku), title: cell(candidates[i], cTitle) })] = true;
      }
      for (i = 0; i < rows.length; i++) {
        row = rows[i];
        if (!cVar || !cell(row, cVar)) continue;
        if (!cell(row, cTitle)) continue;
        var k = keyFor({ itemNumber: cell(row, cNum), sku: cell(row, cSku), title: cell(row, cTitle) });
        if (!parentKeys[k]) { parentKeys[k] = true; candidates.push(row); }
      }

      var existing = {};
      for (i = 0; i < state.listings.length; i++) existing[keyFor(state.listings[i])] = state.listings[i];

      var stamp = new Date().toISOString();
      var seen = {}, added = 0, refreshed = 0, dupes = 0, noDate = 0;

      for (i = 0; i < candidates.length; i++) {
        row = candidates[i];
        var data = {
          itemNumber: cell(row, cNum),
          title: cell(row, cTitle),
          sku: cell(row, cSku),
          category: cell(row, cCat),
          quantity: cell(row, cQty),
          price: cell(row, cPrice),
          sold: cell(row, cSold),
          watchers: cell(row, cWatch)
        };
        var startISO = toISODate(parseEbayDate(cell(row, cStart)));
        if (!startISO) noDate++;

        var key = keyFor(data);
        if (seen[key]) { dupes++; continue; }
        seen[key] = true;

        var hit = existing[key];
        if (hit) {
          hit.title = data.title || hit.title;
          hit.category = data.category || hit.category;
          hit.sku = data.sku || hit.sku;
          hit.itemNumber = hit.itemNumber || data.itemNumber;
          hit.quantity = data.quantity;
          hit.price = data.price;
          hit.sold = data.sold;
          hit.watchers = data.watchers;
          if (startISO) hit.startDate = startISO;
          hit.lastImportedAt = stamp;
          refreshed++;
        } else {
          var fresh = newListing();
          fresh.itemNumber = data.itemNumber;
          fresh.title = data.title;
          fresh.sku = data.sku;
          fresh.category = data.category;
          fresh.quantity = data.quantity;
          fresh.price = data.price;
          fresh.sold = data.sold;
          fresh.watchers = data.watchers;
          fresh.startDate = startISO;
          fresh.lastImportedAt = stamp;
          state.listings.push(fresh);
          added++;
        }
      }

      /* Sold-out scrubbing: previously imported items that are gone from this file. */
      var missing = [];
      for (i = 0; i < state.listings.length; i++) {
        var l = state.listings[i];
        if (l.lastImportedAt === stamp) continue;
        if (!l.lastImportedAt) continue;   /* added by hand, never touch */
        missing.push(l.id);
      }

      save();
      /* Replace the shared catalog in the cloud so the other phone matches. */
      try { if (window.Cloud) window.Cloud.pushCatalog(state.listings); } catch (e) { }
      state.visible = PAGE_SIZE;
      renderAll();
      showImportResult({ added: added, refreshed: refreshed, dupes: dupes, noDate: noDate, missing: missing });
    },
    error: function () {
      out.innerHTML = '';
      out.appendChild(el('p', { class: 'note', text: 'Something went wrong reading that file.' }));
    }
  });
}

function showImportResult(r) {
  var out = $('importResult');
  if (!out) return;
  out.innerHTML = '';
  var box = el('div', { style: 'background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:12px;display:grid;gap:6px' });
  box.appendChild(el('p', { class: 'label', text: 'Import complete' }));
  box.appendChild(el('p', { class: 'note', text: r.added + ' new listing' + (r.added === 1 ? '' : 's') + ' added' }));
  if (r.refreshed) box.appendChild(el('p', { class: 'note', text: r.refreshed + ' already tracked, details refreshed' }));
  if (r.dupes) box.appendChild(el('p', { class: 'note', text: r.dupes + ' duplicate row' + (r.dupes === 1 ? '' : 's') + ' skipped, these are size variations' }));
  if (r.noDate) box.appendChild(el('p', { class: 'note', text: r.noDate + ' row' + (r.noDate === 1 ? '' : 's') + ' had no readable start date' }));
  out.appendChild(box);

  if (r.missing.length) {
    var warn = el('div', { style: 'margin-top:12px;display:grid;gap:8px' }, [
      el('p', { class: 'note', text: r.missing.length + ' listing' + (r.missing.length === 1 ? '' : 's') + ' on your shelf are not in this file, which usually means they sold.' }),
      el('button', {
        class: 'btn btn-danger btn-full', type: 'button',
        text: 'Remove ' + r.missing.length + ' sold listing' + (r.missing.length === 1 ? '' : 's'),
        onclick: function () {
          var drop = {}, i;
          for (i = 0; i < r.missing.length; i++) drop[r.missing[i]] = true;
          var keep = [];
          for (i = 0; i < state.listings.length; i++) if (!drop[state.listings[i].id]) keep.push(state.listings[i]);
          state.listings = keep;
          save(); renderAll(); closeModal();
          toast('Sold listings removed.');
        }
      }),
      el('p', { class: 'note', text: 'If your export only covered part of your shelf, close this instead and nothing is removed.' })
    ]);
    out.appendChild(warn);
  }
}

/* ---------------- backup, restore, erase ---------------- */
function backup() {
  var blob = new Blob([JSON.stringify(state.listings, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = el('a', { href: url, download: 'shelf-sync-backup-' + todayISO() + '.json' });
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  toast('Backup file saved.');
}

function restore(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var parsed;
    try { parsed = JSON.parse(String(reader.result)); }
    catch (e) { toast('That file is not a Shelf Sync backup.'); return; }
    if (!Array.isArray(parsed)) { toast('That file is not a Shelf Sync backup.'); return; }
    openModal('Restore backup', [
      el('p', { class: 'note', text: 'This replaces everything on this device with the ' + parsed.length + ' listings in that file.' })
    ], [
      el('button', { class: 'btn btn-quiet', type: 'button', text: 'Cancel', onclick: closeModal }),
      el('button', {
        class: 'btn btn-solid', type: 'button', text: 'Restore',
        onclick: function () {
          state.listings = parsed.map(normalize);
          state.visible = PAGE_SIZE;
          save(); renderAll(); closeModal();
          toast('Backup restored.');
        }
      })
    ]);
  };
  reader.readAsText(file);
}

function confirmErase() {
  openModal('Erase everything', [
    el('p', { class: 'note', text: 'This deletes all ' + state.listings.length + ' listings on this device, including your checklists and notes. It cannot be undone. Back up first if you are not sure.' })
  ], [
    el('button', { class: 'btn btn-quiet', type: 'button', text: 'Cancel', onclick: closeModal }),
    el('button', {
      class: 'btn btn-danger', type: 'button', text: 'Erase all',
      onclick: function () {
        state.listings = [];
        save(); renderAll(); closeModal();
        toast('Everything erased.');
      }
    })
  ]);
}

/* ---------------- wiring ---------------- */
/* SAFE WIRING.
   The old version called $('enterBtn').addEventListener(...) directly. If even
   one element was missing from index.html, the whole script stopped right there
   and the Tap to enter button was never connected, so the app froze on the
   splash screen. This helper skips anything missing instead of dying. */
function on(id, event, fn) {
  var node = $(id);
  if (node) node.addEventListener(event, fn);
}

function dismissSplash() {
  var s = $('splash');
  if (!s) return;
  s.classList.add('gone');
  setTimeout(function () { s.hidden = true; }, 500);
}

on('enterBtn', 'click', dismissSplash);
/* Tapping anywhere on the splash also enters, so you can never get stuck. */
on('splash', 'click', dismissSplash);
on('importBtn', 'click', openImport);
on('emptyImport', 'click', openImport);
on('addBtn', 'click', function () { openDetail(null); });
on('loadMore', 'click', function () { state.visible += PAGE_SIZE; renderList(); });
on('backupBtn', 'click', backup);
on('restoreBtn', 'click', function () { var r = $('restoreInput'); if (r) r.click(); });
on('resetBtn', 'click', confirmErase);

on('fSearch', 'input', function (e) { state.q = e.target.value; state.visible = PAGE_SIZE; renderList(); });
on('fLoc', 'change', function (e) { state.loc = e.target.value; state.visible = PAGE_SIZE; renderList(); });
on('fCat', 'change', function (e) { state.cat = e.target.value; state.visible = PAGE_SIZE; renderList(); });
on('fSort', 'change', function (e) { state.sort = e.target.value; state.visible = PAGE_SIZE; renderList(); });

on('csvInput', 'change', function (e) {
  var f = e.target.files && e.target.files[0];
  if (f) runImport(f);
  e.target.value = '';
});
on('restoreInput', 'change', function (e) {
  var f = e.target.files && e.target.files[0];
  if (f) restore(f);
  e.target.value = '';
});

/* ---------------- start ---------------- */
state.listings = load();

/* Add ?demo=1 to the address to preview the layout with sample rows.
   Nothing is saved to the device in demo mode. */
if (location.search.indexOf('demo=1') !== -1 || window.SHELF_SYNC_DEMO) {
  var samples = [
    ['188551378124', "Mata Women's Revolution Brown Half Zipper Knee High Boots", 'poster box #1', 'Boots', 88, 6],
    ['295512340011', 'Stephen King Pet Sematary First Edition Hardcover Book', 'bookshelf-book', 'Books', 41, 2],
    ['295512340012', 'Marvel Secret Wars Complete Comic Run Lot of 12 Issues', 'below books', 'Comics & Graphic Novels', 12, 9],
    ['295512340013', 'Vintage Leather Work Gloves Size Large Insulated Pair', 'abby', 'Gloves & Mitts', 6, 0],
    ['', 'Blu-ray Movie Bundle, 8 Discs, Action and Sci-Fi', '', 'DVDs & Blu-ray Discs', 137, 14]
  ];
  for (var d = 0; d < samples.length; d++) {
    var sample = newListing();
    sample.itemNumber = samples[d][0];
    sample.title = samples[d][1];
    sample.sku = samples[d][2];
    sample.category = samples[d][3];
    sample.startDate = toISODate(new Date(Date.now() - samples[d][4] * 86400000));
    sample.watchers = String(samples[d][5]);
    sample.lastImportedAt = new Date().toISOString();
    if (d === 3) { sample.work.photos = true; sample.work.price = true; }
    if (d === 1) { sample.seo.fullTitle = true; sample.seo.sixPhotos = true; }
    state.listings.push(sample);
  }
  save = function () { return true; };
}

/* If part of the layout is missing, say so out loud instead of freezing. */
try {
  renderAll();
} catch (err) {
  toast('Start-up problem: ' + ((err && err.message) ? err.message : 'index.html may not be updated yet'));
}

/* ---------------- cloud sync ----------------
   firebase.js loads first and defines window.Cloud. If it is missing, the app
   carries on exactly as before, saving to this device only. */
if (window.Cloud) {
  window.Cloud.start({
    local: function () { return state.listings; },
    apply: function (list) {
      state.listings = list;
      /* Written straight to storage, not through save(), so an incoming
         change is never bounced back up to the cloud as a new change. */
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.listings)); } catch (e) { }
      state.visible = PAGE_SIZE;
      renderAll();
    }
  });
}

/* Service worker only works over https or localhost, never from a file:// path. */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./service-worker.js').catch(function () { });
  });
     }
