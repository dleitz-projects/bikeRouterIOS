'use strict';

/* bikeRouteriOS
   Karte, Wegpunkte, Profilauswahl, Routenberechnung, GPX-Teilen, Tourenarchiv. */

const BROUTER = 'https://brouter.de/brouter';
const TIMEOUT_MS = 30000;
const STORE_KEY = 'bikeRouteriOS.archive.v1';

const el = {
  map: document.getElementById('map'),
  profile: document.getElementById('profile'),
  calc: document.getElementById('calc'),
  share: document.getElementById('share'),
  save: document.getElementById('save'),
  clear: document.getElementById('clear'),
  stats: document.getElementById('stats'),
  status: document.getElementById('status'),

  archiveToggle: document.getElementById('archiveToggle'),
  archiveLabel: document.getElementById('archiveLabel'),
  archivePanel: document.getElementById('archivePanel'),
  archiveEmpty: document.getElementById('archiveEmpty'),
  tourList: document.getElementById('tourList'),
  exportArchive: document.getElementById('exportArchive'),
  importArchive: document.getElementById('importArchive'),
  importFile: document.getElementById('importFile'),

  nameDialog: document.getElementById('nameDialog'),
  nameForm: document.getElementById('nameForm'),
  nameLabel: document.getElementById('nameLabel'),
  nameInput: document.getElementById('nameInput'),
  nameOk: document.getElementById('nameOk'),
  nameCancel: document.getElementById('nameCancel'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmForm: document.getElementById('confirmForm'),
  confirmText: document.getElementById('confirmText'),
  confirmCancel: document.getElementById('confirmCancel')
};

const PROFILES = [...el.profile.options].map((o) => o.value);

/* waypoints: [{ marker, flagged }] — die Koordinate lebt im Marker, damit Drag
   und Zustand nicht auseinanderlaufen koennen.
   route:      Ergebnis der letzten erfolgreichen Berechnung, oder null.
   gpx:        zwischengespeicherte GPX-Datei zur aktuellen Route. */
const state = { waypoints: [], layer: null, route: null, gpx: null, busy: false };

/* ---------------------------------------------------------------- Karte */

const map = L.map(el.map, { zoomControl: true }).setView([51.85, 10.30], 9);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende | Routing: <a href="https://brouter.de">BRouter</a>'
}).addTo(map);

map.on('click', (e) => addWaypoint(e.latlng));

/* ----------------------------------------------------------- Wegpunkte */

function icon(index, total, flagged) {
  const kind = index === 0 ? ' wp--start' : (index === total - 1 ? ' wp--end' : '');
  const flag = flagged ? ' wp--flagged' : '';
  // Sichtbarer Punkt 26 px, Trefferfläche 44 px — Vorgabe für Touch.
  return L.divIcon({
    className: 'wp-hit',
    html: `<div class="wp${kind}${flag}">${index + 1}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -16]
  });
}

function addWaypoint(latlng) {
  const marker = L.marker(latlng, { draggable: true, autoPan: true }).addTo(map);

  const popup = document.createElement('div');
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'Punkt löschen';
  del.addEventListener('click', () => removeWaypoint(marker));
  popup.appendChild(del);
  marker.bindPopup(popup);

  // Verschieben aendert die Route — das alte Ergebnis gilt nicht mehr.
  marker.on('dragend', () => invalidate('Wegpunkt verschoben — bitte neu berechnen.'));

  state.waypoints.push({ marker, flagged: false });
  renumber();
  invalidate();
}

function removeWaypoint(marker) {
  const i = state.waypoints.findIndex((w) => w.marker === marker);
  if (i === -1) return;
  map.removeLayer(marker);
  state.waypoints.splice(i, 1);
  renumber();
  invalidate();
}

function clearWaypoints() {
  state.waypoints.forEach((w) => map.removeLayer(w.marker));
  state.waypoints = [];
  renumber();
  invalidate();
}

function renumber() {
  const n = state.waypoints.length;
  state.waypoints.forEach((w, i) => w.marker.setIcon(icon(i, n, w.flagged)));
}

/* Hervorhebung der Punkte, die eine Berechnung haben scheitern lassen. */
function flagAllWaypoints() {
  state.waypoints.forEach((w) => { w.flagged = true; });
  renumber();
}

function clearFlags() {
  if (!state.waypoints.some((w) => w.flagged)) return;
  state.waypoints.forEach((w) => { w.flagged = false; });
  renumber();
}

/* Jede Aenderung an Punkten oder Profil verwirft die dargestellte Route.
   Sonst koennte eine Linie angezeigt oder eine GPX geteilt werden, die
   nicht mehr zu den gesetzten Punkten passt. */
function invalidate(message) {
  if (state.layer) {
    map.removeLayer(state.layer);
    state.layer = null;
  }
  state.route = null;
  state.gpx = null;
  el.stats.hidden = true;
  clearFlags();
  syncButtons();
  setStatus(message || defaultHint());
}

function defaultHint() {
  const n = state.waypoints.length;
  if (n === 0) return 'Tippe auf die Karte, um den Start zu setzen.';
  if (n === 1) return '1 Punkt — mindestens ein zweiter Punkt wird gebraucht.';
  return `${n} Punkte — bereit zum Berechnen.`;
}

function syncButtons() {
  el.calc.disabled = state.busy || state.waypoints.length < 2;
  el.share.disabled = state.busy || !state.route;
  el.save.disabled = state.busy || !state.route;
  el.clear.disabled = state.busy || state.waypoints.length === 0;
}

function setStatus(text, isError) {
  el.status.textContent = text;
  el.status.classList.toggle('error', !!isError);
}

/* ------------------------------------------------------------- Routing */

function lonlats() {
  return state.waypoints
    .map((w) => {
      const p = w.marker.getLatLng();
      // BRouter erwartet lon,lat — nicht lat,lon.
      return `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;
    })
    .join('|');
}

function url(format, points, profile) {
  const q = new URLSearchParams({
    lonlats: points,
    profile: profile,
    alternativeidx: '0',
    format: format
  });
  // URLSearchParams kodiert "|" als %7C — das akzeptiert BRouter.
  return `${BROUTER}?${q}`;
}

/* BRouter unterscheidet seine Fehlerfälle NICHT über den Statuscode — alle drei
   beobachteten Fälle kommen als HTTP 400. Die Unterscheidung steckt allein im
   Klartext-Body, deshalb wird der ausgewertet und nicht der Status. */
function explain(status, body) {
  const b = body.toLowerCase();

  if (b.includes('no track found')) {
    return {
      text: 'Kein Weg gefunden. Meist liegt ein Wegpunkt zu weit von einer erfassten Straße entfernt — verschiebe ihn näher an einen Weg. Welcher Punkt es ist, meldet der Server nicht, deshalb sind alle hervorgehoben.',
      flag: true
    };
  }
  if (b.includes('datafile') && b.includes('not found')) {
    return { text: 'Für mindestens einen Punkt gibt es keine Kartendaten — er liegt außerhalb der abgedeckten Region.' };
  }
  if (b.includes('watchdog')) {
    return { text: 'Der Server hat die Berechnung abgebrochen, weil sie zu lange gedauert hat. Meist liegen die Punkte zu weit auseinander.' };
  }
  if (status >= 500) {
    return { text: 'Der Routing-Server hat einen internen Fehler gemeldet.' };
  }
  return { text: `Der Server antwortete mit Fehler ${status}.` };
}

function routeError(text, flag) {
  const err = new Error(text);
  err.flagWaypoints = !!flag;
  return err;
}

/* Ein GET ohne eigene Header: bleibt ein CORS-simple-request, kein Preflight. */
async function request(target) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);

  let res;
  try {
    res = await fetch(target, { signal: ctrl.signal });
  } catch (err) {
    throw routeError(timedOut
      ? 'Der Routing-Server antwortet nicht (Zeitüberschreitung).'
      : 'Keine Verbindung zum Routing-Server. Ist das iPhone online?');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // BRouter meldet Fehler als text/plain, teils mit leerem Body.
    const body = (await res.text().catch(() => '')).trim();
    const info = explain(res.status, body);
    throw routeError(body ? `${info.text} (Server: ${body})` : info.text, info.flag);
  }
  return res;
}

async function calculate() {
  if (state.waypoints.length < 2) return;

  const points = lonlats();
  const profile = el.profile.value;

  state.busy = true;
  syncButtons();
  el.calc.textContent = 'Berechne …';
  setStatus('Route wird berechnet …');

  try {
    const res = await request(url('geojson', points, profile));

    // Content-Type ist application/vnd.geo+json, nicht application/json.
    // response.json() stoert das nicht.
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw routeError('Die Antwort des Servers war kein gültiges GeoJSON.');
    }

    const feature = data && data.features && data.features[0];
    const coords = feature && feature.geometry && feature.geometry.coordinates;
    if (!coords || coords.length < 2) {
      throw routeError('Zwischen diesen Punkten wurde keine Route gefunden.');
    }

    draw(coords);
    const figures = show(feature.properties || {});
    state.route = { points, profile, distance: figures.distance, ascend: figures.ascend };
    state.gpx = null;
    setStatus('Route berechnet.');
  } catch (err) {
    invalidate();
    if (err.flagWaypoints) flagAllWaypoints();
    setStatus(err.message, true);
  } finally {
    state.busy = false;
    el.calc.textContent = 'Route berechnen';
    syncButtons();
  }
}

function draw(coords) {
  if (state.layer) map.removeLayer(state.layer);
  // GeoJSON liefert [lon, lat, ele] — Leaflet will [lat, lng].
  const latlngs = coords.map((c) => [c[1], c[0]]);
  state.layer = L.polyline(latlngs, {
    color: '#7dd3fc',
    weight: 5,
    opacity: 0.9
  }).addTo(map);
  map.fitBounds(state.layer.getBounds(), { padding: [28, 28] });
}

function km(metres) {
  return `${(metres / 1000).toFixed(1).replace('.', ',')} km`;
}

function show(props) {
  const metres = Number(props['track-length']);
  const ascend = Number(props['filtered ascend']);
  const parts = [];
  if (Number.isFinite(metres)) parts.push(km(metres));
  if (Number.isFinite(ascend)) parts.push(`${Math.round(ascend)} hm aufwärts`);
  el.stats.textContent = parts.join('  ·  ');
  el.stats.hidden = parts.length === 0;
  return {
    distance: Number.isFinite(metres) ? metres : null,
    ascend: Number.isFinite(ascend) ? ascend : null
  };
}

/* ----------------------------------------------------------- Teilen */

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Muss synchron aus der Tap-Behandlung heraus laufen: navigator.share()
   verlangt eine frische Nutzerinteraktion. Deshalb hier kein await davor. */
function shareOrDownload(file, what) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] })
      .then(() => setStatus(`${what} geteilt.`))
      .catch((err) => {
        if (err && err.name === 'AbortError') {
          setStatus('Teilen abgebrochen.');
          return;
        }
        // Typisch: die Nutzerinteraktion ist durch das Laden verfallen.
        // Dann als Download ausliefern; beim naechsten Tap liegt die
        // Datei bereits vor und das Share-Sheet oeffnet sich sofort.
        download(file);
        setStatus(`Share-Sheet nicht verfügbar — ${what} wurde heruntergeladen. Nochmal tippen öffnet das Teilen-Menü.`, true);
      });
    return;
  }
  download(file);
  setStatus(`Teilen wird hier nicht unterstützt — ${what} wurde heruntergeladen.`);
}

function download(file) {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
}

async function share() {
  if (!state.route) return;

  // Bereits geholt? Dann ohne await teilen, damit die Interaktion gilt.
  if (state.gpx) {
    shareOrDownload(state.gpx, 'GPX');
    return;
  }

  state.busy = true;
  syncButtons();
  el.share.textContent = 'Lade …';
  setStatus('GPX wird geholt …');

  try {
    const res = await request(url('gpx', state.route.points, state.route.profile));
    const blob = await res.blob();
    state.gpx = new File([blob], `${today()}_Route.gpx`, { type: 'application/gpx+xml' });
    setStatus('GPX bereit.');
    shareOrDownload(state.gpx, 'GPX');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    state.busy = false;
    el.share.textContent = 'Teilen';
    syncButtons();
  }
}

/* ---------------------------------------------------------- Dialoge */

const hasDialog = typeof HTMLDialogElement !== 'undefined'
  && typeof HTMLDialogElement.prototype.showModal === 'function';

/* Wichtig: Beim Absenden eines <form method="dialog"> schliesst sich der Dialog
   und setzt returnValue korrekt, aber das close-Event feuert nicht zuverlaessig
   (in Chrome gemessen). Wer nur auf close wartet, haengt an einem Promise, das
   nie aufgeloest wird. Deshalb loesen submit, der Abbrechen-Knopf UND close aus
   — wer zuerst kommt, gewinnt; der Rest laeuft ins Leere. */
function settler() {
  let pending = null;
  return {
    arm(resolve) {
      if (pending) pending(null);      // haengengebliebenen Aufruf beenden
      pending = resolve;
    },
    settle(value) {
      const resolve = pending;
      pending = null;
      if (resolve) resolve(value);
    }
  };
}

const nameGate = settler();
const confirmGate = settler();

el.nameForm.addEventListener('submit', () => nameGate.settle(el.nameInput.value.trim()));
el.nameCancel.addEventListener('click', () => {
  el.nameDialog.close('cancel');
  nameGate.settle(null);
});
// Fallback fuer Escape, wo weder submit noch der Abbrechen-Knopf beteiligt ist.
el.nameDialog.addEventListener('close', () => {
  nameGate.settle(el.nameDialog.returnValue === 'ok' ? el.nameInput.value.trim() : null);
});

el.confirmForm.addEventListener('submit', () => confirmGate.settle(true));
el.confirmCancel.addEventListener('click', () => {
  el.confirmDialog.close('cancel');
  confirmGate.settle(false);
});
el.confirmDialog.addEventListener('close', () => {
  confirmGate.settle(el.confirmDialog.returnValue === 'ok');
});

function askName(labelText, preset, okText) {
  if (!hasDialog) {
    const answer = window.prompt(labelText, preset);
    return Promise.resolve(answer === null ? null : answer.trim());
  }
  return new Promise((resolve) => {
    nameGate.arm(resolve);
    el.nameLabel.textContent = labelText;
    el.nameInput.value = preset;
    el.nameOk.textContent = okText;
    el.nameDialog.returnValue = '';
    el.nameDialog.showModal();
    el.nameInput.select();
  });
}

function askConfirm(text) {
  if (!hasDialog) return Promise.resolve(window.confirm(text));
  return new Promise((resolve) => {
    confirmGate.arm(resolve);
    el.confirmText.textContent = text;
    el.confirmDialog.returnValue = '';
    el.confirmDialog.showModal();
  });
}

/* ----------------------------------------------------------- Archiv

   Gespeichert werden nur die Eingaben (Wegpunkte und Profil) plus die
   Kennzahlen zur Anzeige — nicht die berechnete Linie. Die wird beim Laden
   neu geholt. Das haelt den localStorage klein und die Route aktuell. */

function newId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function archive() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const tours = Array.isArray(data) ? data : (data && data.tours);
    return Array.isArray(tours) ? tours.filter(validTour).map(cleanTour) : [];
  } catch (err) {
    return [];
  }
}

function persist(tours) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ app: 'bikeRouteriOS', version: 1, tours }));
    return true;
  } catch (err) {
    setStatus('Speichern fehlgeschlagen — der lokale Speicher ist voll oder gesperrt. Sichere das Archiv als Datei.', true);
    return false;
  }
}

function validTour(t) {
  return !!t && typeof t === 'object'
    && typeof t.id === 'string' && t.id.length > 0
    && typeof t.name === 'string'
    && Array.isArray(t.waypoints) && t.waypoints.length >= 2
    && t.waypoints.every((p) => Array.isArray(p) && p.length >= 2
      && Number.isFinite(p[0]) && Number.isFinite(p[1])
      && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180);
}

/* Fremde oder aeltere Dateien duerfen den Zustand nicht verderben. */
function cleanTour(t) {
  const created = typeof t.created === 'string' && !Number.isNaN(Date.parse(t.created))
    ? t.created
    : new Date(0).toISOString();
  return {
    id: t.id,
    name: String(t.name).slice(0, 80) || 'Ohne Namen',
    created: created,
    profile: PROFILES.includes(t.profile) ? t.profile : 'fastbike-lowtraffic',
    waypoints: t.waypoints.map((p) => [Number(p[0]), Number(p[1])]),
    distance: Number.isFinite(t.distance) ? t.distance : null,
    ascend: Number.isFinite(t.ascend) ? t.ascend : null
  };
}

function sorted(tours) {
  return tours.slice().sort((a, b) => b.created.localeCompare(a.created));
}

function renderArchive() {
  const tours = sorted(archive());
  el.archiveLabel.textContent = `Archiv (${tours.length})`;
  el.archiveEmpty.hidden = tours.length > 0;
  el.tourList.textContent = '';
  tours.forEach((t) => el.tourList.appendChild(tourRow(t)));
}

function tourRow(t) {
  const li = document.createElement('li');
  li.className = 'tour';

  const name = document.createElement('div');
  name.className = 'tour-name';
  name.textContent = t.name;              // textContent, nie innerHTML — der Name kommt aus einer Datei

  const meta = document.createElement('div');
  meta.className = 'tour-meta';
  const bits = [new Date(t.created).toLocaleDateString('de-DE')];
  if (Number.isFinite(t.distance)) bits.push(km(t.distance));
  if (Number.isFinite(t.ascend)) bits.push(`${Math.round(t.ascend)} hm`);
  bits.push(t.profile);
  meta.textContent = bits.join(' · ');

  const actions = document.createElement('div');
  actions.className = 'tour-actions';
  actions.appendChild(action('Laden', () => loadTour(t)));
  actions.appendChild(action('Umbenennen', () => renameTour(t)));
  actions.appendChild(action('Löschen', () => deleteTour(t), 'danger'));

  li.append(name, meta, actions);
  return li;
}

function action(label, handler, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', handler);
  return b;
}

function defaultName() {
  const date = new Date().toLocaleDateString('de-DE');
  const dist = state.route && Number.isFinite(state.route.distance) ? ` · ${km(state.route.distance)}` : '';
  return `${date}${dist}`;
}

async function saveRoute() {
  if (!state.route) return;
  const preset = defaultName();
  const name = await askName('Name der Route', preset, 'Speichern');
  if (name === null) return;

  const tour = {
    id: newId(),
    name: name || preset,
    created: new Date().toISOString(),
    profile: state.route.profile,
    waypoints: state.waypoints.map((w) => {
      const p = w.marker.getLatLng();
      return [p.lat, p.lng];
    }),
    distance: state.route.distance,
    ascend: state.route.ascend
  };

  const tours = archive();
  tours.push(tour);
  if (persist(tours)) {
    renderArchive();
    setStatus(`„${tour.name}“ gespeichert.`);
  }
}

function loadTour(t) {
  clearWaypoints();
  t.waypoints.forEach((p) => addWaypoint(L.latLng(p[0], p[1])));
  el.profile.value = t.profile;
  setArchiveOpen(false);
  setStatus(`„${t.name}“ geladen — Route wird neu berechnet.`);
  calculate();
}

async function renameTour(t) {
  const name = await askName('Neuer Name', t.name, 'Umbenennen');
  if (name === null || name === '') return;
  const tours = archive();
  const i = tours.findIndex((x) => x.id === t.id);
  if (i === -1) return;
  tours[i].name = name;
  if (persist(tours)) {
    renderArchive();
    setStatus('Umbenannt.');
  }
}

async function deleteTour(t) {
  const ok = await askConfirm(`„${t.name}“ endgültig löschen?`);
  if (!ok) return;
  const tours = archive().filter((x) => x.id !== t.id);
  if (persist(tours)) {
    renderArchive();
    setStatus('Gelöscht.');
  }
}

/* --- Sicherung: iOS kann localStorage jederzeit verwerfen --- */

function exportArchive() {
  const tours = archive();
  if (tours.length === 0) {
    setStatus('Das Archiv ist leer — es gibt nichts zu sichern.', true);
    return;
  }
  const json = JSON.stringify({
    app: 'bikeRouteriOS',
    version: 1,
    exported: new Date().toISOString(),
    tours: tours
  }, null, 2);
  const file = new File([json], `${today()}_bikeRouteriOS-Archiv.json`, { type: 'application/json' });
  shareOrDownload(file, 'Archiv');       // synchron, damit die Geste gueltig bleibt
}

/* Zusammenfuehren, nicht ersetzen: vorhandene Eintraege bleiben unangetastet. */
function mergeTours(incoming) {
  const current = archive();
  const known = new Set(current.map((t) => t.id));
  let added = 0;
  let known_ = 0;
  let invalid = 0;

  incoming.forEach((t) => {
    if (!validTour(t)) { invalid++; return; }
    if (known.has(t.id)) { known_++; return; }
    current.push(cleanTour(t));
    known.add(t.id);
    added++;
  });

  return { tours: current, added: added, existing: known_, invalid: invalid };
}

async function importArchive(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.tours) ? data.tours : null);
    if (!incoming) throw new Error('Die Datei enthält kein bikeRouteriOS-Archiv.');

    const result = mergeTours(incoming);
    if (result.added > 0 && !persist(result.tours)) return;

    renderArchive();
    const parts = [`${result.added} neu`, `${result.existing} bereits vorhanden`];
    if (result.invalid > 0) parts.push(`${result.invalid} unbrauchbar`);
    setStatus(`Import: ${parts.join(', ')}.`, result.added === 0);
  } catch (err) {
    setStatus(`Import fehlgeschlagen: ${err.message}`, true);
  }
}

function setArchiveOpen(open) {
  el.archivePanel.hidden = !open;
  el.archiveToggle.setAttribute('aria-expanded', String(open));
  el.archiveToggle.classList.toggle('open', open);
}

/* ----------------------------------------------------------- Verdrahtung */

el.calc.addEventListener('click', calculate);
el.share.addEventListener('click', share);
el.save.addEventListener('click', saveRoute);
el.clear.addEventListener('click', clearWaypoints);

el.archiveToggle.addEventListener('click', () => {
  setArchiveOpen(el.archivePanel.hidden);
});

el.exportArchive.addEventListener('click', exportArchive);
el.importArchive.addEventListener('click', () => el.importFile.click());
el.importFile.addEventListener('change', async () => {
  const file = el.importFile.files && el.importFile.files[0];
  el.importFile.value = '';               // gleiche Datei soll erneut waehlbar sein
  if (file) await importArchive(file);
});

// Anderes Profil heisst andere Route — Ergebnis verwerfen, aber nicht
// automatisch neu rechnen (schont den gespendeten Server).
el.profile.addEventListener('change', () => {
  if (state.route) invalidate('Profil geändert — bitte neu berechnen.');
});

renderArchive();
syncButtons();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // updateViaCache: 'none' — das Worker-Skript nie aus dem HTTP-Cache nehmen,
    // sonst kann eine neue Version uebersehen werden.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(() => { /* ohne SW laeuft die App trotzdem */ });
  });
}
