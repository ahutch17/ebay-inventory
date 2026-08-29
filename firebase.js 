'use strict';
/* ---------------------------------------------------------------
   Shelf Sync - cloud sync layer
   Loads BEFORE app.js. Exposes window.Cloud.

   Data layout in Firestore:
     shelves/hutchinson/meta/state      one small bookkeeping doc
     shelves/hutchinson/chunks/{0..n}   CSV facts, 250 listings per doc
     shelves/hutchinson/work/{key}      one tiny doc per listing you touched

   Why the split: a full load costs ~13 reads instead of 3,141, and a CSV
   import replaces the catalog without ever touching your checklists.
----------------------------------------------------------------*/

var CLOUD_VERSION = '1.0';

var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDbcnUwVyI9Oti7fvi9oUEkOjo45MwJaGw',
  authDomain: 'shelf-sync-e265a.firebaseapp.com',
  projectId: 'shelf-sync-e265a',
  storageBucket: 'shelf-sync-e265a.firebasestorage.app',
  messagingSenderId: '29427610689',
  appId: '1:29427610689:web:f389a1713fb1033f2fc2c0'
};

var SHELF = 'shelves/hutchinson';
var CHUNK_SIZE = 250;
var BATCH_LIMIT = 400;
var HOUSEHOLD = ['amandaciaralee@gmail.com', 'doublehutch19@gmail.com'];

var db = null, auth = null, user = null;
var hooks = { local: null, apply: null };
var lastWork = {};          /* key -> JSON of what the cloud already has */
var cloudChunkCount = 0;
var lastImportSeen = 0;
var saveTimer = null;
var metaUnsub = null, workUnsub = null;
var booted = false;

/* ---------------- tiny helpers ---------------- */

function noop() {}

function say(msg) {
  if (typeof window.toast === 'function') window.toast(msg);
}

function keyOf(l) {
  var raw;
  if (l && l.itemNumber) raw = 'n_' + l.itemNumber;
  else if (l && l.sku) raw = 's_' + String(l.sku).toLowerCase();
  else raw = 't_' + String((l && l.title) || '').toLowerCase();
  return raw.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 100);
}

function shape(l) {
  if (typeof window.normalize === 'function') return window.normalize(l);
  return l;
}

/* Fields that come from the eBay CSV and get wholesale replaced on import. */
function catalogRow(l) {
  return {
    id: l.id || '',
    itemNumber: l.itemNumber || '',
    title: l.title || '',
    sku: l.sku || '',
    category: l.category || '',
    startDate: l.startDate || '',
    quantity: l.quantity || '',
    price: l.price || '',
    sold: l.sold || '',
    watchers: l.watchers || '',
    lastImportedAt: l.lastImportedAt || ''
  };
}

/* Fields that exist only because a human did something. Never auto-erased. */
function workRow(l) {
  return {
    freshnessResetAt: l.freshnessResetAt || '',
    priority: l.priority || 'medium',
    notes: l.notes || '',
    work: l.work || {},
    seo: l.seo || {}
  };
}

function hasWork(l) {
  var k;
  if (l.freshnessResetAt) return true;
  if (l.notes) return true;
  if (l.priority && l.priority !== 'medium') return true;
  for (k in l.work) if (l.work[k]) return true;
  for (k in l.seo) if (l.seo[k]) return true;
  return false;
}

/* ---------------- the little status bar ---------------- */

var bar = null, barMsg = null, barBtn = null;

function buildBar() {
  if (bar || !document.body) return;
  bar = document.createElement('div');
  bar.id = 'cloudBar';
  bar.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:30;' +
    'display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;' +
    'padding:9px 14px;background:#F7F2EB;border-top:1px solid #D8CFC2;' +
    'font:13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
    'color:#54655A;text-align:center');
  barMsg = document.createElement('span');
  barBtn = document.createElement('button');
  barBtn.type = 'button';
  barBtn.setAttribute('style', 'flex:0 0 auto;border:1px solid #C5CBBF;background:#54655A;' +
    'color:#F7F2EB;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600');
  barBtn.style.display = 'none';
  bar.appendChild(barMsg);
  bar.appendChild(barBtn);
  document.body.appendChild(bar);
}

function cloudStatus(msg, btnText, btnFn) {
  buildBar();
  if (!bar) return;
  bar.style.display = 'flex';
  barMsg.textContent = msg;
  if (btnText) {
    barBtn.textContent = btnText;
    barBtn.style.display = '';
    barBtn.onclick = btnFn || noop;
  } else {
    barBtn.style.display = 'none';
    barBtn.onclick = null;
  }
  try { document.body.style.paddingBottom = '64px'; } catch (e) {}
}

function fade(msg) {
  cloudStatus(msg);
  setTimeout(function () {
    if (bar && !barBtn.style.display) return;
    if (bar) bar.style.display = 'none';
    try { document.body.style.paddingBottom = ''; } catch (e) {}
  }, 2600);
}

/* ---------------- sign in ---------------- */

function offerSignIn() {
  cloudStatus('Saved on this device only', 'Sign in to sync', signIn);
}

function signIn() {
  if (!auth) return;
  var p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  cloudStatus('Opening Google sign-in...');
  auth.signInWithPopup(p).catch(function (err) {
    var code = (err && err.code) || '';
    if (code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment') {
      auth.signInWithRedirect(p).catch(signInFailed);
      return;
    }
    signInFailed(err);
  });
}

function signInFailed(err) {
  var code = (err && err.code) || 'unknown';
  if (code === 'auth/unauthorized-domain') {
    cloudStatus('This web address is not approved in Firebase yet', 'Try again', signIn);
  } else {
    cloudStatus('Sign-in did not finish (' + code + ')', 'Try again', signIn);
  }
}

function signOut() {
  if (!auth) return;
  if (metaUnsub) { metaUnsub(); metaUnsub = null; }
  if (workUnsub) { workUnsub(); workUnsub = null; }
  lastWork = {};
  window.Cloud.ready = false;
  auth.signOut().then(offerSignIn).catch(noop);
}

/* ---------------- reading ---------------- */

function pullAll(cb) {
  var out = { catalog: [], work: {}, meta: null };
  db.doc(SHELF + '/meta/state').get().then(function (snap) {
    out.meta = snap.exists ? (snap.data() || {}) : null;
    return db.collection(SHELF + '/chunks').get();
  }).then(function (qs) {
    var parts = [];
    qs.forEach(function (d) { parts.push(d.data() || {}); });
    parts.sort(function (a, b) { return (a.i || 0) - (b.i || 0); });
    for (var i = 0; i < parts.length; i++) {
      var items = parts[i].items || [];
      for (var j = 0; j < items.length; j++) out.catalog.push(items[j]);
    }
    cloudChunkCount = parts.length;
    return db.collection(SHELF + '/work').get();
  }).then(function (qs) {
    qs.forEach(function (d) { out.work[d.id] = d.data() || {}; });
    cb(null, out);
  }).catch(function (e) { cb(e); });
}

/* Cloud catalog wins. Work docs are laid on top. Local-only work is kept
   and pushed up, so nothing you already did on this phone is lost. */
function mergeDown(cloud, local) {
  var byKey = {}, i, k, l;
  for (i = 0; i < local.length; i++) byKey[keyOf(local[i])] = local[i];

  var merged = [], orphans = [];
  for (i = 0; i < cloud.catalog.length; i++) {
    l = shape(cloud.catalog[i]);
    k = keyOf(l);
    var w = cloud.work[k];
    if (w) {
      l.freshnessResetAt = w.freshnessResetAt || '';
      l.priority = w.priority || 'medium';
      l.notes = w.notes || '';
      l.work = w.work || l.work;
      l.seo = w.seo || l.seo;
      lastWork[k] = JSON.stringify(workRow(l));
    } else if (byKey[k] && hasWork(byKey[k])) {
      var mine = byKey[k];
      l.freshnessResetAt = mine.freshnessResetAt || '';
      l.priority = mine.priority || 'medium';
      l.notes = mine.notes || '';
      l.work = mine.work;
      l.seo = mine.seo;
      orphans.push(l);
    }
    merged.push(l);
    delete byKey[k];
  }

  /* Rows this phone has that the cloud has never seen (hand-added items). */
  for (k in byKey) merged.push(byKey[k]);

  if (orphans.length) pushWork(orphans);
  return merged;
}

/* ---------------- writing ---------------- */

function pushCatalog(list, done) {
  if (!db || !user) { if (done) done(); return; }
  var chunks = [], i;
  for (i = 0; i < list.length; i += CHUNK_SIZE) chunks.push(list.slice(i, i + CHUNK_SIZE));

  var jobs = [], batch = db.batch(), ops = 0;
  for (i = 0; i < chunks.length; i++) {
    var items = [];
    for (var j = 0; j < chunks[i].length; j++) items.push(catalogRow(chunks[i][j]));
    batch.set(db.collection(SHELF + '/chunks').doc(String(i)), { i: i, n: items.length, items: items });
    ops++;
    if (ops >= BATCH_LIMIT) { jobs.push(batch.commit()); batch = db.batch(); ops = 0; }
  }
  /* Shelf shrank? Clear the chunk docs that are no longer used. */
  for (i = chunks.length; i < cloudChunkCount; i++) {
    batch.delete(db.collection(SHELF + '/chunks').doc(String(i)));
    ops++;
  }
  lastImportSeen = Date.now();
  batch.set(db.doc(SHELF + '/meta/state'), {
    schema: 1,
    chunkCount: chunks.length,
    listingCount: list.length,
    lastImportAt: lastImportSeen,
    updatedBy: user.uid,
    updatedByEmail: user.email || ''
  });
  jobs.push(batch.commit());
  cloudChunkCount = chunks.length;

  Promise.all(jobs).then(function () {
    fade(list.length + ' listings saved to the cloud');
    if (done) done();
  }).catch(function (e) {
    cloudStatus('Cloud save failed: ' + ((e && e.code) || 'error'), 'Retry', function () {
      pushCatalog(hooks.local ? hooks.local() : list, null);
    });
  });
}

function pushWork(rows) {
  if (!db || !user || !rows.length) return;
  var jobs = [], batch = db.batch(), ops = 0, i;
  for (i = 0; i < rows.length; i++) {
    var k = keyOf(rows[i]);
    var payload = workRow(rows[i]);
    lastWork[k] = JSON.stringify(payload);
    payload.updatedAt = Date.now();
    payload.updatedBy = user.uid;
    payload.itemNumber = rows[i].itemNumber || '';
    batch.set(db.collection(SHELF + '/work').doc(k), payload);
    ops++;
    if (ops >= BATCH_LIMIT) { jobs.push(batch.commit()); batch = db.batch(); ops = 0; }
  }
  if (ops) jobs.push(batch.commit());
  Promise.all(jobs).catch(function (e) {
    say('Could not sync a change: ' + ((e && e.code) || 'error'));
  });
}

/* Called by app.js save(). Writes only what actually changed. */
function noteLocalChange(list) {
  if (!window.Cloud.ready) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    saveTimer = null;
    var changed = [], i, k, json;
    for (i = 0; i < list.length; i++) {
      k = keyOf(list[i]);
      if (!hasWork(list[i]) && lastWork[k] === undefined) continue;
      json = JSON.stringify(workRow(list[i]));
      if (lastWork[k] !== json) changed.push(list[i]);
    }
    if (changed.length) pushWork(changed);
  }, 1200);
}

/* ---------------- listening for the other phone ---------------- */

function listen() {
  if (metaUnsub) metaUnsub();
  metaUnsub = db.doc(SHELF + '/meta/state').onSnapshot(function (snap) {
    var d = snap.exists ? (snap.data() || {}) : null;
    if (!d || !d.lastImportAt) return;
    if (d.updatedBy === user.uid) return;
    if (d.lastImportAt === lastImportSeen) return;
    lastImportSeen = d.lastImportAt;
    fade('New import from ' + (d.updatedByEmail || 'the other phone') + ' - reloading');
    resync();
  }, noop);

  if (workUnsub) workUnsub();
  workUnsub = db.collection(SHELF + '/work')
    .orderBy('updatedAt', 'desc').limit(30)
    .onSnapshot(function (qs) {
      if (!hooks.local || !hooks.apply) return;
      var list = hooks.local(), byKey = {}, i, touched = 0;
      for (i = 0; i < list.length; i++) byKey[keyOf(list[i])] = list[i];
      qs.forEach(function (doc) {
        var d = doc.data() || {};
        if (d.updatedBy === user.uid) return;
        var l = byKey[doc.id];
        if (!l) return;
        l.freshnessResetAt = d.freshnessResetAt || '';
        l.priority = d.priority || 'medium';
        l.notes = d.notes || '';
        if (d.work) l.work = d.work;
        if (d.seo) l.seo = d.seo;
        lastWork[doc.id] = JSON.stringify(workRow(l));
        touched++;
      });
      if (touched) hooks.apply(list);
    }, noop);
}

function resync() {
  pullAll(function (err, cloud) {
    if (err || !hooks.apply) return;
    var merged = mergeDown(cloud, hooks.local ? hooks.local() : []);
    hooks.apply(merged);
  });
}

/* ---------------- start up ---------------- */

function afterSignIn() {
  cloudStatus('Syncing your shelf...');
  pullAll(function (err, cloud) {
    if (err) {
      var code = (err && err.code) || 'error';
      if (code === 'permission-denied') {
        cloudStatus('Firestore refused this account - check the rules', 'Retry', afterSignIn);
      } else {
        cloudStatus('Could not reach the cloud (' + code + ')', 'Retry', afterSignIn);
      }
      return;
    }
    var local = hooks.local ? hooks.local() : [];
    window.Cloud.ready = true;

    if (!cloud.catalog.length && local.length) {
      /* First ever sync from the phone that already holds the shelf. */
      cloudStatus('Uploading ' + local.length + ' listings, one time only...');
      pushCatalog(local, function () {
        var mine = [], i;
        for (i = 0; i < local.length; i++) if (hasWork(local[i])) mine.push(local[i]);
        if (mine.length) pushWork(mine);
        listen();
      });
      return;
    }

    if (cloud.catalog.length) {
      var merged = mergeDown(cloud, local);
      if (hooks.apply) hooks.apply(merged);
      lastImportSeen = (cloud.meta && cloud.meta.lastImportAt) || 0;
      fade('Synced - ' + merged.length + ' listings');
    } else {
      fade('Signed in as ' + (user.email || 'you'));
    }
    listen();
  });
}

function start(opts) {
  if (booted) return;
  booted = true;
  hooks.local = opts && opts.local;
  hooks.apply = opts && opts.apply;

  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    cloudStatus('Cloud sync did not load - working offline', 'Reload', function () { location.reload(); });
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(noop);
  } catch (e) {
    cloudStatus('Cloud sync could not start', 'Reload', function () { location.reload(); });
    return;
  }

  auth.getRedirectResult().catch(noop);

  auth.onAuthStateChanged(function (u) {
    if (!u) { user = null; window.Cloud.ready = false; offerSignIn(); return; }
    var email = (u.email || '').toLowerCase();
    if (HOUSEHOLD.indexOf(email) === -1) {
      cloudStatus(email + ' is not on the household list', 'Use another account', function () {
        auth.signOut().then(signIn).catch(noop);
      });
      return;
    }
    user = u;
    afterSignIn();
  });
}

window.Cloud = {
  version: CLOUD_VERSION,
  ready: false,
  start: start,
  noteLocalChange: noteLocalChange,
  pushCatalog: function (list) {
    if (!window.Cloud.ready) return;
    pushCatalog(list, function () { pushWork(list.filter(hasWork)); });
  },
  signIn: signIn,
  signOut: signOut,
  who: function () { return user ? (user.email || 'signed in') : 'signed out'; }
};
