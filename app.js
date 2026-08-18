'use strict';

/* bikeRouteriOS
   Karte, Wegpunkte, Sperrbereiche, Profile mit allen Parametern,
   Routenanalyse, GPX-Teilen, Tourenarchiv, Sicherung.

   Aufteilung siehe CLAUDE.md. Der Parameterkatalog liegt in params.js,
   erreichbar über window.BR. */

const BROUTER = 'https://brouter.de/brouter';
const TIMEOUT_MS = 40000;
const STORE_KEY = 'bikeRouteriOS.store.v2';
const OLD_KEY = 'bikeRouteriOS.archive.v1';
const SHOWN = 5;                 /* Profile in der Kurzauswahl */
const ABW_MAX = 2;               /* genannte Abweichungen je Tour */

const $ = function (s) { return document.querySelector(s); };

/* ============================================================ Speicher

   Ein einziger Datensatz für alles. Grund: Die Sicherung soll eine Datei
   sein, nicht drei. iOS darf den Speicher jederzeit räumen — deshalb gibt
   es den Export, und deshalb bitten wir unten um dauerhaften Speicher. */

const DEFAULT_STORE = {
  app: 'bikeRouteriOS', version: 2,
  active: 'stock:fastbike-lowtraffic',
  profiles: [],                  /* nur eigene; mitgelieferte entstehen zur Laufzeit */
  usage: {},                     /* id -> {used, n} */
  user: {},                      /* Fahrer & Rad, Abweichungen vom Standard */
  tours: [],
  lastBackup: null,
  tick: 1
};

let store = null;

function loadStore() {
  let s = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (err) { s = null; }

  if (!s || typeof s !== 'object') s = migrateOld();

  const out = {};
  Object.keys(DEFAULT_STORE).forEach(function (k) {
    out[k] = Object.prototype.hasOwnProperty.call(s, k) ? s[k] : DEFAULT_STORE[k];
  });
  if (!Array.isArray(out.profiles)) out.profiles = [];
  if (!Array.isArray(out.tours)) out.tours = [];
  if (!out.usage || typeof out.usage !== 'object') out.usage = {};
  if (!out.user || typeof out.user !== 'object') out.user = {};
  out.tours = out.tours.filter(validTour).map(repairTour);
  out.profiles = out.profiles
    .filter(function (p) {
      return p && typeof p.id === 'string' && typeof p.name === 'string';
    })
    .map(function (p) {
      /* Reparieren statt verwerfen: Ein Profil mit unbekanntem Basisprofil
         wegzuwerfen hiesse, dem Nutzer stillschweigend seine Arbeit zu
         löschen. Es bekommt das Standardprofil und behält seinen Namen. */
      if (!BR.isKnownBase(p.basis)) p.basis = BR.FALLBACK_BASE;
      if (!p.params || typeof p.params !== 'object') p.params = {};
      return p;
    });
  return out;
}

/* Altbestand aus der ersten Fassung übernehmen. Dort lag nur ein Tourenarchiv,
   und das Profil war ein blosser Servername. */
function migrateOld() {
  const s = JSON.parse(JSON.stringify(DEFAULT_STORE));
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return s;
    const data = JSON.parse(raw);
    const old = Array.isArray(data) ? data : (data && data.tours);
    if (!Array.isArray(old)) return s;
    old.forEach(function (t) {
      if (!t || !Array.isArray(t.waypoints) || t.waypoints.length < 2) return;
      const basis = BR.BASES[t.profile] ? t.profile : 'fastbike-lowtraffic';
      s.tours.push({
        id: newId(), name: String(t.name || 'Ohne Namen').slice(0, 60),
        created: t.created || new Date(0).toISOString(),
        waypoints: t.waypoints.map(function (p) { return [Number(p[0]), Number(p[1])]; }),
        nogos: [],
        basis: basis, profileName: BR.BASES[basis].label, params: {},
        distance: Number.isFinite(t.distance) ? t.distance : null,
        ascend: Number.isFinite(t.ascend) ? t.ascend : null,
        time: null
      });
    });
  } catch (err) { /* Altbestand unlesbar — dann eben ohne */ }
  return s;
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    toast('Speichern fehlgeschlagen — der Speicher ist voll oder gesperrt. Sichere die Daten als Datei.');
    return false;
  }
}

function newId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* ============================================================= Profile

   Ein Profil ist Basisprofil plus abweichende Werte. Mitgelieferte Profile
   sind virtuell — sie entstehen aus params.js und liegen nicht im Speicher.
   Sie zu bearbeiten erzeugt eine Kopie; das Original bleibt unberührt. */

function stockProfiles() {
  return Object.keys(BR.BASES).map(function (id) {
    return {
      id: 'stock:' + id, name: BR.BASES[id].label, eigen: false,
      basis: id, params: {}, hint: BR.BASES[id].hint
    };
  });
}

function allProfiles() {
  return stockProfiles().concat(store.profiles);
}

function byId(id) {
  const all = allProfiles();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return all.filter(function (p) { return p.id === 'stock:fastbike-lowtraffic'; })[0];
}

function activeProfile() { return byId(store.active); }

function usageOf(id) { return store.usage[id] || { used: 0, n: 0 }; }

function noteUse(id) {
  store.tick += 1;
  const u = usageOf(id);
  store.usage[id] = { used: store.tick, n: (u.n || 0) + 1 };
}

/* Rangfolge: nach letzter Benutzung, nie benutzte zuletzt, eigene davor.
   Das aktive Profil wird bewusst NICHT vorgezogen — sonst tauschten die
   Zeilen beim Antippen die Plätze. Siehe OFFENE-PUNKTE.md P7. */
function ranked() {
  return allProfiles().slice().sort(function (a, b) {
    const ua = usageOf(a.id), ub = usageOf(b.id);
    if (ua.used !== ub.used) return ub.used - ua.used;
    if (a.eigen !== b.eigen) return a.eigen ? -1 : 1;
    return a.name.localeCompare(b.name, 'de');
  });
}

/* Wert eines Parameters im Profil, sonst der Standard des Basisprofils. */
function pval(profile, paramId) {
  if (Object.prototype.hasOwnProperty.call(profile.params, paramId)) {
    return profile.params[paramId];
  }
  return BR.baseDefault(profile.basis, paramId);
}

/* Geht über den abgesicherten Weg im Katalog: Ein unbekanntes Basisprofil
   liefert die Parameter des Standardprofils, statt hier zu scheitern.
   Vorher stand hier ein direkter Zugriff auf BR.BASES[basis].groups — und
   ein einziger unbekannter Name brachte die ganze App zum Stillstand,
   ohne eine Meldung zu hinterlassen. */
function paramIds(basis) {
  return BR.baseParamIds(basis);
}

function deviations(profile) {
  return paramIds(profile.basis).filter(function (id) {
    return pval(profile, id) !== BR.baseDefault(profile.basis, id);
  });
}

/* ======================================================= Anfrage bauen

   Werte gehen als profile:<name>=<wert> mit. WAHRHEITSWERTE ALS 1/0 —
   true/false liefert HTTP 500 mit leerem Body und ist dann von jedem
   anderen Fehler ununterscheidbar. Siehe CLAUDE.md. */

function paramPairs(profile) {
  const out = [];
  paramIds(profile.basis).forEach(function (id) {
    const v = pval(profile, id);
    if (v === BR.baseDefault(profile.basis, id)) return;
    const def = BR.paramDef(id);
    out.push(['profile:' + def.key, encodeValue(v)]);
  });
  Object.keys(BR.USER_DEFS).forEach(function (k) {
    const v = Object.prototype.hasOwnProperty.call(store.user, k)
      ? store.user[k] : BR.USER_DEFS[k].def;
    if (v === BR.USER_DEFS[k].def) return;
    out.push(['profile:' + k, encodeValue(v)]);
  });
  return out;
}

function encodeValue(v) {
  if (v === true) return '1';
  if (v === false) return '0';
  return String(v);
}

function routeUrl(format, profile, pts, ngs) {
  const q = new URLSearchParams();
  q.set('lonlats', pts);
  q.set('profile', profile.basis);
  q.set('alternativeidx', '0');
  q.set('format', format);
  if (ngs) q.set('nogos', ngs);
  /* Für die Anzeige alle Tags anfordern. BRouter liefert sonst nur die Tags,
     die das Profil auch benutzt — `maxspeed` gehört nicht dazu, und ohne ihn
     bliebe die Tempo-Auswertung dauerhaft leer, ohne dass es auffiele.
     Beim GPX-Export nicht nötig; dort zählt nur die Strecke. */
  if (format === 'geojson') q.set('profile:processUnusedTags', '1');
  paramPairs(profile).forEach(function (p) { q.set(p[0], p[1]); });
  return BROUTER + '?' + q.toString();
}

/* =============================================================== Karte */

const state = {
  wps: [],        /* [{marker, flagged}] — die Koordinate lebt im Marker */
  nogos: [],      /* [{circle, dot, latlng, radius}] */
  line: null,
  pending: null,  /* Mittelpunkt eines Sperrbereichs, der noch keinen Rand hat */
  editIdx: null,  /* Sperrbereich, dessen Radius neu gesetzt wird */
  mode: 'point',
  stack: [],      /* 'wp' | 'nogo' — nur für Rückgängig */
  route: null,
  gpx: null,
  busy: false
};

/* Kein `tap: false` mehr: Die Option gibt es seit Leaflet 1.9 nicht mehr,
   und in älteren Fassungen war sie auf iOS eine bekannte Ursache dafür, dass
   Antippen nicht ankam. Eine Altlast auf einem Gerät, das ich nicht testen
   kann, ist die schlechteste Sorte. */
const map = L.map('map', { zoomControl: false }).setView([51.85, 10.30], 10);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

map.on('click', function (e) {
  if (map._popupOpen) return;
  onMapTap(e.latlng);
});
map.on('popupopen', function () { map._popupOpen = true; });
map.on('popupclose', function () {
  /* Ein Tap, der ein Popup schliesst, darf nicht nebenbei etwas setzen. */
  setTimeout(function () { map._popupOpen = false; }, 60);
});

function onMapTap(latlng) {
  if (state.mode === 'point') {
    addWaypoint(latlng);
    return;
  }
  if (!state.pending) {
    state.pending = L.marker(latlng, { icon: nogoIcon(true), interactive: false }).addTo(map);
    state.pending._ll = latlng;
    toast('Mittelpunkt gesetzt. Jetzt den Rand des Kreises antippen.');
    return;
  }
  const centre = state.pending._ll;
  const radius = Math.max(120, Math.round(centre.distanceTo(latlng)));
  map.removeLayer(state.pending);
  state.pending = null;

  if (state.editIdx !== null) {
    const n = state.nogos[state.editIdx];
    n.radius = radius;
    n.circle.setRadius(radius);
    n.circle.setStyle({ dashArray: '6 5', opacity: 1 });
    state.editIdx = null;
    invalidate('Radius auf ' + km(radius) + ' geändert — bitte neu berechnen.');
    return;
  }
  addNogo(centre, radius);
}

/* ------------------------------------------------------- Wegpunkte */

function wpIcon(i, total, flagged) {
  const kind = i === 0 ? ' wp--start' : (i === total - 1 ? ' wp--end' : '');
  const flag = flagged ? ' wp--flagged' : '';
  return L.divIcon({
    className: 'wp-hit',
    html: '<div class="wp' + kind + flag + '">' + (i + 1) + '</div>',
    iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -18]
  });
}

function addWaypoint(latlng) {
  const marker = L.marker(latlng, { draggable: true, autoPan: true }).addTo(map);
  marker.on('dragend', function () {
    invalidate('Wegpunkt verschoben — bitte neu berechnen.');
  });
  marker.on('click', function (ev) {
    L.DomEvent.stopPropagation(ev);
    openWpMenu(marker);
  });
  state.wps.push({ marker: marker, flagged: false });
  renumber();
  invalidate();
}

function openWpMenu(marker) {
  const i = state.wps.findIndex(function (w) { return w.marker === marker; });
  if (i === -1) return;
  const role = i === 0 ? 'Start' : (i === state.wps.length - 1 ? 'Ziel' : 'Zwischenpunkt');
  const box = popBox(role + ' · Punkt ' + (i + 1), [
    ['Punkt löschen', function () {
      map.closePopup();
      removeWaypoint(marker);
    }, 'del']
  ]);
  marker.bindPopup(box, { closeButton: false, autoPan: true }).openPopup();
}

function removeWaypoint(marker) {
  const i = state.wps.findIndex(function (w) { return w.marker === marker; });
  if (i === -1) return;
  map.removeLayer(marker);
  state.wps.splice(i, 1);
  dropFromStack('wp');
  renumber();
  invalidate('Wegpunkt entfernt — bitte neu berechnen.');
}

function renumber() {
  const n = state.wps.length;
  state.wps.forEach(function (w, i) { w.marker.setIcon(wpIcon(i, n, w.flagged)); });
}

function flagAll() {
  state.wps.forEach(function (w) { w.flagged = true; });
  renumber();
}

function clearFlags() {
  if (!state.wps.some(function (w) { return w.flagged; })) return;
  state.wps.forEach(function (w) { w.flagged = false; });
  renumber();
}

/* ----------------------------------------------------- Sperrbereiche

   Der Mittelpunkt bleibt sichtbar und ist das Ziel zum Antippen. Wäre die
   Kreisfläche antippbar, schluckte ein grosser Sperrbereich jeden Tap auf
   die Karte darunter — dort liesse sich kein Wegpunkt mehr setzen. */

function nogoIcon(pending) {
  return L.divIcon({
    className: 'nogo-hit',
    html: '<div class="nogo-dot' + (pending ? ' pending' : '') + '"></div>',
    iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -12]
  });
}

function addNogo(latlng, radius) {
  const circle = L.circle(latlng, {
    radius: radius, color: '#96502E', weight: 2, dashArray: '6 5',
    fillColor: '#96502E', fillOpacity: 0.16, interactive: false
  }).addTo(map);
  const dot = L.marker(latlng, { icon: nogoIcon(false) }).addTo(map);
  const entry = { circle: circle, dot: dot, latlng: latlng, radius: radius };
  dot.on('click', function (ev) {
    L.DomEvent.stopPropagation(ev);
    openNogoMenu(entry);
  });
  state.nogos.push(entry);
  state.stack.push('nogo');
  invalidate('Sperrbereich mit ' + km(radius) + ' Radius angelegt — bitte neu berechnen.');
}

function openNogoMenu(entry) {
  const i = state.nogos.indexOf(entry);
  if (i === -1) return;
  const box = popBox('Sperrbereich · ' + km(entry.radius), [
    ['Radius ändern', function () {
      map.closePopup();
      state.editIdx = i;
      entry.circle.setStyle({ dashArray: '2 6', opacity: 0.6 });
      state.pending = L.marker(entry.latlng, { icon: nogoIcon(true), interactive: false }).addTo(map);
      state.pending._ll = entry.latlng;
      setMode('nogo', true);
      toast('Neuen Rand antippen — der Mittelpunkt bleibt.');
    }],
    ['Sperrbereich löschen', function () {
      map.closePopup();
      removeNogo(entry);
    }, 'del']
  ]);
  entry.dot.bindPopup(box, { closeButton: false, autoPan: true }).openPopup();
}

function removeNogo(entry) {
  const i = state.nogos.indexOf(entry);
  if (i === -1) return;
  map.removeLayer(entry.circle);
  map.removeLayer(entry.dot);
  state.nogos.splice(i, 1);
  dropFromStack('nogo');
  invalidate('Sperrbereich entfernt — bitte neu berechnen.');
}

/* Rückgängig darf später nichts zurücknehmen, das schon weg ist. */
function dropFromStack(kind) {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    if (state.stack[i] === kind) { state.stack.splice(i, 1); return; }
  }
}

function popBox(head, actions) {
  const d = document.createElement('div');
  d.className = 'pop';
  const h = document.createElement('div');
  h.className = 'ph'; h.textContent = head;
  d.appendChild(h);
  actions.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = a[0];
    if (a[2]) b.className = a[2];
    b.addEventListener('click', a[1]);
    d.appendChild(b);
  });
  return d;
}

/* --------------------------------------------------------- Werkzeuge */

function setMode(m, quiet) {
  if (!quiet) {
    if (state.editIdx !== null) {
      state.nogos[state.editIdx].circle.setStyle({ dashArray: '6 5', opacity: 1 });
      state.editIdx = null;
    }
    if (state.pending) { map.removeLayer(state.pending); state.pending = null; }
  }
  state.mode = m;
  $('#mPoint').classList.toggle('on', m === 'point');
  $('#mPoint').setAttribute('aria-pressed', m === 'point' ? 'true' : 'false');
  $('#mNogo').classList.toggle('on', m === 'nogo');
  $('#mNogo').setAttribute('aria-pressed', m === 'nogo' ? 'true' : 'false');
  if (quiet) return;
  toast(m === 'point'
    ? 'Tippen auf die Karte setzt einen Wegpunkt.'
    : 'Sperrbereich: erst den Mittelpunkt, dann den Rand antippen.');
}

function undo() {
  if (state.editIdx !== null) {
    state.nogos[state.editIdx].circle.setStyle({ dashArray: '6 5', opacity: 1 });
    state.editIdx = null;
    if (state.pending) { map.removeLayer(state.pending); state.pending = null; }
    toast('Radius unverändert gelassen.');
    return;
  }
  if (state.pending) {
    map.removeLayer(state.pending); state.pending = null;
    toast('Mittelpunkt verworfen.');
    return;
  }
  const last = state.stack.pop();
  if (last === 'nogo' && state.nogos.length) {
    const e = state.nogos[state.nogos.length - 1];
    map.removeLayer(e.circle); map.removeLayer(e.dot);
    state.nogos.pop();
    invalidate('Sperrbereich entfernt.');
    return;
  }
  if (state.wps.length) {
    const w = state.wps[state.wps.length - 1];
    map.removeLayer(w.marker);
    state.wps.pop();
    renumber();
    invalidate('Wegpunkt entfernt.');
    return;
  }
  toast('Nichts mehr zurückzunehmen.');
}

function locate() {
  if (!navigator.geolocation) {
    toast('Dieses Gerät gibt den Standort nicht her.');
    return;
  }
  toast('Standort wird bestimmt …');
  navigator.geolocation.getCurrentPosition(function (pos) {
    map.setView([pos.coords.latitude, pos.coords.longitude], 14);
    toast('Auf deinen Standort zentriert.');
  }, function (err) {
    toast(err && err.code === 1
      ? 'Standort nicht freigegeben — in den Einstellungen erlauben.'
      : 'Standort konnte nicht bestimmt werden.');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}

function clearRoute() {
  if (state.line) { map.removeLayer(state.line); state.line = null; }
  state.route = null;
  state.gpx = null;
  $('#readout').hidden = true;
  $('#analysis').hidden = true;
}

function invalidate(msg) {
  clearRoute();
  clearFlags();
  syncButtons();
  setStatus(msg || defaultHint());
}

function defaultHint() {
  const n = state.wps.length;
  if (n === 0) return 'Tippe auf die Karte, um den Start zu setzen.';
  if (n === 1) return '1 Punkt — mindestens ein zweiter wird gebraucht.';
  const ng = state.nogos.length;
  const ngTxt = ng === 0 ? '' : (ng === 1 ? ', 1 Sperrbereich' : ', ' + ng + ' Sperrbereiche');
  return n + ' Punkte' + ngTxt + ' — bereit zum Berechnen.';
}

/* ============================================================ Routing */

function lonlats() {
  return state.wps.map(function (w) {
    const p = w.marker.getLatLng();
    /* BRouter erwartet lon,lat — nicht lat,lon. */
    return p.lng.toFixed(6) + ',' + p.lat.toFixed(6);
  }).join('|');
}

function nogoParam() {
  if (!state.nogos.length) return '';
  return state.nogos.map(function (n) {
    return n.latlng.lng.toFixed(6) + ',' + n.latlng.lat.toFixed(6) + ',' + Math.round(n.radius);
  }).join('|');
}

/* BRouter trennt seine Fehlerfälle NICHT über den Statuscode. Die drei
   häufigen Fälle kommen als HTTP 400 mit text/plain-Body, ein ungültiger
   Parameterwert als HTTP 500 mit leerem Body. Ausgewertet wird der Body. */
function explain(status, body) {
  const b = body.toLowerCase();
  if (b.indexOf('no track found') !== -1) {
    return {
      text: 'Kein Weg gefunden. Meist liegt ein Wegpunkt zu weit von einer erfassten Straße entfernt — verschiebe ihn näher an einen Weg. Welcher Punkt es ist, meldet der Server nicht, deshalb sind alle hervorgehoben.',
      flag: true
    };
  }
  /* Zwei Schreibweisen für denselben Sachverhalt, beide am 18.08.2026 gesehen:
     „datafile <name>.rd5 not found" und „to-position not mapped in existing
     datafile". Wer nur auf die erste prüft, gibt beim zweiten eine nichtssagende
     Meldung aus. */
  if (b.indexOf('datafile') !== -1) {
    const which = b.indexOf('to-position') !== -1 ? 'Der Zielpunkt liegt'
      : (b.indexOf('from-position') !== -1 ? 'Der Startpunkt liegt'
         : 'Mindestens ein Punkt liegt');
    return { text: which + ' außerhalb der abgedeckten Kartenregion — dort gibt es keine Daten zum Rechnen.' };
  }
  /* Zwei verschiedene Sachverhalte, gleiche Meldung — unterschieden nur an
     der Sekundenzahl. „after 0 seconds" heisst: Der Server hat gar nicht erst
     gerechnet, sondern gedrosselt, weil kurz zuvor schon eine Anfrage von
     derselben Adresse lief. Gemessen am 18.08.2026 beim Testen: Dieselbe
     Anfrage lief kurz darauf fehlerfrei durch. Wer hier „zu weit auseinander"
     ausgibt, schickt den Nutzer seine Wegpunkte umbauen, obwohl nichts an
     ihnen falsch ist. */
  if (b.indexOf('watchdog') !== -1) {
    if (/after 0 seconds/.test(b)) {
      return { text: 'Der Routing-Server hat die Anfrage sofort abgewiesen — meist, weil kurz zuvor schon eine lief. Kurz warten und noch einmal berechnen.' };
    }
    return { text: 'Der Server hat die Berechnung abgebrochen, weil sie zu lange gedauert hat. Meist liegen die Punkte zu weit auseinander.' };
  }
  if (status >= 500) {
    return { text: 'Der Routing-Server hat einen internen Fehler gemeldet. Wenn das nach einer Profiländerung auftritt, liegt es vermutlich an einem Wert im Profil.' };
  }
  return { text: 'Der Server antwortete mit Fehler ' + status + '.' };
}

function routeError(text, flag) {
  const err = new Error(text);
  err.flagWaypoints = !!flag;
  return err;
}

/* Ein GET ohne eigene Header bleibt ein CORS-simple-request ohne Preflight. */
async function request(target) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(function () { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);
  let res;
  try {
    res = await fetch(target, { signal: ctrl.signal });
  } catch (err) {
    throw routeError(timedOut
      ? 'Der Routing-Server antwortet nicht (Zeitüberschreitung).'
      : 'Keine Verbindung zum Routing-Server. Ist das Gerät online?');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const body = (await res.text().catch(function () { return ''; })).trim();
    const info = explain(res.status, body);
    throw routeError(body ? info.text + ' (Server: ' + body + ')' : info.text, info.flag);
  }
  return res;
}

async function calculate(override) {
  if (state.wps.length < 2 || state.busy) return;
  /* Nur ein echtes Profil zaehlt als Ueberschreibung. Alles andere — etwa
     ein versehentlich durchgereichtes Event — wird ignoriert, statt als
     Profil weiterverarbeitet zu werden. */
  const ok = override && typeof override === 'object' && typeof override.basis === 'string';
  const profile = ok ? override : activeProfile();
  const pts = lonlats();
  const ngs = nogoParam();

  state.busy = true;
  syncButtons();
  $('#calcBtn').textContent = 'Berechne …';
  setStatus('Route wird berechnet …', 'busy');

  try {
    const res = await request(routeUrl('geojson', profile, pts, ngs));
    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw routeError('Die Antwort des Servers war kein gültiges GeoJSON.');
    }
    const feat = data && data.features && data.features[0];
    const coords = feat && feat.geometry && feat.geometry.coordinates;
    if (!coords || coords.length < 2) {
      throw routeError('Zwischen diesen Punkten wurde keine Route gefunden.');
    }
    draw(coords);
    const figures = showFigures(feat.properties || {}, coords);
    state.route = {
      pts: pts, ngs: ngs, basis: profile.basis,
      profileId: profile.id, profileName: profile.name,
      params: snapshotParams(profile),
      distance: figures.distance, ascend: figures.ascend, time: figures.time
    };
    state.gpx = null;
    setStatus('Route berechnet.');
    if (!ok) { noteUse(profile.id); persist(); }
  } catch (err) {
    clearRoute();
    clearFlags();
    if (err.flagWaypoints) flagAll();
    setStatus(err.message, 'error');
  } finally {
    state.busy = false;
    $('#calcBtn').textContent = 'Route berechnen';
    syncButtons();
  }
}

/* Momentaufnahme aller wirksamen Werte — nicht nur der Abweichungen.
   Eine Tour muss auch dann noch stimmen, wenn das Profil sich später ändert. */
function snapshotParams(profile) {
  const out = {};
  paramIds(profile.basis).forEach(function (id) { out[id] = pval(profile, id); });
  return out;
}

function draw(coords) {
  if (state.line) map.removeLayer(state.line);
  const latlngs = coords.map(function (c) { return [c[1], c[0]]; });
  const css = getComputedStyle(document.documentElement);
  state.line = L.polyline(latlngs, {
    color: css.getPropertyValue('--signal').trim() || '#DC4514',
    weight: 5, opacity: 0.95, lineJoin: 'round', lineCap: 'round'
  }).addTo(map);
  fitRoute();
}

/* Die Karte reicht unter das Blatt und unter die Kopfleiste. Ein gleichmäßiger
   Rand würde Start und Ziel darunter schieben — man sähe seine eigene Route
   nicht ganz. Deshalb oben und unten so viel Rand, wie tatsächlich verdeckt ist. */
function fitRoute() {
  if (!state.line) return;
  const sh = $('#sheet').getBoundingClientRect().height;
  map.fitBounds(state.line.getBounds(), {
    paddingTopLeft: [30, 78],
    paddingBottomRight: [30, Math.round(sh) + 18]
  });
}

/* ============================================================ Analyse

   Alles Nötige steckt bereits in der GeoJSON-Antwort: Höhe an jeder
   Koordinate, dazu eine Tabelle `messages` mit Länge und OSM-Tags je
   Wegabschnitt. Kein zweiter Dienst nötig. Siehe BROUTER.md. */

const SURFACE_DE = {
  asphalt: ['Asphalt', '--slate'], concrete: ['Beton', '--slate'],
  paved: ['Befestigt', '--slate'], paving_stones: ['Pflastersteine', '--slate'],
  sett: ['Kopfsteinpflaster', '--ochre'], cobblestone: ['Kopfsteinpflaster', '--ochre'],
  unhewn_cobblestone: ['Kopfsteinpflaster', '--ochre'],
  compacted: ['Wassergebundene Decke', '--ochre'],
  fine_gravel: ['Feinschotter', '--ochre'], gravel: ['Schotter', '--sienna'],
  pebblestone: ['Kies', '--sienna'], ground: ['Naturboden', '--sienna'],
  dirt: ['Naturboden', '--sienna'], earth: ['Naturboden', '--sienna'],
  grass: ['Gras', '--sienna'], sand: ['Sand', '--sienna'],
  wood: ['Holz', '--sienna'], metal: ['Metall', '--sienna']
};
const PAVED = ['asphalt', 'concrete', 'paved', 'paving_stones', 'sett',
               'cobblestone', 'unhewn_cobblestone', 'compacted'];

const HIGHWAY_DE = {
  motorway: ['Autobahn', '--sienna'], trunk: ['Kraftfahrstraße', '--sienna'],
  primary: ['Bundes-/Hauptstraße', '--sienna'], secondary: ['Landstraße', '--ochre'],
  tertiary: ['Kreisstraße', '--ochre'], unclassified: ['Nebenstraße', '--slate'],
  residential: ['Wohnstraße', '--slate'], living_street: ['Verkehrsberuhigt', '--slate'],
  service: ['Zufahrt', '--slate'], track: ['Wirtschaftsweg', '--good'],
  cycleway: ['Radweg', '--good'], path: ['Pfad', '--good'],
  footway: ['Fußweg', '--good'], bridleway: ['Reitweg', '--good'],
  pedestrian: ['Fußgängerzone', '--good'], steps: ['Treppe', '--sienna'],
  road: ['Unbestimmt', '--faint']
};
const MAIN_ROADS = ['motorway', 'trunk', 'primary', 'secondary',
                    'motorway_link', 'trunk_link', 'primary_link', 'secondary_link'];
const FAST_LIMITS = ['70', '80', '90', '100', '110', '120', '130'];

function baseTag(v) { return String(v).split('_link')[0]; }

function parseTags(s) {
  const out = {};
  String(s).split(' ').forEach(function (kv) {
    const i = kv.indexOf('=');
    if (i > 0) out[kv.slice(0, i)] = kv.slice(i + 1);
  });
  return out;
}

function analyse(props) {
  const msgs = props.messages;
  if (!Array.isArray(msgs) || msgs.length < 2) return null;
  const hdr = msgs[0];
  const iDist = hdr.indexOf('Distance'), iTags = hdr.indexOf('WayTags');
  if (iDist < 0 || iTags < 0) return null;

  const surf = {}, road = {};
  let total = 0, paved = 0, main = 0, fast = 0;
  for (let i = 1; i < msgs.length; i++) {
    const row = msgs[i];
    const d = parseInt(row[iDist], 10);
    if (!Number.isFinite(d)) continue;
    const t = parseTags(row[iTags]);
    total += d;

    const s = t.surface || (t.smoothness ? 'paved' : '(unbekannt)');
    surf[s] = (surf[s] || 0) + d;
    if (PAVED.indexOf(s) !== -1) paved += d;

    const h = t.highway || 'road';
    road[h] = (road[h] || 0) + d;
    if (MAIN_ROADS.indexOf(h) !== -1) main += d;
    if (t.maxspeed && FAST_LIMITS.indexOf(t.maxspeed) !== -1) fast += d;
  }
  if (!total) return null;
  return {
    total: total,
    surface: bucket(surf, total, SURFACE_DE),
    road: bucket(road, total, HIGHWAY_DE),
    pavedPct: 100 * paved / total,
    mainPct: 100 * main / total,
    fastPct: 100 * fast / total
  };
}

/* Gleichbedeutende Werte zusammenfassen und nach Anteil sortieren.
   Alles unter 1 % landet in einer Sammelzeile — sonst wird die Legende
   von Splittern beherrscht. */
function bucket(raw, total, dict) {
  const merged = {};
  Object.keys(raw).forEach(function (k) {
    const e = dict[baseTag(k)];
    const label = e ? e[0] : (k === '(unbekannt)' ? 'Nicht erfasst' : k);
    const col = e ? e[1] : '--faint';
    if (!merged[label]) merged[label] = { label: label, col: col, m: 0 };
    merged[label].m += raw[k];
  });
  const list = Object.keys(merged).map(function (k) { return merged[k]; });
  list.sort(function (a, b) { return b.m - a.m; });
  const out = [];
  let rest = 0;
  list.forEach(function (e) {
    const pct = 100 * e.m / total;
    if (pct < 1 && out.length >= 3) { rest += e.m; return; }
    out.push({ label: e.label, col: e.col, pct: pct });
  });
  if (rest > 0) out.push({ label: 'Sonstiges', col: '--faint', pct: 100 * rest / total });
  return out;
}

function showFigures(props, coords) {
  const metres = Number(props['track-length']);
  const ascend = Number(props['filtered ascend']);
  const secs = Number(props['total-time']);

  $('#rDist').innerHTML = Number.isFinite(metres)
    ? (metres / 1000).toFixed(1).replace('.', ',') + '<small>km</small>' : '–';
  $('#rAsc').innerHTML = Number.isFinite(ascend)
    ? Math.round(ascend) + '<small>hm</small>' : '–';
  $('#rTime').innerHTML = Number.isFinite(secs) ? hhmm(secs) + '<small>h</small>' : '–';
  $('#readout').hidden = false;

  drawElevation(coords, metres);
  const a = analyse(props);
  if (a) {
    fillBar('#barSurface', '#legSurface', a.surface);
    fillBar('#barRoad', '#legRoad', a.road);
    $('#surfSum').textContent = a.pavedPct.toFixed(1).replace('.', ',') + ' % befestigt';
    $('#roadSum').textContent = a.mainPct.toFixed(1).replace('.', ',') + ' % Hauptstraße';
    const flag = $('#fastFlag');
    if (a.fastPct >= 3) {
      $('#fastPct').textContent = a.fastPct.toFixed(1).replace('.', ',') + ' %';
      $('#fastText').innerHTML = 'der Strecke liegt auf Straßen mit <b>Tempo 70 oder mehr</b>. ' +
        'Der Regler „Autoverkehr meiden“ bewertet das nicht — er kennt nur die Verkehrsschätzung.';
      flag.hidden = false;
    } else {
      flag.hidden = true;
    }
    $('#analysis').hidden = false;
  } else {
    $('#analysis').hidden = true;
  }

  return {
    distance: Number.isFinite(metres) ? metres : null,
    ascend: Number.isFinite(ascend) ? ascend : null,
    time: Number.isFinite(secs) ? secs : null
  };
}

function fillBar(barSel, legSel, data) {
  const bar = $(barSel), leg = $(legSel);
  bar.textContent = ''; leg.textContent = '';
  data.forEach(function (d) {
    const i = document.createElement('i');
    i.style.width = d.pct + '%';
    i.style.background = 'var(' + d.col + ')';
    bar.appendChild(i);
    const row = document.createElement('div');
    const sw = document.createElement('span');
    sw.className = 'swatch'; sw.style.background = 'var(' + d.col + ')';
    const lb = document.createElement('span');
    lb.className = 'lbl'; lb.textContent = d.label;
    const pc = document.createElement('span');
    pc.className = 'pct'; pc.textContent = d.pct.toFixed(1).replace('.', ',') + ' %';
    row.append(sw, lb, pc);
    leg.appendChild(row);
  });
}

function drawElevation(coords, metres) {
  const svg = $('#elev');
  const ele = [];
  const step = Math.max(1, Math.floor(coords.length / 120));
  for (let i = 0; i < coords.length; i += step) {
    const v = Number(coords[i][2]);
    if (Number.isFinite(v)) ele.push(v);
  }
  if (ele.length < 2) { svg.innerHTML = ''; return; }

  /* Tiefster und höchster Punkt aus ALLEN Koordinaten, nicht nur aus den
     gezeichneten Stützstellen. Sonst weicht die angezeigte Spanne von der
     tatsächlichen ab — beim Test 237–878 statt 238–881. */
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < coords.length; i++) {
    const v = Number(coords[i][2]);
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { svg.innerHTML = ''; return; }
  const pad = Math.max(20, (hi - lo) * 0.12);
  const a = lo - pad, b = hi + pad;
  const W = 340, H = 104;
  const pts = ele.map(function (e, i) {
    return [i / (ele.length - 1) * W, H - 4 - ((e - a) / (b - a)) * (H - 16)];
  });
  const d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');

  let grid = '';
  gridLines(lo, hi).forEach(function (v) {
    const y = H - 4 - ((v - a) / (b - a)) * (H - 16);
    grid += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) +
            '" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/>' +
            '<text class="axis" x="2" y="' + (y - 3).toFixed(1) + '">' + v + '</text>';
  });
  const pk = pts[Math.max(0, ele.indexOf(Math.max.apply(null, ele)))];

  svg.innerHTML =
    '<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--signal)" stop-opacity=".30"/>' +
    '<stop offset="100%" stop-color="var(--signal)" stop-opacity="0"/>' +
    '</linearGradient></defs>' + grid +
    '<path d="' + d + 'L' + W + ' ' + H + 'L0 ' + H + 'Z" fill="url(#eg)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--signal)" stroke-width="1.9" ' +
    'stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + pk[0].toFixed(1) + '" cy="' + pk[1].toFixed(1) +
    '" r="3" fill="var(--signal)" stroke="var(--sheet)" stroke-width="1.6"/>';
  svg.setAttribute('aria-label', 'Höhenprofil von ' + Math.round(lo) + ' bis ' + Math.round(hi) + ' Metern');

  $('#eleRange').textContent = Math.round(lo) + ' – ' + Math.round(hi) + ' m';
  if (Number.isFinite(metres)) {
    $('#eleMid').textContent = (metres / 2000).toFixed(1).replace('.', ',') + ' km';
    $('#eleEnd').textContent = (metres / 1000).toFixed(1).replace('.', ',') + ' km';
  }
}

function gridLines(lo, hi) {
  const span = hi - lo;
  const step = span > 900 ? 250 : span > 400 ? 100 : span > 150 ? 50 : 20;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out.slice(0, 5);
}

/* ============================================================= Teilen */

function today() {
  const d = new Date();
  const p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* Muss synchron aus der Tap-Behandlung laufen: navigator.share() verlangt
   eine frische Nutzergeste. Deshalb hier kein await davor. */
function shareOrDownload(file, what) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] })
      .then(function () { toast(what + ' geteilt.'); })
      .catch(function (err) {
        if (err && err.name === 'AbortError') { toast('Teilen abgebrochen.'); return; }
        download(file);
        toast('Share-Sheet nicht verfügbar — ' + what + ' wurde heruntergeladen.');
      });
    return;
  }
  download(file);
  toast('Teilen wird hier nicht unterstützt — ' + what + ' wurde heruntergeladen.');
}

function download(file) {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(href); }, 10000);
}

async function share() {
  if (!state.route || state.busy) return;
  if (state.gpx) { shareOrDownload(state.gpx, 'GPX'); return; }

  state.busy = true; syncButtons();
  setStatus('GPX wird geholt …', 'busy');
  try {
    const prof = { basis: state.route.basis, params: state.route.params };
    const res = await request(routeUrl('gpx', prof, state.route.pts, state.route.ngs));
    const blob = await res.blob();
    state.gpx = new File([blob], today() + '_Route.gpx', { type: 'application/gpx+xml' });
    setStatus('GPX bereit.');
    shareOrDownload(state.gpx, 'GPX');
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    state.busy = false; syncButtons();
  }
}

/* ========================================================== Bedienung */

function km(m) {
  return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m';
}
function hhmm(secs) {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
  return h + ':' + String(m).padStart(2, '0');
}
function dateDE(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('de-DE');
}

let toastT = null;
function toast(msg) {
  const t = $('#toast');
  t.style.bottom = ($('#sheet').getBoundingClientRect().height + 14) + 'px';
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

function syncButtons() {
  $('#calcBtn').disabled = state.busy || state.wps.length < 2;
  $('#shareBtn').disabled = state.busy || !state.route;
  $('#saveBtn').disabled = state.busy || !state.route;
}

/* ------------------------------------------------------ Blatt-Rasten */

const DETENTS = ['peek', 'half', 'full'];
let detent = 0;

function setDetent(i) {
  detent = (i + DETENTS.length) % DETENTS.length;
  $('#sheet').setAttribute('data-detent', DETENTS[detent]);
  positionRail();
  afterSheetSettled(function () {
    map.invalidateSize({ pan: false });
    positionRail();
    /* In der grossen Raste bleibt zu wenig Karte, um sinnvoll nachzuziehen. */
    if (DETENTS[detent] !== 'full') fitRoute();
  });
}

/* Auf das Ende der Blatt-Animation warten, nicht auf eine geschätzte Zeit.
   Mit einem festen Zeitgeber gewann mal die Animation, mal der Zeitgeber —
   und im zweiten Fall rechnete fitRoute mit der alten Blatthöhe, wodurch die
   Route teilweise unter dem Blatt lag. Der Zeitgeber bleibt als Rückfall,
   falls transitionend nicht feuert (etwa bei reduzierter Bewegung). */
function afterSheetSettled(fn) {
  const sheet = $('#sheet');
  let done = false;
  const run = function () {
    if (done) return;
    done = true;
    sheet.removeEventListener('transitionend', onEnd);
    fn();
  };
  const onEnd = function (e) { if (e.propertyName === 'height') run(); };
  sheet.addEventListener('transitionend', onEnd);
  setTimeout(run, 480);
}

/* Die Leiste sitzt immer ÜBER dem Blatt. In der vollen Raste ist von der
   Karte nichts mehr zu sehen — dann verschwindet sie ganz.

   Hier stand vorher eine Deckelung auf 52 % der Fensterhöhe, die verhindern
   sollte, dass die Leiste zu weit nach oben wandert. Sie bewirkte das
   Gegenteil: Bei der mittleren Raste ist das Blatt 58 % hoch, die Deckelung
   griff bei 52 % — und schob die Leiste unter das Blatt. Der unterste Knopf
   war damit unerreichbar. Wer nach oben begrenzen will, muss die Leiste
   ausblenden, nicht tiefer setzen. */
function positionRail() {
  const sh = $('#sheet').getBoundingClientRect().height;
  const rail = $('#rail');
  const height = rail.getBoundingClientRect().height || 200;
  const bottom = sh + 14;
  /* Bliebe oben kein Platz mehr, hilft Verschieben nicht — dann ausblenden. */
  const passtNicht = window.innerHeight - bottom - height < 70;
  rail.classList.toggle('hidden', DETENTS[detent] === 'full' || passtNicht);
  rail.style.bottom = bottom + 'px';
}

/* ------------------------------------------------------------ Ebenen

   Der z-index wird beim Öffnen vergeben, aufsteigend. Ein fester Wert je
   Ebene reicht nicht, sobald zwei gleichzeitig offen sein können — dann
   entschiede die Reihenfolge im Markup, welche obenauf liegt. */

let topZ = 70;
const SHEETS = ['profiles', 'menu', 'savedlg', 'namedlg', 'confirmdlg'];

function open(id) {
  const e = $('#' + id);
  e.style.zIndex = ++topZ;
  e.classList.add('open');
}
function close(id) { $('#' + id).classList.remove('open'); }

/* Immer hierüber öffnen, nie Abdunkler und Blatt einzeln: Die Reihenfolge
   der beiden Aufrufe entscheidet, ob der Abdunkler unter oder über dem
   Blatt liegt. Liegt er darüber, ist das Blatt grau und tot. */
function openSheet(id) {
  SHEETS.forEach(function (x) { if (x !== id) close(x); });
  if (DETENTS[detent] !== 'peek') setDetent(0);
  open('scrim');
  open(id);
}

function closeSheets() {
  SHEETS.forEach(close);
  close('scrim');
}

/* --------------------------------------------------------- Dialoge */

let namePending = null, confirmPending = null;

function askName(head, hint, preset, okText) {
  return new Promise(function (resolve) {
    namePending = resolve;
    $('#nameHead').textContent = head;
    $('#nameHint').textContent = hint || '';
    $('#nameHint').hidden = !hint;
    $('#nameInput').value = preset || '';
    $('#nameOk').textContent = okText || 'Speichern';
    openSheet('namedlg');
    setTimeout(function () { $('#nameInput').select(); }, 320);
  });
}
function settleName(v) {
  const r = namePending; namePending = null;
  close('namedlg'); close('scrim');
  if (r) r(v);
}

function askConfirm(head, text, okText) {
  return new Promise(function (resolve) {
    confirmPending = resolve;
    $('#confirmHead').textContent = head;
    $('#confirmText').textContent = text;
    $('#confirmOk').textContent = okText || 'Löschen';
    openSheet('confirmdlg');
  });
}
function settleConfirm(v) {
  const r = confirmPending; confirmPending = null;
  close('confirmdlg'); close('scrim');
  if (r) r(v);
}

/* ================================================= Parameter zeichnen */

function paramRow(def, get, set) {
  const el = document.createElement('div');
  el.className = 'param';
  const top = document.createElement('div');
  top.className = 'ptop';
  const nm = document.createElement('div');
  nm.className = 'pname';
  const b = document.createElement('b'); b.textContent = def.name;
  const k = document.createElement('span'); k.className = 'key'; k.textContent = def.key;
  nm.append(b, k);
  top.appendChild(nm);

  const desc = document.createElement('p');
  desc.className = 'pdesc'; desc.textContent = def.desc;

  if (def.type === 'switch') {
    const sw = document.createElement('span');
    sw.className = 'sw'; sw.setAttribute('role', 'switch');
    sw.setAttribute('tabindex', '0');
    sw.setAttribute('aria-label', def.name);
    sw.setAttribute('aria-checked', get() ? 'true' : 'false');
    const tog = function () {
      const v = !(sw.getAttribute('aria-checked') === 'true');
      sw.setAttribute('aria-checked', v ? 'true' : 'false');
      set(v);
    };
    sw.addEventListener('click', tog);
    sw.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); }
    });
    top.appendChild(sw);
    el.append(top, desc);
    return el;
  }

  if (def.type === 'choice') {
    el.append(top, desc);
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', def.name);
    def.opts.forEach(function (o) {
      const op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      if (String(get()) === o[0]) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () { set(this.value); });
    el.appendChild(sel);
    return el;
  }

  const val = document.createElement('span');
  val.className = 'pval'; val.textContent = def.fmt(get());
  top.appendChild(val);
  el.append(top, desc);

  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = def.min; inp.max = def.max; inp.step = def.step;
  inp.value = get();
  inp.setAttribute('aria-label', def.name);
  inp.addEventListener('input', function () {
    const v = Number(this.value);
    val.textContent = def.fmt(v);
    set(v);
  });
  el.appendChild(inp);

  const sc = document.createElement('div');
  sc.className = 'scale';
  def.scale.forEach(function (s) {
    const x = document.createElement('span'); x.textContent = s; sc.appendChild(x);
  });
  el.appendChild(sc);
  return el;
}

/* ============================================================= Editor */

let editing = null;      /* Profil-Id im Editor */
let editFrom = null;     /* 'picker' | 'all' */
let draft = null;        /* Arbeitskopie der Werte */
let dirty = false;

function openEditor(id, from) {
  editFrom = from || null;
  if (editFrom === 'picker') { close('profiles'); close('scrim'); }
  if (editFrom === 'all') close('allprofiles');

  editing = id; dirty = false;
  const p = byId(id);
  draft = {};
  paramIds(p.basis).forEach(function (k) { draft[k] = pval(p, k); });

  $('#editorTitle').textContent = p.name;
  const foreign = id !== store.active;
  $('#editorDone').textContent = foreign ? 'Verwenden' : 'Fertig';
  const note = $('#editorNote');
  if (foreign) {
    note.innerHTML = 'Du siehst <b>' + esc(p.name) + '</b> an — aktiv ist weiterhin <b>' +
      esc(activeProfile().name) + '</b>. „Verwenden“ wechselt.';
    note.hidden = false;
  } else {
    note.hidden = true;
  }
  buildEditor(p);
  open('editor');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function buildEditor(profile) {
  const host = $('#editorBody');
  host.textContent = '';
  const base = BR.BASES[profile.basis];
  const groups = BR.SECTIONS.filter(function (s) {
    return base.groups[s.id] && base.groups[s.id].length;
  });

  const nav = document.createElement('div');
  nav.className = 'jump';
  groups.forEach(function (sec, i) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = sec.title;
    if (i === 0) btn.className = 'on';
    btn.addEventListener('click', function () {
      /* Kein scrollIntoView — das scrollt jede Scroll-Ebene mit, auch die
         Seite, und schiebt dabei die Kopfleiste aus dem Bild. */
      const t = document.getElementById('sec-' + sec.id);
      host.scrollTo({ top: Math.max(0, t.offsetTop - nav.offsetHeight), behavior: 'smooth' });
    });
    nav.appendChild(btn);
  });
  host.appendChild(nav);

  let count = 0;
  groups.forEach(function (sec) {
    const ids = base.groups[sec.id];
    count += ids.length;
    const wrap = document.createElement('div');
    wrap.className = 'sect'; wrap.id = 'sec-' + sec.id;
    const head = document.createElement('div');
    head.className = 'secthead';
    head.innerHTML = '<h3>' + esc(sec.title) + '</h3><span class="cnt">' + ids.length + '</span>';
    wrap.appendChild(head);

    const box = document.createElement('div');
    box.className = 'group';
    ids.forEach(function (pid) {
      const def = BR.paramDef(pid);
      box.appendChild(paramRow(def,
        function () { return draft[pid]; },
        function (v) { draft[pid] = v; dirty = true; }));
    });
    wrap.appendChild(box);
    host.appendChild(wrap);
  });

  const n = document.createElement('p');
  n.className = 'note';
  n.style.paddingTop = '14px';
  n.innerHTML = '<b>' + count + ' Parameter</b> — alle aus der Profildatei ' +
    '<code>' + esc(profile.basis) + '</code>. Sie gehen als <code>profile:</code>-Werte ' +
    'direkt in die Anfrage, ein Upload ist nicht nötig. Gewicht und Leistung stehen ' +
    'bewusst nicht hier, sondern im Menü unter „Fahrer &amp; Rad“: Sie beschreiben ' +
    'dich, nicht die Art der Route.';
  host.appendChild(n);

  host.onscroll = function () {
    let best = 0;
    groups.forEach(function (sec, i) {
      const e = document.getElementById('sec-' + sec.id);
      if (e && e.offsetTop - 70 <= host.scrollTop) best = i;
    });
    Array.prototype.forEach.call(nav.children, function (b, i) {
      b.classList.toggle('on', i === best);
    });
  };
}

function backFromEditor() {
  close('editor');
  if (editFrom === 'picker') openSheet('profiles');
  if (editFrom === 'all') open('allprofiles');
  editFrom = null; editing = null; draft = null; dirty = false;
}

function endEdit() {
  if (dirty) { askSave(); return; }
  if (editing && editing !== store.active) selectProfile(editing, false);
  backFromEditor();
}

function askSave() {
  const p = byId(editing);
  $('#saveName').value = p.eigen ? p.name : p.name + ' (geändert)';
  $('#saveOver').hidden = !p.eigen;
  $('#saveHint').innerHTML = p.eigen
    ? 'Du hast <b>' + esc(p.name) + '</b> geändert. Überschreiben ersetzt das Profil, ' +
      '„Als neues sichern“ legt eine Kopie unter neuem Namen an.'
    : '<b>' + esc(p.name) + '</b> ist ein mitgeliefertes Profil und bleibt unverändert. ' +
      'Deine Änderungen kommen in eine eigene Kopie — gib ihr einen Namen.';
  openSheet('savedlg');
}

function diffFromBase(basis, values) {
  const out = {};
  Object.keys(values).forEach(function (k) {
    if (values[k] !== BR.baseDefault(basis, k)) out[k] = values[k];
  });
  return out;
}

function saveAsNew() {
  const nm = $('#saveName').value.trim();
  if (!nm) { toast('Bitte einen Namen eingeben.'); return; }
  const src = byId(editing);
  const p = {
    id: newId(), name: nm.slice(0, 40), eigen: true,
    basis: src.basis, params: diffFromBase(src.basis, draft)
  };
  store.profiles.push(p);
  dirty = false;
  selectProfile(p.id, false);
  persist();
  backFromEditor();
  toast('„' + nm + '“ angelegt und aktiv.');
}

function saveOver() {
  const nm = $('#saveName').value.trim();
  if (!nm) { toast('Bitte einen Namen eingeben.'); return; }
  const p = byId(editing);
  if (!p.eigen) return;
  p.name = nm.slice(0, 40);
  p.params = diffFromBase(p.basis, draft);
  dirty = false;
  selectProfile(p.id, false);
  persist();
  backFromEditor();
  toast('„' + nm + '“ überschrieben.');
}

/* ==================================================== Profilauswahl */

let showList = [], allOrder = [];

/* Die Reihenfolge wird beim Öffnen eingefroren und steht still, solange das
   Blatt offen ist. Sortierte sie bei jedem Antippen neu, tauschten die
   Zeilen unter dem Finger die Plätze. Siehe OFFENE-PUNKTE.md P7. */
function freezeOrder() {
  const r = ranked();
  allOrder = r.map(function (p) { return p.id; });
  showList = r.slice(0, SHOWN).map(function (p) { return p.id; });
}

/* Auswahl aus der Vollliste rückt in der Vorauswahl an die erste Stelle,
   alle anderen eine Position nach unten, die Liste bleibt fünf lang. */
function promoteToTop(id) {
  showList = [id].concat(showList.filter(function (x) { return x !== id; })).slice(0, SHOWN);
}

function visibleList() {
  const ids = showList.slice();
  if (ids.indexOf(store.active) === -1) ids.unshift(store.active);
  return ids.slice(0, SHOWN).map(byId);
}

function pSub(p) {
  const bits = [p.eigen ? 'Eigenes Profil' : 'Mitgeliefert', p.basis];
  const dev = deviations(p).length;
  if (dev) bits.push(dev === 1 ? '1 Änderung' : dev + ' Änderungen');
  return bits.join(' · ');
}

function pWhen(p) {
  if (p.id === store.active) return '';
  const u = usageOf(p.id);
  if (!u.n) return 'nie benutzt';
  return u.n + '×';
}

function selectProfile(id, fromAll) {
  store.active = id;
  noteUse(id);
  const p = byId(id);
  $('#pillName').textContent = p.name;
  $('#sheetProfile').textContent = p.name;
  if (fromAll) { promoteToTop(id); close('allprofiles'); }
  renderProfiles(); renderAllProfiles();
  persist();
  if (state.route) invalidate('Profil gewechselt — bitte neu berechnen.');
  toast('Profil „' + p.name + '“ gewählt.');
}

function profileRow(p, fromAll) {
  const row = document.createElement('div');
  row.className = 'prow';
  const on = p.id === store.active;

  const sel = document.createElement('button');
  sel.type = 'button'; sel.className = 'psel';
  sel.innerHTML = '<span class="pdot' + (on ? ' on' : '') + '"></span>' +
    '<span class="mt"><b>' + esc(p.name) + '</b>' +
    '<span class="sub">' + esc(pSub(p)) + '</span></span>';
  sel.addEventListener('click', function () { selectProfile(p.id, fromAll); });
  row.appendChild(sel);

  const when = pWhen(p);
  if (when) {
    const w = document.createElement('span');
    w.className = 'pwhen'; w.textContent = when;
    row.appendChild(w);
  }

  const ed = document.createElement('button');
  ed.type = 'button'; ed.className = 'pedit'; ed.textContent = 'Bearbeiten';
  /* Bearbeiten aktiviert NICHT — Ansehen ist noch keine Entscheidung. */
  ed.addEventListener('click', function () { openEditor(p.id, fromAll ? 'all' : 'picker'); });
  row.appendChild(ed);

  return row;
}

function renderProfiles() {
  const host = $('#pList');
  host.textContent = '';
  const vis = visibleList();
  vis.forEach(function (p) { host.appendChild(profileRow(p, false)); });
  $('#pCount').textContent = allProfiles().length + ' insgesamt';
  const rest = allProfiles().length - SHOWN;
  $('#pRest').textContent = rest > 0 ? '+' + rest + ' weitere' : 'alle anzeigen';
  $('#pTip').textContent = 'Tippen wählt aus — das Blatt bleibt offen.';
}

function renderAllProfiles() {
  const host = $('#allBody');
  host.textContent = '';
  [['Eigene Profile', true], ['Mitgeliefert', false]].forEach(function (g) {
    const list = allOrder.map(byId).filter(function (p) { return p.eigen === g[1]; });
    if (!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'sect';
    wrap.innerHTML = '<div class="secthead"><h3>' + g[0] +
      '</h3><span class="cnt">' + list.length + '</span></div>';
    const box = document.createElement('div');
    box.className = 'card'; box.style.padding = '2px 12px';
    list.forEach(function (p) { box.appendChild(profileRow(p, true)); });
    wrap.appendChild(box);
    host.appendChild(wrap);
  });
  const n = document.createElement('p');
  n.className = 'note'; n.style.paddingTop = '14px';
  n.innerHTML = '<b>Mitgelieferte Profile lassen sich bearbeiten</b> — dabei entsteht ' +
    'eine eigene Kopie, das Original bleibt unberührt.<br><br>' +
    '<b>Reihenfolge:</b> nach letzter Benutzung, nie benutzte zuletzt. So wandern ' +
    'die Profile, mit denen du wirklich arbeitest, von selbst nach oben.';
  host.appendChild(n);
}

async function newProfile() {
  const nm = await askName('Neues Profil', 'Es entsteht als Kopie des aktiven Profils.',
    activeProfile().name + ' Kopie', 'Anlegen');
  if (nm === null || !nm.trim()) return;
  const src = activeProfile();
  const p = {
    id: newId(), name: nm.trim().slice(0, 40), eigen: true,
    basis: src.basis, params: JSON.parse(JSON.stringify(src.params))
  };
  store.profiles.push(p);
  selectProfile(p.id, false);
  freezeOrder(); renderProfiles(); renderAllProfiles();
  persist();
  toast('„' + p.name + '“ angelegt.');
}

/* ============================================== Fahrer & Rad */

function buildUser() {
  const host = $('#userBody');
  host.textContent = '';
  const box = document.createElement('div');
  box.className = 'group';
  Object.keys(BR.USER_DEFS).forEach(function (k) {
    const def = BR.USER_DEFS[k];
    def.key = k;
    box.appendChild(paramRow(def,
      function () {
        return Object.prototype.hasOwnProperty.call(store.user, k) ? store.user[k] : def.def;
      },
      function (v) { store.user[k] = v; persist(); }));
  });
  host.appendChild(box);
  const n = document.createElement('p');
  n.className = 'note';
  n.innerHTML = 'Diese Werte ändern die <b>Route nicht</b>. Sie wirken ausschließlich ' +
    'auf die geschätzte Fahrzeit. Sie hängen am Gerät, nicht am Profil — du pflegst ' +
    'dein Gewicht also einmal, nicht in jedem Profil erneut.';
  host.appendChild(n);
}

/* ==================================================== Touren */

/* Eine Tour trägt ihr Basisprofil als Kopie mit. Ist der Name unbekannt —
   aus altem Bestand oder einer fremden Sicherungsdatei —, wird die Tour
   nicht verworfen, sondern auf das Standardprofil gesetzt. */
function repairTour(t) {
  if (!BR.isKnownBase(t.basis)) t.basis = BR.FALLBACK_BASE;
  if (!t.params || typeof t.params !== 'object') t.params = {};
  if (typeof t.profileName !== 'string' || !t.profileName) {
    t.profileName = BR.base(t.basis).label;
  }
  if (!Array.isArray(t.nogos)) t.nogos = [];
  return t;
}

function validTour(t) {
  return !!t && typeof t === 'object' && typeof t.id === 'string' &&
    typeof t.name === 'string' && Array.isArray(t.waypoints) &&
    t.waypoints.length >= 2 &&
    t.waypoints.every(function (p) {
      return Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) &&
        Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;
    });
}

/* Höchstens zwei Abweichungen nennen, der Rest wird gezählt. Ohne Deckel
   wächst die Zeile mit jedem verstellten Regler und sprengt die Karte. */
function tourProfLine(t) {
  const bits = [t.profileName, t.basis];
  const dev = Object.keys(t.params || {}).filter(function (k) {
    return t.params[k] !== BR.baseDefault(t.basis, k);
  });
  if (!dev.length) { bits.push('unverändert'); }
  else {
    dev.slice(0, ABW_MAX).forEach(function (k) {
      const d = BR.paramDef(k);
      bits.push(d ? d.name : k);
    });
    if (dev.length > ABW_MAX) bits.push('+' + (dev.length - ABW_MAX) + ' weitere');
  }
  return bits.join(' · ');
}

/* Weicht das heutige Profil vom gespeicherten ab? Die Tour rechnet in jedem
   Fall mit ihrer eigenen Kopie — der Hinweis erklärt nur, warum das Ergebnis
   von der aktuellen Profileinstellung abweichen kann.

   Zuordnung über die Id, nicht über den Namen: Beim Umbenennen eines Profils
   risse die Verbindung sonst stillschweigend, und der Hinweis verschwände,
   obwohl sich etwas geändert hat. Der Name bleibt nur der Rückfall für
   Touren aus der Zeit vor dieser Fassung. */
function tourProfile(t) {
  const all = allProfiles();
  if (t.profileId) {
    const byRef = all.filter(function (x) { return x.id === t.profileId; })[0];
    if (byRef) return byRef;
  }
  return all.filter(function (x) { return x.name === t.profileName; })[0] || null;
}

function tourDiffers(t) {
  const p = tourProfile(t);
  if (!p || p.basis !== t.basis) return false;
  return paramIds(p.basis).some(function (k) {
    return pval(p, k) !== (t.params || {})[k];
  });
}

function renderTours() {
  const host = $('#archiveBody');
  host.textContent = '';
  const list = store.tours.slice().sort(function (a, b) {
    return String(b.created).localeCompare(String(a.created));
  });
  $('#miTours').textContent = list.length
    ? list.length + ' gespeichert · öffnen, umbenennen, löschen'
    : 'noch keine gespeichert';

  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = 'Noch keine Touren gespeichert. Berechne eine Route und tippe im Blatt auf das Disketten-Symbol.';
    host.appendChild(p);
    return;
  }

  list.forEach(function (t) {
    const d = document.createElement('div');
    d.className = 'tour';

    const t1 = document.createElement('div');
    t1.className = 't1';
    const nm = document.createElement('b'); nm.textContent = t.name;
    const dt = document.createElement('span'); dt.className = 'meta'; dt.textContent = dateDE(t.created);
    t1.append(nm, dt);

    const nums = document.createElement('span');
    nums.className = 'meta';
    const bits = [];
    if (Number.isFinite(t.distance)) bits.push(km(t.distance));
    if (Number.isFinite(t.ascend)) bits.push(Math.round(t.ascend) + ' hm');
    if (Number.isFinite(t.time)) bits.push(hhmm(t.time) + ' h');
    if (t.nogos && t.nogos.length) {
      bits.push(t.nogos.length === 1 ? '1 Sperrbereich' : t.nogos.length + ' Sperrbereiche');
    }
    nums.textContent = bits.join(' · ');

    const prof = document.createElement('span');
    prof.className = 'meta tprof'; prof.textContent = tourProfLine(t);

    d.append(t1, nums, prof);

    if (tourDiffers(t)) {
      const w = document.createElement('p');
      w.className = 'warn';
      w.textContent = 'Das Profil wurde seit dieser Tour geändert. Öffnen rechnet mit den damals gespeicherten Werten.';
      d.appendChild(w);
    }

    const row = document.createElement('div');
    row.className = 'row';
    row.appendChild(tourBtn('Öffnen', function () { openTour(t); }));
    row.appendChild(tourBtn('Umbenennen', function () { renameTour(t); }));
    row.appendChild(tourBtn('Löschen', function () { deleteTour(t); }));
    d.appendChild(row);
    host.appendChild(d);
  });
}

function tourBtn(label, fn) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn'; b.textContent = label;
  b.addEventListener('click', fn);
  return b;
}

async function saveTour() {
  if (!state.route) return;
  const preset = dateDE(new Date().toISOString()) +
    (Number.isFinite(state.route.distance) ? ' · ' + km(state.route.distance) : '');
  const nm = await askName('Tour speichern',
    'Der Name gehört dir — Kilometer und Profil kommen automatisch dazu.',
    preset, 'Speichern');
  if (nm === null) return;

  store.tours.push({
    id: newId(), name: (nm.trim() || preset).slice(0, 60),
    created: new Date().toISOString(),
    waypoints: state.wps.map(function (w) {
      const p = w.marker.getLatLng(); return [p.lat, p.lng];
    }),
    nogos: state.nogos.map(function (n) {
      return [n.latlng.lat, n.latlng.lng, Math.round(n.radius)];
    }),
    basis: state.route.basis,
    profileId: state.route.profileId,
    profileName: state.route.profileName,
    params: state.route.params,
    distance: state.route.distance, ascend: state.route.ascend, time: state.route.time
  });
  if (persist()) { renderTours(); toast('Tour gespeichert. Öffnen über Menü → Touren.'); }
}

function openTour(t) {
  state.wps.forEach(function (w) { map.removeLayer(w.marker); });
  state.nogos.forEach(function (n) { map.removeLayer(n.circle); map.removeLayer(n.dot); });
  state.wps = []; state.nogos = []; state.stack = [];
  clearRoute();

  t.waypoints.forEach(function (p) { addWaypoint(L.latLng(p[0], p[1])); });
  (t.nogos || []).forEach(function (n) { addNogo(L.latLng(n[0], n[1]), n[2]); });

  /* Mit den damals gespeicherten Werten rechnen, nicht mit dem heutigen
     Profil — sonst käme eine andere Route heraus als bei der Aufnahme. */
  state.route = null;
  close('archive'); closeSheets();
  const tmp = { id: 'tour', name: t.profileName, eigen: true, basis: t.basis, params: t.params };
  calculateWith(tmp, t.name);
}

/* Rechnet mit den in der Tour gespeicherten Werten, ohne das aktive Profil
   anzufassen. Ein Hilfsprofil in store.profiles einzuhängen wäre falsch:
   calculate() sichert zwischendurch, und das Hilfsprofil überlebte den
   Neustart als Geisterprofil. */
async function calculateWith(profile, tourName) {
  $('#sheetProfile').textContent = profile.name + ' · ' + tourName;
  await calculate(profile);
}

async function renameTour(t) {
  const nm = await askName('Tour umbenennen', '', t.name, 'Umbenennen');
  if (nm === null || !nm.trim()) return;
  t.name = nm.trim().slice(0, 60);
  if (persist()) { renderTours(); toast('Umbenannt.'); }
}

async function deleteTour(t) {
  const ok = await askConfirm('Tour löschen', '„' + t.name + '“ endgültig löschen?');
  if (!ok) return;
  store.tours = store.tours.filter(function (x) { return x.id !== t.id; });
  if (persist()) { renderTours(); toast('Gelöscht.'); }
}

/* ================================================== Sicherung */

function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function renderBackup() {
  const host = $('#backupBody');
  host.textContent = '';
  const days = daysSince(store.lastBackup);

  const flag = document.createElement('div');
  flag.className = 'flag';
  flag.innerHTML = '<span class="k">' + (days === null ? '!' : days) + '</span>' +
    '<p>' + (days === null
      ? '<b>Noch nie gesichert.</b> iOS darf den Speicher der App jederzeit räumen. Danach wären Touren, Profile und Einstellungen weg.'
      : '<b>Letzte Sicherung vor ' + days + ' Tagen.</b> iOS darf den Speicher jederzeit räumen.') +
    '</p>';
  host.appendChild(flag);

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<h3>Was in die Datei kommt</h3>';
  const leg = document.createElement('div');
  leg.className = 'legend';
  [['Touren', store.tours.length, '--slate'],
   ['Eigene Profile', store.profiles.length, '--ochre'],
   ['Fahrer & Rad', Object.keys(store.user).length ? 'angepasst' : 'Standard', '--good']
  ].forEach(function (r) {
    const row = document.createElement('div');
    row.innerHTML = '<span class="swatch" style="background:var(' + r[2] + ')"></span>' +
      '<span class="lbl">' + r[0] + '</span><span class="pct">' + r[1] + '</span>';
    leg.appendChild(row);
  });
  card.appendChild(leg);
  host.appendChild(card);

  const act = document.createElement('div');
  act.className = 'actions two';
  const ex = document.createElement('button');
  ex.type = 'button'; ex.className = 'btn primary'; ex.textContent = 'Sicherung teilen';
  ex.addEventListener('click', exportAll);
  const im = document.createElement('button');
  im.type = 'button'; im.className = 'btn'; im.textContent = 'Wiederherstellen';
  im.addEventListener('click', function () { $('#importFile').click(); });
  act.append(ex, im);
  host.appendChild(act);

  const n1 = document.createElement('p');
  n1.className = 'note';
  n1.innerHTML = 'Die Datei geht über das Teilen-Menü, zum Beispiel nach iCloud Drive. ' +
    '<b>Automatisch geht das nicht:</b> Safari darf auf iOS keine Dateien unbemerkt ' +
    'schreiben. Ein Tap ist immer nötig.';
  if (lastFault) {
    const f = document.createElement('div');
    f.className = 'card';
    f.innerHTML = '<h3>Zuletzt aufgetretener Fehler</h3>';
    const pre = document.createElement('p');
    pre.className = 'note';
    pre.style.fontFamily = '"IBM Plex Mono", monospace';
    pre.style.overflowWrap = 'anywhere';
    pre.textContent = lastFault;
    f.appendChild(pre);
    const hint = document.createElement('p');
    hint.className = 'note';
    hint.textContent = 'Diesen Text weitergeben — er nennt Stelle und Ursache.';
    f.appendChild(hint);
    host.appendChild(f);
  }

  const n2 = document.createElement('p');
  n2.className = 'note';
  n2.innerHTML = '<b>Wiederherstellen</b> heißt nur hier so — weil hier tatsächlich ' +
    'etwas verloren war. Eine gespeicherte Tour war nie weg; die wird unter ' +
    '<b>Touren</b> geöffnet. Beim Wiederherstellen werden Einträge zusammengeführt, ' +
    'nichts wird überschrieben.';
  host.append(n1, n2);
}

function exportAll() {
  const data = JSON.stringify(Object.assign({}, store, {
    exported: new Date().toISOString()
  }), null, 2);
  const file = new File([data], today() + '_bikeRouteriOS-Sicherung.json',
    { type: 'application/json' });
  store.lastBackup = new Date().toISOString();
  persist();
  renderBackup();
  shareOrDownload(file, 'Sicherung');   /* synchron, damit die Geste gilt */
}

async function importAll(file) {
  try {
    const data = JSON.parse(await file.text());
    const tours = Array.isArray(data.tours) ? data.tours
      : (Array.isArray(data) ? data : null);
    if (!tours) throw new Error('Die Datei enthält keine bikeRouteriOS-Sicherung.');

    const known = {};
    store.tours.forEach(function (t) { known[t.id] = true; });
    let added = 0, dup = 0, bad = 0;
    tours.forEach(function (t) {
      if (!validTour(t)) { bad++; return; }
      if (known[t.id]) { dup++; return; }
      store.tours.push(t); known[t.id] = true; added++;
    });

    let profAdded = 0;
    if (Array.isArray(data.profiles)) {
      const pk = {};
      store.profiles.forEach(function (p) { pk[p.id] = true; });
      data.profiles.forEach(function (p) {
        if (!p || !p.id || pk[p.id] || !BR.BASES[p.basis]) return;
        store.profiles.push(p); pk[p.id] = true; profAdded++;
      });
    }
    if (data.user && typeof data.user === 'object' && !Object.keys(store.user).length) {
      store.user = data.user;
    }

    if (persist()) {
      freezeOrder(); renderProfiles(); renderAllProfiles();
      renderTours(); renderBackup(); buildUser();
      const parts = [added + ' Touren neu', dup + ' schon vorhanden'];
      if (profAdded) parts.push(profAdded + ' Profile neu');
      if (bad) parts.push(bad + ' unbrauchbar');
      toast('Wiederhergestellt: ' + parts.join(', ') + '.');
    }
  } catch (err) {
    toast('Wiederherstellen fehlgeschlagen: ' + err.message);
  }
}

/* ============================================== Baukasten (offen)

   Noch nicht scharf: Neue Regeln brauchen den vollständigen Profiltext, den
   die API nicht herausgibt (GET /brouter/profile/<id> ist kein Download).
   Er müsste also mitgeliefert werden — das ist eine Architekturentscheidung
   und steht in OFFENE-PUNKTE.md. Der Bereich zeigt deshalb, was kommen soll,
   und tut noch nichts. */

function renderKit() {
  const host = $('#kitBody');
  host.textContent = '';
  const box = document.createElement('div');
  box.className = 'flag';
  box.innerHTML = '<span class="k">…</span><p><b>Noch nicht in Betrieb.</b> ' +
    'Hier sollen Bausteine das Profil um Regeln erweitern, die BRouter von Haus ' +
    'aus nicht hat — etwa das Tempolimit zu bewerten.</p>';
  host.appendChild(box);

  const n = document.createElement('p');
  n.className = 'note';
  n.innerHTML = 'Der Weg dafür ist vermessen und funktioniert: Ein geändertes Profil ' +
    'wird per <code>POST /brouter/profile</code> übertragen und danach wie ein ' +
    'gewöhnliches Profil benutzt. Es fehlt eine Entscheidung: Neue Regeln brauchen ' +
    'den <b>vollständigen Profiltext</b>, und den gibt die API nicht heraus — er ' +
    'müsste in der App mitgeliefert werden. Details in <code>BROUTER.md</code> und ' +
    '<code>OFFENE-PUNKTE.md</code>.';
  host.appendChild(n);

  const m = document.createElement('p');
  m.className = 'note';
  m.innerHTML = '<b>Gemessen ist der Nutzen bereits:</b> Ein Baustein, der ' +
    '<code>maxspeed</code> bewertet, senkt den Anteil an Straßen mit Tempo 70 oder ' +
    'mehr von 23,7 % auf 8,7 % — bei rund 10 % Mehrweg.';
  host.appendChild(m);
}

/* ========================================================= Verdrahtung */

$('#grab').addEventListener('click', function () { setDetent(detent + 1); });
$('#grab').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetent(detent + 1); }
});

/* Nicht `calculate` direkt haengen: Ein Listener bekommt das Event als
   erstes Argument, und das landete in `override` — dem Platz fuer ein
   Profil. `profile.params` war dann undefined, und die Berechnung brach
   mit „Cannot convert undefined or null to object" ab, noch bevor eine
   Anfrage rausging. Gefunden am 18.08.2026. */
$('#calcBtn').addEventListener('click', function () { calculate(); });
$('#shareBtn').addEventListener('click', share);
$('#saveBtn').addEventListener('click', saveTour);

$('#mPoint').addEventListener('click', function () { setMode('point'); });
$('#mNogo').addEventListener('click', function () { setMode('nogo'); });
$('#mUndo').addEventListener('click', undo);
$('#mLoc').addEventListener('click', locate);

$('#pillBtn').addEventListener('click', function () {
  freezeOrder(); renderProfiles(); renderAllProfiles();
  openSheet('profiles');
});
$('#menuBtn').addEventListener('click', function () { openSheet('menu'); });
$('#scrim').addEventListener('click', function () {
  if (namePending) { settleName(null); return; }
  if (confirmPending) { settleConfirm(false); return; }
  closeSheets();
});
$('#pDone').addEventListener('click', closeSheets);
$('#pMore').addEventListener('click', function () { open('allprofiles'); });
$('#newProfile').addEventListener('click', newProfile);

$('#editorDone').addEventListener('click', endEdit);
$('#toKit').addEventListener('click', function () { renderKit(); open('kit'); });
$('#kitBack').addEventListener('click', function () { close('kit'); });

$('#saveCancel').addEventListener('click', function () {
  dirty = false; close('savedlg'); backFromEditor(); toast('Änderungen verworfen.');
});
$('#saveNew').addEventListener('click', function () { close('savedlg'); saveAsNew(); });
$('#saveOver').addEventListener('click', function () { close('savedlg'); saveOver(); });

$('#nameOk').addEventListener('click', function () { settleName($('#nameInput').value); });
$('#nameCancel').addEventListener('click', function () { settleName(null); });
$('#nameInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); settleName(this.value); }
});
$('#confirmOk').addEventListener('click', function () { settleConfirm(true); });
$('#confirmCancel').addEventListener('click', function () { settleConfirm(false); });

Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
  b.addEventListener('click', function () { close(b.getAttribute('data-close')); });
});
Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
  b.addEventListener('click', function () {
    closeSheets();
    open(b.getAttribute('data-go'));
  });
});

$('#importFile').addEventListener('change', async function () {
  const f = this.files && this.files[0];
  this.value = '';                     /* dieselbe Datei soll erneut wählbar sein */
  if (f) await importAll(f);
});

window.addEventListener('resize', function () {
  positionRail();
  map.invalidateSize({ pan: false });
});

/* =================================================== Fehler sichtbar machen

   Ohne das stirbt die App bei einem unerwarteten Fehler lautlos: Die Karte
   steht, nichts reagiert, und die Ursache steht nur in einer Konsole, an die
   auf einem iPhone niemand herankommt. Genau so ist am 18.08.2026 ein Fehler
   tagelang unsichtbar geblieben. */

let lastFault = null;

function reportFault(what, err) {
  const msg = (err && (err.message || err)) || 'unbekannt';
  const where = err && err.stack
    ? String(err.stack).split('\n')[1] || ''
    : '';
  lastFault = what + ': ' + msg + (where ? ' — ' + where.trim() : '');
  try {
    setStatus('Interner Fehler — ' + what + ': ' + msg +
      '  (Zum Melden: Menü → Sicherung zeigt den vollständigen Text.)', 'error');
  } catch (e) { /* wenn selbst das scheitert, bleibt nur die Konsole */ }
  if (window.console && console.error) console.error(what, err);
}

window.addEventListener('error', function (e) {
  reportFault('Skriptfehler', e.error || new Error(e.message));
});
window.addEventListener('unhandledrejection', function (e) {
  reportFault('Unbehandelter Fehler', e.reason);
});

/* =============================================================== Start */

/* Jeder Aufbauschritt einzeln abgesichert. Fällt einer aus — etwa wegen
   eines unerwarteten gespeicherten Werts —, bleibt der Rest der App
   bedienbar, und der Fehler wird sichtbar statt verschluckt. */
function step(name, fn) {
  try { fn(); } catch (err) { reportFault('Aufbau „' + name + '“', err); }
}

step('Speicher lesen', function () {
  store = loadStore();
  if (!byId(store.active)) store.active = 'stock:' + BR.FALLBACK_BASE;
});
if (!store) store = JSON.parse(JSON.stringify(DEFAULT_STORE));

step('Kopfzeile', function () {
  $('#pillName').textContent = activeProfile().name;
  $('#sheetProfile').textContent = activeProfile().name;
  $('#miBackup').textContent = store.lastBackup
    ? 'zuletzt vor ' + daysSince(store.lastBackup) + ' Tagen'
    : 'noch nie gesichert';
});
step('Profilliste', function () { freezeOrder(); renderProfiles(); renderAllProfiles(); });
step('Fahrer & Rad', buildUser);
step('Touren', renderTours);
step('Sicherung', renderBackup);
step('Blatt', function () { setDetent(0); });
syncButtons();
if (!lastFault) setStatus(defaultHint());

/* iOS räumt Web-Speicher unter Umständen weg. Das hier ist eine Bitte, kein
   Versprechen — die Sicherung als Datei bleibt der eigentliche Schutz. */
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(function () { /* dann eben nicht */ });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    /* updateViaCache: 'none' — das Worker-Skript nie aus dem HTTP-Cache nehmen,
       sonst kann eine neue Version übersehen werden. Siehe CLAUDE.md. */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(function () { /* ohne SW läuft die App trotzdem */ });
  });
}
