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
  /* Ein einzelnes „uebernommenes" Profil: geaenderte Werte, die noch keinen
     Namen haben. Es steht in der Liste ganz oben, wird beim naechsten
     Uebernehmen ersetzt und wandert beim Speichern einer Tour ohnehin als
     Wertekopie mit. So muss niemand ein Profil anlegen, nur um einmal einen
     Regler zu verschieben. */
  session: null,
  layer: 'osm',                  /* gewaehltes Kartenbild */
  view: null,                    /* zuletzt betrachteter Kartenausschnitt */
  lastBackup: null,
  tick: 0
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
  out.tours = out.tours.filter(validTour).map(repairTour).map(repairGeo);
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

function sessionProfile() {
  if (!store.session) return null;
  const sp = store.session;
  return {
    id: 'session', name: sp.name, eigen: true, sitzung: true,
    basis: sp.basis, params: sp.params || {}, blocks: sp.blocks || [],
    hint: 'Übernommene Werte, ohne eigenen Namen. Wird ersetzt, sobald du wieder etwas übernimmst.'
  };
}

function allProfiles() {
  const sp = sessionProfile();
  return (sp ? [sp] : []).concat(stockProfiles()).concat(store.profiles.map(function (p) {
    /* Ein eigenes Profil erbt die Beschreibung seines Basisprofils, solange es
       keine eigene hat — besser als gar keine Zeile. */
    if (!p.hint) p.hint = BR.base(p.basis).hint;
    return p;
  }));
}

function byId(id) {
  const all = allProfiles();
  for (let i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return all.filter(function (p) { return p.id === 'stock:fastbike-lowtraffic'; })[0];
}

function activeProfile() { return byId(store.active); }

function usageOf(id) { return store.usage[id] || { used: 0, n: 0 }; }

/* „nie benutzt" muss beim ersten Start fuer ALLE gelten. Der Startwert von
   store.tick war 1 und wurde beim ersten selectProfile hochgezaehlt — das
   aktive Profil trug dadurch von Anfang an eine Benutzung, die es nie gab. */

function noteUse(id) {
  store.tick += 1;
  const u = usageOf(id);
  store.usage[id] = { used: store.tick, n: (u.n || 0) + 1 };
}

/* Rangfolge: nach letzter Benutzung, nie benutzte zuletzt, eigene davor.
   Das aktive Profil wird bewusst NICHT vorgezogen — sonst tauschten die
   Zeilen beim Antippen die Plätze. Siehe OFFENE-PUNKTE.md P7. */
function gruppeOf(p) {
  const b = BR.BASES[p.basis];
  return (b && b.gruppe) || 'Sonderzwecke';
}

function ranked() {
  return allProfiles().slice().sort(function (a, b) {
    /* Uebernommene Werte stehen immer zuoberst: Sie sind das, womit gerade
       gerechnet wird, und verschwinden beim naechsten Uebernehmen wieder. */
    if (!!a.sitzung !== !!b.sitzung) return a.sitzung ? -1 : 1;
    const ua = usageOf(a.id), ub = usageOf(b.id);
    if (ua.used !== ub.used) return ub.used - ua.used;
    if (a.eigen !== b.eigen) return a.eigen ? -1 : 1;
    /* Bei gleichem Rang entscheidet die Gruppe, nicht das Alphabet. Sonst
       stuende „Alles gleich teuer" in der Vorauswahl, weil es mit A anfaengt —
       ein Testprofil auf Platz fuenf, waehrend „Zuegig" unter Mehr verschwindet. */
    /* Zuerst die vier eingerichteten Profile: einstellbar und gemessen. Erst
       danach zaehlt die Gruppe. Andersherum stuende „Zuegig (Asien/Pazifik)"
       vor „Trekking" in der Vorauswahl — ein Profil, das in Europa Autobahnen
       erlaubt, auf Platz vier. */
    const fa = (BR.BASES[a.basis] && BR.BASES[a.basis].frei) ? 1 : 0;
    const fb = (BR.BASES[b.basis] && BR.BASES[b.basis].frei) ? 1 : 0;
    if (fa !== fb) return fa - fb;
    const ga = BR.GRUPPEN.indexOf(gruppeOf(a)), gb = BR.GRUPPEN.indexOf(gruppeOf(b));
    if (ga !== gb) return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb);
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
  /* Bausteine bringen eigene Parameter mit. Sie stehen nicht im Katalog des
     Basisprofils — der kennt nur, was BRouter mitliefert. */
  blocksOf(profile).forEach(function (bid) {
    const b = bausteinById(bid);
    if (!b || !b.param) return;
    const v = Object.prototype.hasOwnProperty.call(profile.params, b.param.key)
      ? profile.params[b.param.key] : b.param.def;
    out.push(['profile:' + b.param.key, encodeValue(v)]);
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

/* Nur noch GeoJSON wird geholt. Das GPX entsteht aus derselben Antwort im
   Gerät — siehe „Geometrie und GPX". */
function routeUrl(profile, pts, ngs, server) {
  const q = new URLSearchParams();
  q.set('lonlats', pts);
  /* Ohne Bausteine ist das Serverprofil der Basisname, mit Bausteinen die
     Kennung des hochgeladenen Textes. */
  q.set('profile', server || profile.basis);
  q.set('alternativeidx', '0');
  q.set('format', 'geojson');
  if (ngs) q.set('nogos', ngs);
  /* Alle Tags anfordern. BRouter liefert sonst nur die, die das Profil auch
     benutzt — `maxspeed` gehört nicht dazu, und ohne ihn bliebe die
     Tempo-Auswertung dauerhaft leer, ohne dass es auffiele. */
  q.set('profile:processUnusedTags', '1');
  paramPairs(profile).forEach(function (p) { q.set(p[0], p[1]); });
  return BROUTER + '?' + q.toString();
}

/* =============================================================== Karte */

/* 24 Buchstaben. Mehr als ein Dutzend Varianten nebeneinander zu beurteilen
   ist unwahrscheinlich, aber die Grenze soll nicht beim Ausprobieren im Weg
   stehen — die Reiterzeile scrollt, und aufgeraeumt wird einzeln. */
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWX';
const MAX_ROUTES = KEYS.length;

const state = {
  wps: [],        /* [{marker, flagged}] — die Koordinate lebt im Marker */
  nogos: [],      /* [{circle, dot, latlng, radius}] */
  pending: null,  /* Mittelpunkt eines Sperrbereichs, der noch keinen Rand hat */
  editIdx: null,  /* Sperrbereich, dessen Radius neu gesetzt wird */
  mode: 'point',
  stack: [],      /* 'wp' | 'nogo' — nur für Rückgängig */

  /* Der Routenstapel. Eine berechnete Route verschwindet nicht mehr, wenn die
     nächste kommt — sie bleibt blass liegen. Ausgewählt ist immer genau eine;
     Kennzahlen, Analyse, Teilen und Speichern beziehen sich auf sie. */
  routes: [],
  ra: 0,          /* Index der ausgewählten Route */
  prev: null,     /* zuletzt ausgewählte Route — Bezug für den Vergleich */
  busy: false
};

function aroute() { return state.routes[state.ra] || null; }

/* Die Buchstaben werden nach jedem Entfernen neu vergeben, damit die Reihe
   lueckenlos bleibt: „A, C, F" liest sich wie ein Fehler. Der Bezug fuer den
   Vergleich haengt deshalb an der Route selbst, nicht an ihrem Buchstaben. */
function renumber() {
  state.routes.forEach(function (r, i) { r.key = KEYS[i] || '?'; });
}

/* Kein `tap: false` mehr: Die Option gibt es seit Leaflet 1.9 nicht mehr,
   und in älteren Fassungen war sie auf iOS eine bekannte Ursache dafür, dass
   Antippen nicht ankam. Eine Altlast auf einem Gerät, das ich nicht testen
   kann, ist die schlechteste Sorte. */
/* ---------------------------------------------------- Startausschnitt

   Wo die Karte beim ersten Start steht, soll nicht davon abhaengen, wo der
   Entwickler wohnt. Drei Stufen, von genau nach grob:

     1. Der zuletzt betrachtete Ausschnitt. Deckt jeden Start ausser dem ersten.
     2. Einmalig die Region aus der IP-Adresse (ipwho.is). Trifft die Stadt und
        ist damit brauchbar, um sofort Punkte zu setzen — die Zeitzone allein
        lieferte ganz Deutschland, was niemandem hilft.
     3. Die Zeitzone des Geraets als Rueckfall, falls der Dienst nicht
        antwortet. `Intl` kennt sie ohne jeden Netzwerkzugriff.
     4. Mitteleuropa.

   ZUR IP-ABFRAGE, weil sie die einzige Stelle ist, an der ueberhaupt etwas
   ueber den Nutzer nach draussen geht:

   - Sie laeuft **genau einmal** je Installation. Danach steht ein Ausschnitt
     im Speicher, und Stufe 1 greift fuer immer.
   - Sie blockiert nichts: Die Karte startet sofort mit der Zeitzonen-
     Schaetzung und springt nach, wenn die Antwort da ist.
   - Faellt der Dienst aus oder verweigert er, passiert nichts weiter.
   - `ipwho.is` braucht keinen Schluessel und kein Konto. Was uebertragen wird,
     ist die IP-Adresse — also das, was jeder Kachelserver ohnehin sieht.

   Wer das nicht will, drueckt den Standort-Knopf und hat es genauer. */

const ZEITZONEN = {
  'Europe/Berlin': [51.2, 10.4, 6], 'Europe/Vienna': [47.6, 14.1, 7],
  'Europe/Zurich': [46.8, 8.2, 7], 'Europe/Amsterdam': [52.2, 5.4, 7],
  'Europe/Brussels': [50.6, 4.5, 7], 'Europe/Copenhagen': [56.0, 10.0, 7],
  'Europe/Paris': [46.8, 2.4, 6], 'Europe/Prague': [49.8, 15.5, 7],
  'Europe/Warsaw': [52.0, 19.3, 6], 'Europe/Rome': [42.8, 12.5, 6],
  'Europe/Madrid': [40.2, -3.7, 6], 'Europe/London': [53.0, -1.5, 6],
  'Europe/Stockholm': [60.0, 16.0, 5], 'Europe/Oslo': [61.0, 9.0, 5],
  'Europe/Lisbon': [39.6, -8.0, 6], 'Europe/Budapest': [47.2, 19.4, 7]
};

function startView() {
  const v = store && store.view;
  if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
    return [[v.lat, v.lng], v.z];
  }
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (err) { tz = ''; }
  const z = ZEITZONEN[tz];
  if (z) return [[z[0], z[1]], z[2]];
  return [[50.5, 9.5], 5];
}

/* Einmalig die Region holen. Nur, wenn noch kein Ausschnitt gemerkt ist —
   danach nie wieder. Zoom 11 zeigt eine Stadt mit Umland: genug, um sofort
   den ersten Punkt zu setzen, ohne dass man erst suchen muss. */
async function regionHolen() {
  if (!store || store.view) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 6000);
    const res = await fetch('https://ipwho.is/?fields=latitude,longitude,city,success',
      { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const d = await res.json();
    if (!d || d.success === false) return;
    const lat = Number(d.latitude), lng = Number(d.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    /* Nur springen, wenn der Nutzer die Karte noch nicht selbst bewegt hat —
       sonst reisst ihm die Antwort den Ausschnitt unter dem Finger weg. */
    if (store.view) return;
    map.setView([lat, lng], 11);
    store.view = { lat: +lat.toFixed(5), lng: +lng.toFixed(5), z: 11 };
    persist();
    if (d.city) toast('Karte auf ' + d.city + ' gesetzt — verschieben oder Standort antippen.');
  } catch (err) {
    /* Kein Netz, geblockt, Zeitüberschreitung: dann bleibt die Zeitzone. */
  }
}

const map = L.map('map', { zoomControl: false }).setView([51.85, 10.30], 10);

/* --------------------------------------------------------- Kartenbild

   Das Kartenbild aendert die Route nicht — es aendert nur, was man sieht.
   Aufgenommen sind ausschliesslich Quellen ohne Anmeldung und ohne Vertrag;
   Satellitenbilder gibt es so nicht, deshalb steht der Eintrag grau da statt
   zu fehlen. Sonst fragt man sich in einem halben Jahr, ob er vergessen wurde.

   Jede Quelle bringt ihre eigene Nennung mit. Sie gehoert zum Bild, nicht zur
   App: Wer CyclOSM anzeigt, muss CyclOSM nennen. */
const LAYERS = [
  { id: 'osm', name: 'Standard', sub: 'OpenStreetMap · frei',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19,
    css: 'linear-gradient(150deg,#E8EBE0,#D8DFC9 60%,#EDE7D2)',
    nennung: 'Kartendaten © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende' },
  { id: 'cyclosm', name: 'Fahrradkarte', sub: 'CyclOSM · frei · hebt Radwege und Radrouten hervor',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    sub2: 'abc', max: 20,
    css: 'linear-gradient(150deg,#EDE9E2,#C9D9C0 55%,#E4CFC4)',
    nennung: 'Kartendaten © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende · ' +
             'Kacheln <a href="https://www.cyclosm.org/">CyclOSM</a>, gehostet von OpenStreetMap France' },
  { id: 'topo', name: 'Gelände', sub: 'OpenTopoMap · frei · mit Höhenlinien',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    sub2: 'abc', max: 17,
    css: 'linear-gradient(150deg,#EFEADF,#D9CBA8 60%,#C7D6C0)',
    nennung: 'Kartendaten © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende, SRTM · ' +
             'Darstellung © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)' },
  { id: 'sat', name: 'Satellit', sub: 'kein freier Anbieter — braucht einen Vertrag',
    off: true, css: 'linear-gradient(150deg,#4A5340,#2C3327)' }
];

function layerById(id) {
  let found = null;
  LAYERS.forEach(function (l) { if (l.id === id && !l.off) found = l; });
  return found || LAYERS[0];
}

let tiles = null;

function setLayer(id, sagen) {
  const l = layerById(id);
  if (tiles) map.removeLayer(tiles);
  const opts = { maxZoom: l.max };
  if (l.sub2) opts.subdomains = l.sub2;
  tiles = L.tileLayer(l.url, opts).addTo(map);
  tiles.setZIndex(1);
  if (store) { store.layer = l.id; persist(); }
  $('#attribBox').innerHTML = l.nennung +
    ' · Routing über <a href="https://brouter.de">BRouter</a>';
  renderLayers();
  if (sagen) toast('Kartenbild: ' + l.name + ' — die Route bleibt dieselbe.');
}

function renderLayers() {
  const host = $('#layerList');
  if (!host) return;
  host.textContent = '';
  const aktiv = store ? store.layer : 'osm';
  LAYERS.forEach(function (l) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layerrow';
    if (l.off) b.setAttribute('disabled', '');
    b.innerHTML = '<span class="lprev" style="background:' + l.css + '"></span>' +
      '<span class="mt"><b>' + l.name + '</b><span>' + l.sub + '</span></span>' +
      '<span class="pdot' + (l.id === aktiv && !l.off ? ' on' : '') + '"></span>';
    b.addEventListener('click', function () {
      if (l.off) { toast('Satellitenbilder gibt es nicht ohne Vertrag.'); return; }
      setLayer(l.id, true);
    });
    host.appendChild(b);
  });
  $('#layerCount').textContent = LAYERS.length + ' Quellen';
  $('#layerNote').innerHTML = 'Das Kartenbild ändert die <b>Route nicht</b> — es ändert nur, ' +
    'was du siehst. Jede Quelle ist ein fremder Kachelserver; die drei freien sind ' +
    'ohne Anmeldung nutzbar.';
}

map.on('click', function (e) {
  $('#attribBox').hidden = true;
  $('#attribBtn').setAttribute('aria-expanded', 'false');
  if (map._popupOpen) return;
  scrubHide();
  /* Stumpf ist die Karte NUR im Vollbild: Dort sind 92 px Karte uebrig, ein
     Tap darauf kann nur „gib mir die Karte zurueck" heissen. In der halben
     Raste wird dagegen gearbeitet — dort setzt ein Tap wie immer. */
  if (detent >= 3) {
    setDetent(2);
    toast('Zugezogen — der nächste Tap setzt wieder.');
    return;
  }
  onMapTap(e.latlng);
});
/* Den Ausschnitt merken, aber sparsam schreiben: `moveend` feuert am Ende
   jeder Geste, und localStorage bei jedem Wisch anzufassen waere Verschwendung. */
let viewTimer = null;
map.on('moveend zoomend', function () {
  if (!store) return;
  clearTimeout(viewTimer);
  viewTimer = setTimeout(function () {
    const c = map.getCenter();
    store.view = { lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), z: map.getZoom() };
    persist();
  }, 1200);
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
    invalidate('Radius auf ' + km(radius) + ' geändert.');
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
    invalidate('Wegpunkt verschoben.');
  });
  marker.on('click', function (ev) {
    L.DomEvent.stopPropagation(ev);
    openWpMenu(marker);
  });
  state.wps.push({ marker: marker, flagged: false });
  renumber();
  invalidate('Wegpunkt ' + state.wps.length + ' gesetzt.');
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
  invalidate('Wegpunkt entfernt.');
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
  invalidate('Sperrbereich mit ' + km(radius) + ' Radius angelegt.');
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
  invalidate('Sperrbereich entfernt.');
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

/* Wegpunkte oder Sperrbereiche geändert? Dann passt KEINE der gerechneten
   Routen mehr zu den Punkten — der ganze Stapel geht weg. Einzelne Routen
   stehen zu lassen wäre schlimmer als sie zu verwerfen: Sie sähen gültig aus,
   gehörten aber zu einer Fragestellung, die es nicht mehr gibt. */
function clearRoutes() {
  state.routes.forEach(function (r) { if (r.layer) map.removeLayer(r.layer); });
  state.routes = [];
  state.ra = 0;
  state.prev = null;
  detentsInvalidieren();
  scrubHide();
  $('#readout').hidden = true;
  $('#analysis').hidden = true;
  $('#rchips').hidden = true;
  $('#rdelta').hidden = true;
  $('#clearBtn').hidden = true;
  setDetent(0);
}

/* Zwei Rueckmeldungen mit verschiedenen Aufgaben, sonst steht alles doppelt:
   Der Toast quittiert die Geste und ist wieder weg, die Statuszeile traegt den
   Zustand der Route. Vorher stand die Quittung in der Statuszeile — als graue
   Zeile ueber dem Rechnen-Knopf, die man beim Tippen auf die Karte nicht
   ansieht. Der Entwurf hatte dafuer den Toast ueber der Karte. */
function invalidate(receipt) {
  /* Wie viele Routen dabei wegfallen, gehoert in die Quittung: Wer den vierten
     Wegpunkt setzt und dabei drei Vergleiche verliert, soll es erfahren, statt
     es zu bemerken. */
  const weg = state.routes.length;
  clearRoutes();
  clearFlags();
  syncButtons();
  if (receipt) {
    toast(weg
      ? receipt + ' ' + (weg === 1 ? 'Die Route wurde verworfen.'
                                   : weg + ' Routen wurden verworfen.')
      : receipt);
  }
  setStatus(defaultHint());
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
  /* Gemessen am 19.08.2026: Nach etwa 30 Anfragen in kurzer Folge antwortet
     brouter.de mit HTTP 403 und dem Text „Please, retry later!". Das ist eine
     Mengenbegrenzung, kein Fehler an der Anfrage — ohne eigenen Fall stünde
     hier „Der Server antwortete mit Fehler 403", und man suchte den Fehler bei
     sich. */
  if (b.indexOf('retry later') !== -1 || status === 403) {
    return { text: 'Der Routing-Server nimmt gerade keine weiteren Anfragen an — es waren zu viele in kurzer Zeit. Ein bis zwei Minuten warten, dann geht es wieder.' };
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
  /* Obergrenze, damit die Karte nicht zuwächst und der Vergleich lesbar
     bleibt. Sechs Buchstaben sind mehr, als man nebeneinander beurteilen
     kann; wer weiter will, räumt vorher auf. */
  if (state.routes.length >= MAX_ROUTES) {
    toast('Sechs Routen liegen schon da — erst aufräumen.');
    return;
  }
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
    const server = await serverProfileFor(profile);
    setStatus('Route wird berechnet …', 'busy');
    const res = await request(routeUrl(profile, pts, ngs, server));
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
    const props = feat.properties || {};

    /* Zwei Profile koennen dieselbe Route ergeben — belegt ist das etwa fuer
       fastbike mit consider_traffic=1.0 gegen fastbike-lowtraffic. Sie dann
       zweimal uebereinander zu legen, saehe nach Vergleich aus, wo keiner ist.
       Verglichen wird ueber Laenge, Hoehenmeter UND Kosten: Die Kosten
       unterscheiden auch Routen, die zufaellig gleich lang sind. */
    const gleich = state.routes.filter(function (r) {
      return r.distance === num(props['track-length'])
        && r.ascend === num(props['filtered ascend'])
        && r.cost === num(props.cost);
    })[0];
    if (gleich) {
      selectRoute(state.routes.indexOf(gleich));
      setStatus('Gleiches Ergebnis wie Route ' + gleich.key + '.');
      toast('Ergebnis identisch mit Route ' + gleich.key + ' (' + gleich.profileName +
            ') — nichts dazugelegt.');
      return;
    }

    const entry = makeEntry({
      pts: pts, ngs: ngs,
      basis: profile.basis, profileId: profile.id, profileName: profile.name,
      params: snapshotParams(profile),
      blocks: blocksOf(profile).slice(),
      tourName: pendingTour,
      coords: coords,
      meta: gpxMeta(props),
      analysis: analyse(props)
    });
    state.prev = aroute();
    state.routes.push(entry);
    detentsInvalidieren();
    state.ra = state.routes.length - 1;
    paintRoutes();
    showRoute();
    /* Kein fitRoute hier: Das Blatt waechst gleich noch — mit der Reiterzeile
       und dem Vergleich. Ein Zuschnitt mit der alten Hoehe schoebe die Route
       unter das Blatt. setDetent zieht nach, wenn die Bewegung durch ist. */
    setStatus('Route ' + entry.key + ' berechnet.');
    /* Nur so weit aufziehen, wie noetig: Kennzahlen und Vergleich stehen in der
       kleinen Raste, die Karte bleibt frei. Das Blatt nach jeder Berechnung
       halb aufzuziehen war aufdringlich — wer das Hoehenprofil sehen will,
       zieht am Griff. Wer schon offen hatte, bleibt offen. */
    setDetent(Math.max(1, detent));
    if (!ok) { noteUse(profile.id); persist(); }
  } catch (err) {
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

/* Abgelegte Routen liegen gestrichelt und blass da, die ausgewählte kräftig.
   Farbe je Route wäre hübsch, gäbe derselben Fläche aber eine zweite
   Bedeutung — man müsste dann zusätzlich lernen, welche Farbe wofür steht. */
function paintRoutes() {
  const css = getComputedStyle(document.documentElement);
  const signal = css.getPropertyValue('--signal').trim() || '#DC4514';
  const muted = css.getPropertyValue('--muted').trim() || '#6B7362';

  state.routes.forEach(function (r, i) {
    /* Aus der vollen Punktfolge, nicht aus der Stichprobe fuers Diagramm. */
    const latlngs = r.coords.map(function (c) { return [c[1], c[0]]; });
    if (!r.layer) {
      r.layer = L.polyline(latlngs, { lineJoin: 'round', lineCap: 'round' }).addTo(map);
      r.layer.on('click', function (ev) {
        L.DomEvent.stopPropagation(ev);
        selectRoute(i);
      });
    }
    const on = i === state.ra;
    r.layer.setStyle(on
      ? { color: signal, weight: 5, opacity: 0.95, dashArray: null }
      : { color: muted, weight: 3.5, opacity: 0.75, dashArray: '9 8' });
    if (on) r.layer.bringToFront();
  });
}

/* ================================================== Geometrie und GPX

   Eine berechnete Route behält ihre vollständige Punktfolge, und eine
   gespeicherte Tour nimmt sie mit. Vorher lagen nur die Wegpunkte im Archiv:
   Öffnen hieß neu rechnen. Damit hing jede gespeicherte Tour daran, dass
   BRouter gerade erreichbar ist UND dass seine Kartendaten sich nicht bewegt
   haben — und beides ist keine Zusage. Der Server aktualisiert seine
   .rd5-Segmente; dieselbe Anfrage kann später eine andere Route ergeben, ohne
   dass es auffiele. Eine Tour, die man abgelegt hat, war dann nicht die Tour,
   die man wiederbekommt.

   Roh sind die Punkte 42 KB für 43 km. Kodiert 7,7 KB, ohne eine einzige
   Stelle zu verlieren: lon/lat auf 1e-6 gerundet — genau die Auflösung, die
   BRouter liefert — und die Höhe auf Viertelmeter, BRouters eigenes Raster.
   Abgelegt wird die Differenz zum Vorgänger, und die ist bei 28 m
   Punktabstand winzig. Verfahren wie bei den Google-Polylines: Zickzack plus
   Fünf-Bit-Gruppen, reines ASCII — übersteht JSON und localStorage
   unbeschadet. Damit kostet eine Tour rund 8 KB statt 44. */

const GEO_LL = 1e6;   /* Nachkommastellen von lon/lat, wie in der Antwort */
const GEO_EL = 4;     /* Höhe in Viertelmetern, wie in der Antwort */

function encNum(v, out) {
  let u = v < 0 ? ~(v << 1) : (v << 1);
  while (u >= 0x20) { out.push(String.fromCharCode((0x20 | (u & 0x1f)) + 63)); u >>>= 5; }
  out.push(String.fromCharCode(u + 63));
}

/* coords: [[lon, lat, ele], …] — die Form, in der das GeoJSON sie liefert. */
function encodeGeo(coords) {
  const out = [];
  let plat = 0, plon = 0, pele = 0;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    const e = Number(c[2]);
    const lat = Math.round(Number(c[1]) * GEO_LL);
    const lon = Math.round(Number(c[0]) * GEO_LL);
    const ele = Math.round((Number.isFinite(e) ? e : 0) * GEO_EL);
    encNum(lat - plat, out); encNum(lon - plon, out); encNum(ele - pele, out);
    plat = lat; plon = lon; pele = ele;
  }
  return out.join('');
}

function decodeGeo(str) {
  const coords = [];
  let i = 0, lat = 0, lon = 0, ele = 0;
  const next = function () {
    let res = 0, shift = 0, b;
    do {
      if (i >= str.length) return null;
      b = str.charCodeAt(i++) - 63;
      res |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return (res & 1) ? ~(res >>> 1) : (res >>> 1);
  };
  while (i < str.length) {
    const a = next(), b = next(), c = next();
    if (a === null || b === null || c === null) break;
    lat += a; lon += b; ele += c;
    coords.push([lon / GEO_LL, lat / GEO_LL, ele / GEO_EL]);
  }
  return coords;
}

/* Das GPX wird geschrieben, nicht geholt. Es enthält nichts, was nicht schon
   in der GeoJSON-Antwort stand, mit der die Linie gezeichnet wurde: dieselben
   Punkte, dieselben Höhen, dazu eine Kommentarzeile mit den Kennzahlen. Die
   `messages`, aus denen die Analyse entsteht, kennt es nicht einmal — das GPX
   ist die ärmere der beiden Antworten. Teilen kostete bisher trotzdem eine
   zweite Anfrage für Daten, die längst da waren.

   Nachgeprüft am 19.08.2026 gegen drei Referenzstrecken (2, 43 und 156 km),
   jeweils in beiden Formaten geholt: die erzeugte Datei ist Byte für Byte die
   des Servers. An der Web-Share-Mechanik ändert das nichts — nur die Herkunft
   der Bytes. Sie wird sogar sicherer, weil zwischen Tap und `navigator.share`
   kein `await` mehr liegt, an dem die Nutzergeste verfallen könnte. */

/* BRouter schreibt Höhen mit mindestens einer Nachkommastelle: 480.0, aber
   485.25 — die Viertelmeter kommen so durch. */
function eleStr(v) {
  return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function hms(sec) {
  const s = Math.round(Number(sec) || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + (s % 60) + 's';
}

/* „energy=.3kwh" — eine Nachkommastelle, führende Null weg. */
function kwh(joule) {
  return ((Number(joule) || 0) / 3600000).toFixed(1).replace(/^0/, '') + 'kwh';
}

function buildGpx(r) {
  const m = r.meta, l = [];
  l.push('<?xml version="1.0" encoding="UTF-8"?>');
  l.push('<!-- track-length = ' + m.len + ' filtered ascend = ' + m.asc +
         ' plain-ascend = ' + m.plain + ' cost=' + m.cost +
         ' energy=' + kwh(m.energy) + ' time=' + hms(m.time) + ' -->');
  l.push('<gpx ');
  l.push(' xmlns="http://www.topografix.com/GPX/1/1" ');
  l.push(' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ');
  l.push(' xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" ');
  l.push(' creator="' + m.creator + '" version="1.1">');
  l.push(' <trk>');
  l.push('  <name>' + m.name + '</name>');
  l.push('  <trkseg>');
  const c = r.coords;
  for (let i = 0; i < c.length; i++) {
    l.push('   <trkpt lon="' + c[i][0].toFixed(6) + '" lat="' + c[i][1].toFixed(6) +
           '"><ele>' + eleStr(c[i][2]) + '</ele></trkpt>');
  }
  l.push('  </trkseg>');
  l.push(' </trk>');
  l.push('</gpx>');
  return l.join('\n') + '\n';
}

/* Die acht Angaben, die im Kopf des GPX stehen — als Zeichenketten übernommen,
   genau wie sie kamen. Vier davon liegen als Zahl auch in der Route; hier
   zählt aber die unveränderte Schreibweise, sonst wäre die erzeugte Datei
   nicht mehr dieselbe. Zusammen rund 90 Byte. */
function gpxMeta(props) {
  const t = function (v) { return v === undefined || v === null ? '' : String(v); };
  return {
    len: t(props['track-length']), asc: t(props['filtered ascend']),
    plain: t(props['plain-ascend']), cost: t(props.cost),
    energy: t(props['total-energy']), time: t(props['total-time']),
    creator: t(props.creator) || 'BRouter', name: t(props.name) || 'brouter'
  };
}

/* Eine Route entsteht auf zwei Wegen: frisch vom Server und aus dem Archiv.
   Beide müssen dasselbe Objekt ergeben — sonst zeigte eine geöffnete Tour
   etwas anderes an als dieselbe Route direkt nach der Berechnung. Deshalb
   liegt der Bau an genau einer Stelle. */
function makeEntry(o) {
  const coords = o.coords;
  /* Fürs Diagramm bleibt es bei 140 Stützstellen — mehr als ein Punkt je
     Bildschirmspalte bringt nichts. Für die LINIE galt das nie: Auf 43 km
     stand damit alle 310 m ein Punkt, und jede Kehre war abgeschnitten. */
  const series = sample(coords, 140);
  return {
    key: KEYS[state.routes.length] || '?',
    pts: o.pts, ngs: o.ngs,
    basis: o.basis, profileId: o.profileId, profileName: o.profileName,
    params: o.params, blocks: o.blocks || [],
    tourName: o.tourName || null,
    distance: num(o.meta.len), ascend: num(o.meta.asc),
    time: num(o.meta.time), cost: num(o.meta.cost),
    coords: coords, meta: o.meta,
    /* Beim Öffnen liegt die kodierte Fassung schon vor; frisch gerechnet
       entsteht sie erst beim Speichern — die meisten Routen werden nie
       gespeichert. */
    geo: o.geo || null,
    series: series,
    marks: waypointMarks(series),
    span: elevationSpan(coords),
    analysis: o.analysis || null,
    layer: null
  };
}

/* Auswählen ändert die Raste NICHT: Wer vergleicht, will die Zahlen wechseln
   sehen, nicht das Blatt springen. */
/* Beim Wechsel folgt das aktive Profil der Route. Sonst zeigte die Pille oben
   links etwas anderes an, als die ausgewählte Route unten — und die nächste
   Berechnung liefe mit einem Profil, das man gar nicht gewählt hat.

   Existiert das Profil nicht mehr (gelöscht, umbenannt, oder es waren nur
   übernommene Werte), entsteht daraus wieder ein Sitzungsprofil: Die Werte
   liegen in der Route ohnehin als Kopie, es wäre albern, sie zu verwerfen. */
function adoptProfileOf(r) {
  const p = byId(r.profileId);
  if (p && p.id === r.profileId && p.basis === r.basis) {
    store.active = p.id;
    $('#pillName').textContent = p.name;
    return;
  }
  store.session = {
    name: r.profileName, basis: r.basis,
    params: JSON.parse(JSON.stringify(r.params || {})),
    blocks: (r.blocks || []).slice()
  };
  store.active = 'session';
  $('#pillName').textContent = r.profileName;
}

function selectRoute(i) {
  if (i === state.ra || !state.routes[i]) return;
  scrubHide();
  state.prev = aroute();
  state.ra = i;
  adoptProfileOf(aroute());
  persist();
  renderProfiles(); renderAllProfiles();
  paintRoutes();
  showRoute();
  toast('Route ' + aroute().key + ' ausgewählt · ' + aroute().profileName + '.');
}

/* Die Karte reicht unter das Blatt und unter die Kopfleiste. Ein gleichmäßiger
   Rand würde Start und Ziel darunter schieben — man sähe seine eigene Route
   nicht ganz. Deshalb oben und unten so viel Rand, wie tatsächlich verdeckt ist. */
function fitRoute() {
  const r = aroute();
  if (!r || !r.layer) return;
  const sh = $('#sheet').getBoundingClientRect().height;
  map.fitBounds(r.layer.getBounds(), {
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

/* Stützstellen gleichmäßig nach STRECKE, nicht nach Index. Nur so stimmt die
   Zuordnung Höhenprofil → Kartenpunkt: BRouter liefert dort dichte Punkte, wo
   der Weg kurvig ist, und dünne auf der Geraden. Über den Index gegangen liefe
   der Punkt beim Anfahren aus dem Tritt. */
function sample(coords, n) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum[i] = cum[i - 1] + L.latLng(coords[i - 1][1], coords[i - 1][0])
      .distanceTo(L.latLng(coords[i][1], coords[i][0]));
  }
  const total = cum[cum.length - 1] || 1;
  const pts = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = total * k / (n - 1);
    while (j < coords.length - 2 && cum[j + 1] < d) j++;
    const nx = Math.min(j + 1, coords.length - 1);
    const span = (cum[nx] - cum[j]) || 1;
    const t = Math.max(0, Math.min(1, (d - cum[j]) / span));
    const e0 = Number(coords[j][2]), e1 = Number(coords[nx][2]);
    pts.push({
      lat: coords[j][1] + (coords[nx][1] - coords[j][1]) * t,
      lng: coords[j][0] + (coords[nx][0] - coords[j][0]) * t,
      ele: Number.isFinite(e0) ? e0 + ((Number.isFinite(e1) ? e1 : e0) - e0) * t : null,
      d: d
    });
  }
  return { pts: pts, total: total };
}

/* Tiefster und höchster Punkt aus ALLEN Koordinaten, nicht nur aus den
   gezeichneten Stützstellen. Sonst weicht die angezeigte Spanne von der
   tatsächlichen ab — beim Test 237–878 statt 238–881. */
function elevationSpan(coords) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < coords.length; i++) {
    const v = Number(coords[i][2]);
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return Number.isFinite(lo) && Number.isFinite(hi) ? { lo: lo, hi: hi } : null;
}

/* Wo liegen die Wegpunkte auf der Strecke? Fuer jeden wird die naechste
   Stuetzstelle gesucht; daraus ergibt sich der Anteil an der Gesamtstrecke.
   Start und Ziel bleiben weg — sie sind die Raender des Diagramms. */
function waypointMarks(series) {
  const pts = series.pts;
  const out = [];
  state.wps.forEach(function (w, n) {
    if (n === 0 || n === state.wps.length - 1) return;
    const ll = w.marker.getLatLng();
    let best = 0, bd = Infinity;
    pts.forEach(function (p, i) {
      const d = (p.lat - ll.lat) * (p.lat - ll.lat) + (p.lng - ll.lng) * (p.lng - ll.lng);
      if (d < bd) { bd = d; best = i; }
    });
    out.push({ f: best / (pts.length - 1), n: n + 1 });
  });
  return out;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function nk(v) { return v.toFixed(1).replace('.', ','); }

/* --------------------------------------------------- Anzeige der Route */

function showRoute() {
  const r = aroute();
  if (!r) {
    $('#readout').hidden = true;
    $('#analysis').hidden = true;
    $('#rchips').hidden = true;
    $('#rdelta').hidden = true;
    $('#clearBtn').hidden = true;
    return;
  }

  $('#rDist').innerHTML = r.distance === null ? '–'
    : nk(r.distance / 1000) + '<small>km</small>';
  $('#rAsc').innerHTML = r.ascend === null ? '–'
    : Math.round(r.ascend) + '<small>hm</small>';
  $('#rTime').innerHTML = r.time === null ? '–' : hhmm(r.time) + '<small>h</small>';
  $('#readout').hidden = false;
  $('#sheetProfile').textContent = 'Route ' + r.key + ' · ' + r.profileName +
    (r.tourName ? ' · ' + r.tourName : '');

  renderChips();
  renderDelta();
  drawElevation(r);

  const a = r.analysis;
  if (a) {
    fillBar('#barSurface', '#legSurface', a.surface);
    fillBar('#barRoad', '#legRoad', a.road);
    $('#surfSum').textContent = nk(a.pavedPct) + ' % befestigt';
    $('#roadSum').textContent = nk(a.mainPct) + ' % Hauptstraße';
    const flag = $('#fastFlag');
    if (a.fastPct >= 3) {
      $('#fastPct').textContent = nk(a.fastPct) + ' %';
      $('#fastText').innerHTML = 'der Strecke liegt auf Straßen mit <b>Tempo 70 oder mehr</b>. ' +
        'Der Regler „Autoverkehr meiden“ bewertet das nicht — er kennt nur die ' +
        'Verkehrsschätzung. Der Baustein <b>Tempolimit meiden</b> tut es.';
      flag.hidden = false;
    } else {
      flag.hidden = true;
    }
    $('#analysis').hidden = false;
  } else {
    $('#analysis').hidden = true;
  }

  $('#clearBtn').hidden = state.routes.length < 2;
  syncButtons();
  /* Bewusst OHNE Neuvermessung: positionRail() nimmt die gerenderte Hoehe.
     measureSheet faltet das Blatt zum Messen kurz auf null — laeuft dabei
     gerade eine Hoehenanimation, startet sie von vorn, und mitten in der
     Bewegung stand die Leiste dann an der falschen Stelle. Wer die Raste
     wechselt, ruft setDetent; das misst einmal und reicht den Wert durch. */
  positionRail();
}

/* Nur der Buchstabe. Mit „A · Wenig Verkehr · 43,4 km" wird die Zeile bei drei
   Varianten breiter als der Bildschirm — und Durchklicken, der Zweck des
   Stapels, wird zum Scrollen. Der ganze Kontext steht darunter. */
function renderChips() {
  const host = $('#rchips');
  host.textContent = '';
  state.routes.forEach(function (r, i) {
    const on = i === state.ra;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rchip' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.setAttribute('aria-label', 'Route ' + r.key + ' · ' + r.profileName);
    b.innerHTML = '<span class="sw"></span>' + r.key;
    b.addEventListener('click', function () { selectRoute(i); });
    host.appendChild(b);

    /* Das Kreuz nur am ausgewaehlten Reiter: An jedem waere die Zeile ein Feld
       aus Loeschknoepfen, und man traefe beim Durchklicken das Falsche. */
    if (on && state.routes.length > 1) {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'rkill';
      x.setAttribute('aria-label', 'Route ' + r.key + ' entfernen');
      x.textContent = '×';
      x.addEventListener('click', function () { removeRoute(i); });
      host.appendChild(x);
    }
  });
  host.hidden = state.routes.length < 2;
}

/* Der Vergleich steht als Differenz da, nicht als zweite Zahlenreihe: Wer zwei
   vollständige Kennzahlensätze nebeneinander legt, rechnet im Kopf. Bezug ist
   die ZULETZT ausgewählte Route — wer von B nach C springt, will den
   Unterschied zu B sehen. */
function renderDelta() {
  const el = $('#rdelta');
  const a = aroute();
  let b = state.prev;
  if (b === a || state.routes.indexOf(b) === -1) b = null;
  if (!b) {
    state.routes.forEach(function (r, i) { if (i !== state.ra && !b) b = r; });
  }
  if (!a || !b) { el.hidden = true; el.textContent = ''; return; }

  const teile = [];
  teile.push('<span>gegenüber ' + b.key + '</span>');
  if (a.distance !== null && b.distance !== null) {
    teile.push(diff((a.distance - b.distance) / 1000, ' km', function (v) { return nk(v); }));
  }
  if (a.ascend !== null && b.ascend !== null) {
    teile.push(diff(a.ascend - b.ascend, ' hm', function (v) { return String(Math.round(v)); }));
  }
  if (a.time !== null && b.time !== null) {
    teile.push(diff((a.time - b.time) / 60, ' min', function (v) { return String(Math.round(v)); }));
  }
  if (a.analysis && b.analysis) {
    teile.push('<span>Tempo 70+: <b>' + nk(a.analysis.fastPct) + ' %</b> statt ' +
               nk(b.analysis.fastPct) + ' %</span>');
  }
  el.innerHTML = teile.join('');
  el.hidden = false;
}

function diff(v, einheit, fmt) {
  /* „−0,0 km" ist keine Aussage. Wo der Unterschied auf die angezeigte
     Genauigkeit null ist, steht das auch da — und zwar ohne Vorzeichenfarbe,
     denn es ist weder besser noch schlechter. */
  const txt = fmt(Math.abs(v));
  if (Number(txt.replace(',', '.')) === 0) {
    return '<span>±0' + einheit + '</span>';
  }
  const cls = v > 0 ? 'more' : 'less';
  const vz = v > 0 ? '+' : '−';
  return '<span class="' + cls + '">' + vz + txt + einheit + '</span>';
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

function drawElevation(r) {
  const svg = $('#elev');
  const pts0 = r.series.pts.filter(function (p) { return p.ele !== null; });
  if (pts0.length < 2 || !r.span) { svg.innerHTML = ''; return; }

  const lo = r.span.lo, hi = r.span.hi;
  const pad = Math.max(20, (hi - lo) * 0.12);
  const a = lo - pad, b = hi + pad;
  /* Die Breite kommt aus dem Element, nicht aus einer festen Zahl. Vorher stand
     hier W = 340 zusammen mit preserveAspectRatio="none" — auf einem breiten
     Fenster zog das die Beschriftung der Höhenachse in die Länge, weil das SVG
     samt Schrift horizontal gedehnt wurde. Mit einer viewBox in echten Pixeln
     ist eine SVG-Einheit ein Bildpunkt, und nichts verzerrt mehr. */
  const W = Math.max(200, Math.round(svg.clientWidth || 340));
  const H = 104;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const pts = pts0.map(function (p, i) {
    return [i / (pts0.length - 1) * W, H - 4 - ((p.ele - a) / (b - a)) * (H - 16)];
  });
  const d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L');

  let grid = '';
  gridLines(lo, hi).forEach(function (v) {
    const y = H - 4 - ((v - a) / (b - a)) * (H - 16);
    grid += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + W + '" y2="' + y.toFixed(1) +
            '" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 4"/>' +
            '<text class="axis" x="2" y="' + (y - 3).toFixed(1) + '">' + v + '</text>';
  });
  let top = 0;
  pts0.forEach(function (p, i) { if (p.ele > pts0[top].ele) top = i; });
  const pk = pts[top];

  /* Zwischenpunkte klein und dezent, damit man sie im Profil wiederfindet —
     ohne dass sie die Linie ueberdecken. */
  let marks = '';
  (r.marks || []).forEach(function (m) {
    const x = (m.f * W).toFixed(1);
    marks += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H +
             '" stroke="var(--faint)" stroke-width="1" stroke-dasharray="1 3"/>' +
             '<text class="axis" x="' + (Number(x) + 3).toFixed(1) + '" y="10">' +
             m.n + '</text>';
  });

  svg.innerHTML =
    '<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--signal)" stop-opacity=".30"/>' +
    '<stop offset="100%" stop-color="var(--signal)" stop-opacity="0"/>' +
    '</linearGradient></defs>' + grid + marks +
    '<path d="' + d + 'L' + W + ' ' + H + 'L0 ' + H + 'Z" fill="url(#eg)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--signal)" stroke-width="1.9" ' +
    'stroke-linejoin="round" stroke-linecap="round"/>' +
    '<circle cx="' + pk[0].toFixed(1) + '" cy="' + pk[1].toFixed(1) +
    '" r="3" fill="var(--signal)" stroke="var(--sheet)" stroke-width="1.6"/>';
  svg.setAttribute('aria-label',
    'Höhenprofil von ' + Math.round(lo) + ' bis ' + Math.round(hi) + ' Metern');

  $('#eleRange').textContent = Math.round(lo) + ' – ' + Math.round(hi) + ' m';
  if (r.distance !== null) {
    $('#eleMid').textContent = nk(r.distance / 2000) + ' km';
    $('#eleEnd').textContent = nk(r.distance / 1000) + ' km';
  }
}

/* ------------------------------------------- Höhenprofil anfahren

   Ein Finger auf dem Profil, ein Punkt auf der Karte. Das ist der Grund,
   warum es die halbe Raste gibt: Im Vollbild bliebe von der Karte nichts,
   in der kleinen Raste gäbe es kein Profil.

   Der Punkt ist eine Leaflet-Ebene und kein Element über der Karte — so
   bleibt er beim Verschieben und Zoomen an seiner Stelle liegen, ohne dass
   die App das nachrechnen muss. */

let scrubMarker = null;

function scrubHide() {
  if (scrubMarker) { map.removeLayer(scrubMarker); scrubMarker = null; }
  const l = $('#scrubLine');
  if (l) l.hidden = true;
}

function scrubAt(clientX) {
  const r = aroute();
  if (!r) return;
  const box = $('#elev').getBoundingClientRect();
  if (!box.width) return;
  const f = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
  const pts = r.series.pts;
  const p = pts[Math.round(f * (pts.length - 1))];
  if (!p) return;

  const text = nk(p.d / 1000) + ' km' + (p.ele === null ? '' : ' · ' + Math.round(p.ele) + ' m');
  const icon = L.divIcon({
    className: 'scrub-hit',
    html: '<div class="scrub"><b>' + text + '</b><i></i></div>',
    iconSize: [13, 13], iconAnchor: [6.5, 6.5]
  });
  if (scrubMarker) {
    scrubMarker.setLatLng([p.lat, p.lng]);
    scrubMarker.setIcon(icon);
  } else {
    scrubMarker = L.marker([p.lat, p.lng], { icon: icon, interactive: false, keyboard: false })
      .addTo(map);
  }
  const line = $('#scrubLine');
  line.hidden = false;
  line.style.left = (f * 100) + '%';
}

(function () {
  const el = $('#elev');
  let on = false;
  el.addEventListener('pointerdown', function (e) {
    on = true;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    scrubAt(e.clientX);
  });
  el.addEventListener('pointermove', function (e) { if (on) scrubAt(e.clientX); });
  /* Der Punkt bleibt nach dem Loslassen stehen — man lässt los, um auf die
     Karte zu schauen. Weg ist er beim nächsten Tap auf die Karte. */
  el.addEventListener('pointerup', function () { on = false; });
  el.addEventListener('pointercancel', function () { on = false; });
})();

/* Hoechstens vier Linien, und die Stufe waechst mit der Spanne. Bei fuenf
   Linien auf 104 px Hoehe standen die Zahlen so dicht, dass sie sich
   beruehrten — lesbar ist wichtiger als vollstaendig. */
function gridLines(lo, hi) {
  const span = hi - lo;
  const step = span > 900 ? 250 : span > 400 ? 200 : span > 150 ? 100 : 20;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out.slice(0, 4);
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

/* Alles, was kein Buchstabe und keine Ziffer ist, wird zum Bindestrich —
   Doppelte fallen zusammen, Raender weg. Umlaute bleiben: Sie sind in
   Dateinamen auf iOS unbedenklich, und „Hoehenrunde" statt „Höhenrunde" waere
   eine Verschlimmbesserung. Gedeckelt wird bei 40 Zeichen; Tournamen duerfen
   60 lang sein, und der Rest des Namens braucht auch noch Platz. */
function sauber(s) {
  const v = String(s || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  if (v.length <= 40) return v;
  /* Beim Kuerzen am letzten Bindestrich abschneiden, nicht mitten im Wort —
     „…bis-an-die" liest sich, „…bis-an-di" sieht nach Fehler aus. */
  const kurz = v.slice(0, 40);
  const bis = kurz.lastIndexOf('-');
  return (bis > 10 ? kurz.slice(0, bis) : kurz).replace(/-+$/, '');
}

/* Traegt der Name ueberhaupt etwas bei? Der beim Speichern vorgeschlagene
   Tourname ist „19.08.2026 · 43,5 km" — Datum und Distanz stehen aber ohnehin
   im Dateinamen, und wer den Vorschlag stehen laesst, bekaeme sie doppelt.
   Ein Name ohne ein einziges Wort sagt nichts, was der Rest nicht schon sagt. */
function traegtEtwas(n) { return /\p{L}{3,}/u.test(n); }

/* Der Dateiname trägt, woran man die Datei wiedererkennt. „2026-08-19_Route.gpx"
   tat das nicht: Wer drei Strecken an einem Tag teilt, hat in der Dateien-App
   „Route.gpx", „Route-2.gpx", „Route-3.gpx" liegen und muss jede oeffnen.

   Datum zuerst, damit die Liste chronologisch faellt. In die Mitte das
   Aussagekraeftigste, was ohne einen zweiten Dienst zu haben ist: der Tourname,
   wenn die Route aus dem Archiv kommt oder gespeichert wurde — sonst der
   Profilname, denn genau darin unterscheiden sich die Routen eines Stapels.
   Hinten die Distanz, die zwei Varianten derselben Frage auseinanderhaelt.
   Ortsnamen waeren besser, brauchen aber umgekehrte Geokodierung — dieselbe
   Entscheidung wie bei den Tournamen, siehe CLAUDE.md. */
function gpxName(r) {
  const teile = [today()];
  let mitte = sauber(r.tourName);
  if (!traegtEtwas(mitte)) mitte = sauber(r.profileName);
  if (traegtEtwas(mitte)) teile.push(mitte);
  if (Number.isFinite(r.distance)) teile.push((r.distance / 1000).toFixed(1) + 'km');
  return teile.join('_') + '.gpx';
}

/* Kein Netz mehr im Spiel: Die Datei entsteht aus den Punkten, die ohnehin
   daliegen. Damit laesst sich auch eine gespeicherte Tour teilen, waehrend der
   Server gedrosselt hat oder gar nicht antwortet — und zwischen Tap und
   navigator.share liegt kein await mehr.

   Nichts wird zwischengespeichert: Das Schreiben kostet 1,2 ms bei 4335 Punkten
   (gemessen am 19.08.2026 im Desktop-Browser), ein gemerktes File aber truege
   nach einem Umbenennen der Tour noch den alten Dateinamen. */
function share() {
  const r = aroute();
  if (!r || state.busy) return;
  shareOrDownload(new File([buildGpx(r)], gpxName(r),
                           { type: 'application/gpx+xml' }), 'GPX');
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
  toastT = setTimeout(function () { t.classList.remove('show'); }, 3800);
}

/* Die Statuszeile ist der einzige Ort, an dem der Zustand STEHEN bleibt — eine
   Einblendung ist nach drei Sekunden weg. Deshalb bleibt sie, aber nur, solange
   sie etwas sagt, das man nicht ohnehin sieht: solange keine Route da ist, und
   immer bei Fehlern und waehrend gerechnet wird. „Route B berechnet." neben den
   Kennzahlen von Route B waere gedoppelt. Siehe OFFENE-PUNKTE.md, P13. */
function setStatus(text, kind) {
  const el = $('#status');
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
  el.hidden = !text || (state.routes.length > 0 && kind !== 'error' && kind !== 'busy');
}

function syncButtons() {
  $('#calcBtn').disabled = state.busy || state.wps.length < 2;
  $('#shareBtn').disabled = state.busy || !aroute();
  $('#saveBtn').disabled = state.busy || !aroute();
  $('#clearBtn').disabled = state.busy || state.routes.length < 2;
}

/* ------------------------------------------------------ Blatt-Rasten */

/* Vier Zustände, jeder mit eigenem Inhalt:
     leer  — noch nichts gerechnet: nur der Knopf
     klein — Route da: Kennzahlen und Bedienung (Reiter erst ab zwei Routen)
     halb  — dazu das Höhenprofil, während die Karte sichtbar bleibt
     voll  — die ganze Analyse

   Die halbe Raste ist der Zustand nach jeder Berechnung und der einzige, in
   dem Karte und Höhenprofil zugleich sichtbar sind — genau das braucht das
   Anfahren einer Stelle im Profil. */
const DETENTS = ['empty', 'peek', 'half', 'full'];
let detent = 0;

/* Misst, wie hoch das Blatt in einem Zustand sein müsste. Zwei Fallen stecken
   darin, beide am 19.08.2026 aufgelaufen:

   1. `scrollHeight` meldet mindestens die aktuelle Fensterhöhe. Ohne das
      Zusammenfalten auf null misst man das Blatt von eben statt seines Inhalts.
   2. Zusammenfalten allein genügt nicht: Mit laufender Höhen-Animation gilt
      fürs Layout der ANIMIERTE Wert, nicht der gesetzte — gemessen kam dann
      dreimal fast dasselbe heraus.

   Die Reihenfolge am Ende ist Absicht: erst die Höhe zurück und einmal
   festschreiben, solange die Bewegung aus ist, dann die Bewegung wieder
   scharf machen. Sonst führe das Blatt sichtbar von null hoch. */
function measureSheet(zustand) {
  const sheet = $('#sheet');
  const vorher = sheet.getAttribute('data-detent');
  const hoehe = sheet.style.height;
  const bewegung = sheet.style.transition;
  sheet.style.transition = 'none';
  sheet.setAttribute('data-detent', zustand);
  sheet.style.height = '0px';
  const h = $('.sheetscroll').scrollHeight + $('#grab').offsetHeight + 2;
  sheet.setAttribute('data-detent', vorher);
  sheet.style.height = hoehe;
  void sheet.offsetHeight;
  sheet.style.transition = bewegung;
  void sheet.offsetHeight;
  return h;
}

/* Die gemessenen Hoehen werden gepuffert. Grund: measureSheet faltet das Blatt
   zum Messen kurz auf null — geschieht das waehrend einer laufenden
   Hoehenanimation, startet die Animation von vorn, und das Blatt bleibt auf
   halbem Weg stehen. Beim Durchklicken der Rasten hinkte die gerenderte Hoehe
   dadurch einen Schritt hinterher.

   Ungueltig wird der Puffer nur, wenn sich am Inhalt etwas aendert: eine Route
   kommt dazu oder faellt weg, oder das Fenster aendert seine Groesse. */
let detentCache = null;
function detentsInvalidieren() { detentCache = null; }

/* Wie viel nimmt sich das System oben — Statusleiste, Notch, Dynamic Island?
   Die Seite laeuft mit `viewport-fit=cover`, der Ursprung liegt also am oberen
   Bildschirmrand und nicht unterhalb davon. In JS ist `env(safe-area-inset-top)`
   nicht auszulesen; ein Messklotz mit genau dieser Hoehe schon. `visibility`
   statt `display`, sonst gaebe es nichts zu messen. */
let safeProbe = null;
function safeTop() {
  if (!safeProbe) {
    safeProbe = document.createElement('div');
    safeProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;' +
      'height:env(safe-area-inset-top);pointer-events:none;visibility:hidden;';
    document.body.appendChild(safeProbe);
  }
  return safeProbe.offsetHeight;
}

function detentPx() {
  if (detentCache) return detentCache;
  const H = document.documentElement.clientHeight;
  const leer = measureSheet('empty');
  const klein = Math.min(measureSheet('peek'), H * 0.55);
  /* Die halbe Raste endet unter der Höhenprofil-Karte. Ein fester Prozentwert
     träfe das nie — die Karte ist mal höher, mal niedriger. */
  const karte = $('#analysis .card');
  let zu = 0;
  if (karte) {
    const sheet = $('#sheet');
    const vorher = sheet.getAttribute('data-detent');
    sheet.setAttribute('data-detent', 'full');
    zu = karte.offsetHeight + 16;
    sheet.setAttribute('data-detent', vorher);
  }
  /* Vollbild heisst voll: Ein Streifen Karte bleibt nur als Griff zum
     Zurueckziehen — 44 px reichen dafuer. Sie liegen aber AUSSERHALB dessen,
     was das System fuer sich nimmt.

     Am 19.08.2026 am Geraet aufgelaufen: Ohne den Zuschlag beginnt der Streifen
     am obersten Bildschirmpunkt, und der Griff sitzt damit unter der Dynamic
     Island. Die schluckt den Tap — aus der vollen Raste kam man weder durch
     Ziehen noch durch Tippen heraus. Es war eine Sackgasse, kein Schoenheits-
     fehler. Auf Geraeten ohne Insel ist der Zuschlag null, dort aendert sich
     nichts. */
  const voll = H - 44 - safeTop();
  detentCache = [leer, klein, Math.min(klein + zu, H * 0.62, voll), voll];
  return detentCache;
}

function setDetent(i) {
  /* Ohne Route gibt es nur den leeren Zustand — es wäre nichts zu zeigen.
     Und aus ihm führt kein Griff heraus, sondern nur eine Berechnung. */
  detent = state.routes.length ? Math.max(1, Math.min(3, i)) : 0;
  const sheet = $('#sheet');
  sheet.setAttribute('data-detent', DETENTS[detent]);
  const px = detentPx()[detent];
  sheet.style.height = px + 'px';
  positionRail(px);
  afterSheetSettled(function () {
    map.invalidateSize({ pan: false });
    positionRail();
    /* Das Hoehenprofil zeichnet in echten Pixeln, damit die Beschriftung nicht
       verzerrt. Damit haengt es an der Breite — und die aendert sich, sobald
       das Blatt aufgeht oder das Fenster sich dreht. Ohne diesen Aufruf bliebe
       eine viewBox von vorhin stehen, und das Profil waere doch wieder
       gestaucht. */
    if (aroute()) drawElevation(aroute());
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

/* Die Leiste sitzt immer ÜBER dem Blatt und bleibt stehen, solange sie Platz
   hat — auch in der halben Raste, denn dort wird gearbeitet. Erst wenn oben
   weniger übrig bleibt als sie hoch ist, verschwindet sie.

   Gedeckelt wird nichts: Eine Deckelung auf 52 % der Fensterhöhe schob die
   Leiste am 18.08.2026 unter das Blatt, und der unterste Knopf war
   unerreichbar. Wer nach oben begrenzen will, muss ausblenden, nicht tiefer
   setzen. */
function positionRail(target) {
  const sheet = $('#sheet');
  const sh = (target !== undefined && target !== null)
    ? target : sheet.getBoundingClientRect().height;
  const rail = $('#rail');
  const height = rail.getBoundingClientRect().height || 250;
  const bottom = sh + 14;
  const frei = document.documentElement.clientHeight - bottom;
  rail.classList.toggle('hidden', frei - height < 70);
  rail.style.bottom = bottom + 'px';

  /* Linke Kante: erst der Zoom, darunter die Nennung der Datenquellen. Beide
     verschwinden, sobald der Streifen Karte zu schmal wird — sie mit nach oben
     wandern zu lassen hiesse, sie im Vollbild auf die Profilpille zu schieben. */
  const at = $('#attribWrap'), zo = $('#zoom');
  const engZu = frei < 92;
  at.style.bottom = bottom + 'px';
  zo.style.bottom = (bottom + 42) + 'px';
  at.classList.toggle('hidden', engZu);
  zo.classList.toggle('hidden', frei < 130);
  if (engZu) $('#attribBox').hidden = true;
}

/* ------------------------------------------------------------ Ebenen

   Der z-index wird beim Öffnen vergeben, aufsteigend. Ein fester Wert je
   Ebene reicht nicht, sobald zwei gleichzeitig offen sein können — dann
   entschiede die Reihenfolge im Markup, welche obenauf liegt. */

let topZ = 70;
const SHEETS = ['profiles', 'menu', 'savedlg', 'namedlg', 'confirmdlg', 'layers'];

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
  /* Das Routenblatt gehoert zur Grundebene: Geht eine Ebene darueber auf,
     faehrt es auf die kleinste Raste zurueck, statt um denselben Platz am
     unteren Rand zu streiten. Ohne Route ist die kleinste der leere Zustand —
     setDetent klemmt das selbst zurecht. */
  if (detent > 1) setDetent(1);
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

  /* Was gemessen wurde, steht neben dem Regler und nicht nur in einer
     Markdown-Datei: Ein Wert ohne Groessenordnung ist eine Zumutung — man
     verschiebt ihn und weiss nicht, ob sich fuenf Meter oder fuenf Kilometer
     aendern. Die Belege stehen samt Datum in BROUTER.md und messungen/. */
  const mess = def.messung ? document.createElement('p') : null;
  if (mess) { mess.className = 'pmess'; mess.textContent = def.messung; }

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
    if (mess) el.appendChild(mess);
    return el;
  }

  if (def.type === 'choice') {
    el.append(top, desc);
    if (mess) el.appendChild(mess);
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
  if (mess) el.appendChild(mess);

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
  draftBlocks = blocksOf(p).slice();
  /* Werte der Bausteine gehoeren zur Arbeitskopie wie alle anderen. */
  draftBlocks.forEach(function (bid) {
    const b = bausteinById(bid);
    if (!b || !b.param) return;
    draft[b.param.key] = Object.prototype.hasOwnProperty.call(p.params, b.param.key)
      ? p.params[b.param.key] : b.param.def;
  });

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

/* Drei Wege, und der einfachste steht oben. „Bestehendes überschreiben" hiess
   das mittlere frueher — missverstaendlich, weil es klingt, als wuerde etwas
   ausserhalb dieses Profils ersetzt. Jetzt steht der Name des Profils daneben,
   und der Regelfall ist ohnehin ein anderer: uebernehmen, ohne etwas anzulegen. */
function askSave() {
  const p = byId(editing);
  const eigenesEchtes = p.eigen && !p.sitzung;
  $('#saveName').value = eigenesEchtes ? p.name : p.name + ' (geändert)';
  $('#saveOver').hidden = !eigenesEchtes;
  $('#saveOver').textContent = eigenesEchtes ? '„' + p.name + '“ aktualisieren' : '';
  $('#saveHint').innerHTML = 'Du hast <b>' + esc(p.name) + '</b> geändert.';
  $('#saveUseNote').innerHTML = 'Die Werte gelten ab sofort fürs Rechnen, ohne dass ein ' +
    'Profil entsteht. Sie hängen an der Route: Wird sie gespeichert, kommen sie als ' +
    'Kopie mit — eine gespeicherte Tour lässt sich also immer nachrechnen. ' +
    'Erst „Als neues Profil sichern“ nimmt sie dauerhaft in die Liste auf.';
  openSheet('savedlg');
}

/* Uebernehmen: Werte werden aktiv, ohne in die Profilliste zu wandern. */
function useDraft() {
  const src = byId(editing);
  store.session = {
    name: src.sitzung ? src.name : src.name + ' (geändert)',
    basis: src.basis,
    params: blockParams(diffFromBase(src.basis, draft)),
    blocks: draftBlocks.slice()
  };
  dirty = false;
  store.active = 'session';
  $('#pillName').textContent = store.session.name;
  if (!state.routes.length) $('#sheetProfile').textContent = store.session.name;
  persist();
  renderProfiles(); renderAllProfiles();
  backFromEditor();
  toast('Werte übernommen — noch einmal rechnen legt die Route dazu.');
}

/* Die Werte der Bausteine stehen nicht im Katalog des Basisprofils und
   fielen deshalb bei diffFromBase heraus. Sie werden hier wieder angehaengt. */
function blockParams(out) {
  draftBlocks.forEach(function (bid) {
    const b = bausteinById(bid);
    if (!b || !b.param) return;
    out[b.param.key] = Object.prototype.hasOwnProperty.call(draft, b.param.key)
      ? draft[b.param.key] : b.param.def;
  });
  return out;
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
    basis: src.basis, params: blockParams(diffFromBase(src.basis, draft)),
    blocks: draftBlocks.slice()
  };
  store.profiles.push(p);
  /* Aus der Sitzung wird ein richtiges Profil — sie hat damit ihren Zweck
     erfuellt und wuerde sonst als Doppel danebenstehen. */
  if (src.sitzung) store.session = null;
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
  p.params = blockParams(diffFromBase(p.basis, draft));
  /* Aendern sich die Bausteine, ist der hochgeladene Text veraltet. */
  if (JSON.stringify(blocksOf(p)) !== JSON.stringify(draftBlocks)) {
    p.uploadId = null; p.uploadHash = null;
  }
  p.blocks = draftBlocks.slice();
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

/* Die Kennzeile sagt, woran man ist — aber an beiden Orten etwas anderes:

   In der Kurzauswahl (fuenf Zeilen quer durch alle Gruppen) zaehlt, ob das
   Profil eigenes oder mitgeliefertes ist und wofuer es gedacht ist — die
   Gruppe ist dort die schnellste Orientierung.

   In der Vollliste steht beides schon in der Ueberschrift der Gruppe. Es dort
   zu wiederholen fuellt jede Zeile mit derselben Angabe. Dort zaehlt statt
   dessen der echte Serverbezeichner: Er ist das, was die Namen verschweigen. */
function pSub(p, lang) {
  const bits = [];
  if (lang) {
    bits.push(p.basis);
  } else {
    bits.push(p.eigen ? 'Eigenes' : gruppeOf(p));
    if (p.eigen) bits.push(p.basis);
  }
  const dev = deviations(p).length;
  if (dev) bits.push(dev === 1 ? '1 Änderung' : dev + ' Änderungen');
  const nb = blocksOf(p).length;
  if (nb) bits.push(nb === 1 ? '1 Baustein' : nb + ' Bausteine');
  return bits.join(' · ');
}

function pWhen(p) {
  if (p.id === store.active) return '';
  const u = usageOf(p.id);
  if (!u.n) return 'nie benutzt';
  return u.n + '×';
}

/* Ein Profilwechsel wirft den Routenstapel NICHT weg. Vor dem Stapel war das
   richtig — die eine Route passte nicht mehr zum Profil in der Pille. Jetzt
   ist es genau verkehrt herum: Dasselbe noch einmal mit einem anderen Profil
   zu rechnen ist der Zweck des Stapels. Weggeworfen wird nur, was nicht mehr
   zu den Wegpunkten passt; das Profil gehoert zur Route, nicht zur Pille. */
function selectProfile(id, fromAll) {
  store.active = id;
  noteUse(id);
  const p = byId(id);
  $('#pillName').textContent = p.name;
  if (!state.routes.length) $('#sheetProfile').textContent = p.name;
  if (fromAll) { promoteToTop(id); close('allprofiles'); }
  renderProfiles(); renderAllProfiles();
  persist();
  toast(state.routes.length
    ? 'Profil „' + p.name + '“ gewählt — noch einmal rechnen legt die Route dazu.'
    : 'Profil „' + p.name + '“ gewählt.');
}

function profileRow(p, fromAll) {
  const row = document.createElement('div');
  row.className = 'prow' + (fromAll ? ' prow--lang' : '');
  const on = p.id === store.active;

  const sel = document.createElement('button');
  sel.type = 'button'; sel.className = 'psel';
  /* Die Beschreibung steht an beiden Orten. Ein Profilname allein ist keine
     Information — „safety" oder „Trekking, Steigungen egal" sagen erst mit
     einem Satz daneben, was sie tun. In der Kurzauswahl bleibt sie einzeilig,
     in der Vollliste darf sie umbrechen. */
  sel.innerHTML = '<span class="pdot' + (on ? ' on' : '') + '"></span>' +
    '<span class="mt"><b>' + esc(p.name) + '</b>' +
    '<span class="sub">' + esc(pSub(p, fromAll)) + '</span>' +
    (p.hint ? '<span class="was">' + esc(p.hint) + '</span>' : '') +
    '</span>';
  sel.addEventListener('click', function () { selectProfile(p.id, fromAll); });
  row.appendChild(sel);

  const when = pWhen(p);
  if (when) {
    const w = document.createElement('span');
    w.className = 'pwhen'; w.textContent = when;
    row.appendChild(w);
  }

  /* Ohne Parameterkatalog gibt es nichts zu bearbeiten. Ein Knopf, der ein
     leeres Fenster oeffnet, waere schlimmer als keiner. */
  if (!(BR.BASES[p.basis] && BR.BASES[p.basis].frei)) {
    const ed = document.createElement('button');
    ed.type = 'button'; ed.className = 'pedit'; ed.textContent = 'Bearbeiten';
    /* Bearbeiten aktiviert NICHT — Ansehen ist noch keine Entscheidung. */
    ed.addEventListener('click', function () { openEditor(p.id, fromAll ? 'all' : 'picker'); });
    row.appendChild(ed);
  }

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

/* Gruppen statt einer Liste von 30 Zeilen. Innerhalb einer Gruppe steht die
   Reihenfolge still — in einer langen Liste ist Wiederfinden wichtiger als
   Rangfolge. Die Vorauswahl mit ihren fuenf Zeilen sortiert weiter nach
   Benutzung; das ist der Ort dafuer. */
function renderAllProfiles() {
  const host = $('#allBody');
  host.textContent = '';

  const gruppen = [
    ['Übernommene Werte', function (p) { return !!p.sitzung; }],
    ['Eigene Profile', function (p) { return p.eigen && !p.sitzung; }]
  ];
  BR.GRUPPEN.forEach(function (g) {
    gruppen.push([g, function (p) { return !p.eigen && gruppeOf(p) === g; }]);
  });

  gruppen.forEach(function (g) {
    const list = allProfiles().filter(g[1]);
    if (!list.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'sect';
    wrap.innerHTML = '<div class="secthead"><h3>' + esc(g[0]) +
      '</h3><span class="cnt">' + list.length + '</span></div>';
    const box = document.createElement('div');
    box.className = 'card'; box.style.padding = '2px 12px';
    list.forEach(function (p) { box.appendChild(profileRow(p, true)); });
    wrap.appendChild(box);
    host.appendChild(wrap);
  });

  const n = document.createElement('p');
  n.className = 'note'; n.style.paddingTop = '14px';
  n.innerHTML = '<b>Woher die Liste kommt:</b> Es sind alle Profile, die der ' +
    'Routing-Server am 19.08.2026 tatsächlich beantwortet hat — jeder Name einzeln ' +
    'nachgemessen. Details in <code>PROFILE.md</code>.<br><br>' +
    '<b>Einstellbar sind nur die vier eingerichteten Profile</b> (Zügig, Wenig ' +
    'Verkehr, Sehr wenig Verkehr, Trekking). Für die übrigen kennt die App die ' +
    'Parameter nicht — Regler anzubieten, die der Server still ignoriert, wäre eine ' +
    'Lüge an der Oberfläche. Wählen und rechnen lassen sie sich trotzdem.';
  host.appendChild(n);
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

/* Eine Tour ohne Geometrie bleibt gültig — sonst verschwände mit dieser
   Fassung der gesamte Altbestand. Was fehlt, wird beim Öffnen nachgetragen. */
function repairGeo(t) {
  if (typeof t.geo !== 'string' || !t.geo || !t.meta || typeof t.meta !== 'object') {
    delete t.geo; delete t.meta;
  }
  return t;
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
  const r = aroute();
  if (!r) return;
  const preset = dateDE(new Date().toISOString()) +
    (Number.isFinite(r.distance) ? ' · ' + km(r.distance) : '');
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
    basis: r.basis,
    profileId: r.profileId,
    profileName: r.profileName,
    params: r.params,
    blocks: r.blocks || [],
    distance: r.distance, ascend: r.ascend, time: r.time,
    /* Die Route selbst, nicht bloss die Frage nach ihr. Ohne diese drei Felder
       war eine Tour nur ein Auftrag an einen fremden Server — siehe den
       Abschnitt „Geometrie und GPX". Zusammen rund 8 KB. */
    geo: r.geo || encodeGeo(r.coords),
    meta: r.meta,
    /* Der Belag und die Strassenarten stecken in den `messages` der Antwort,
       nicht in den Koordinaten — aus lon/lat holt sie kein Rechentrick zurueck.
       Abgelegt wird deshalb das fertige Ergebnis: unter 1 KB statt 39. */
    analysis: r.analysis || null
  });
  if (persist()) { renderTours(); toast('Tour gespeichert. Öffnen über Menü → Touren.'); }
}

function openTour(t) {
  state.wps.forEach(function (w) { map.removeLayer(w.marker); });
  state.nogos.forEach(function (n) { map.removeLayer(n.circle); map.removeLayer(n.dot); });
  state.wps = []; state.nogos = []; state.stack = [];
  clearRoutes();

  t.waypoints.forEach(function (p) { addWaypoint(L.latLng(p[0], p[1])); });
  (t.nogos || []).forEach(function (n) { addNogo(L.latLng(n[0], n[1]), n[2]); });
  close('archive'); closeSheets();

  /* Touren aus der Zeit vor dieser Fassung tragen keine Geometrie — für sie
     bleibt nur Nachrechnen, mit den damals gespeicherten Werten statt mit dem
     heutigen Profil. Das Ergebnis wandert danach still in die Tour, sodass
     jede Tour spätestens beim ersten Öffnen ihre Linie bekommt. */
  const coords = typeof t.geo === 'string' && t.geo && t.meta ? decodeGeo(t.geo) : [];
  if (coords.length < 2) {
    const tmp = { id: 'tour', name: t.profileName, eigen: true, basis: t.basis,
                  params: t.params, blocks: t.blocks || [] };
    calculateWith(tmp, t.name).then(function () { nachtragen(t); });
    return;
  }

  const entry = makeEntry({
    pts: lonlats(), ngs: nogoParam(),
    basis: t.basis, profileId: t.profileId, profileName: t.profileName,
    params: t.params, blocks: t.blocks || [],
    tourName: t.name,
    coords: coords, geo: t.geo,
    meta: t.meta,
    analysis: t.analysis
  });
  state.routes.push(entry);
  detentsInvalidieren();
  state.ra = state.routes.length - 1;
  paintRoutes();
  showRoute();
  setStatus('Tour „' + t.name + '“ geöffnet.');
  setDetent(Math.max(1, detent));
  toast('Tour geöffnet — die Linie von damals, ohne Neuberechnung.');
}

/* Eine alte Tour hat gerade zum ersten Mal eine Linie bekommen. Sie zu
   verwerfen wäre absurd: Beim nächsten Öffnen liefe dieselbe Anfrage erneut,
   und irgendwann ergäbe sie etwas anderes. Der Name bleibt unberührt. */
function nachtragen(t) {
  const r = aroute();
  if (!r || !r.coords || !r.meta) return;
  t.geo = r.geo || encodeGeo(r.coords);
  t.meta = r.meta;
  t.analysis = r.analysis || null;
  if (persist()) toast('Tour trägt jetzt ihre Route selbst — künftig ohne Server.');
}

/* Rechnet mit den in der Tour gespeicherten Werten, ohne das aktive Profil
   anzufassen. Ein Hilfsprofil in store.profiles einzuhängen wäre falsch:
   calculate() sichert zwischendurch, und das Hilfsprofil überlebte den
   Neustart als Geisterprofil. */
/* Der Name der Tour gehoert an die Route, nicht an die Kopfzeile: showRoute
   schreibt die Zeile bei jedem Wechsel neu — die Kopfzeile allein zu setzen
   hielt nur bis zum naechsten Reiter-Tap. */
let pendingTour = null;

async function calculateWith(profile, tourName) {
  pendingTour = tourName || null;
  await calculate(profile);
  pendingTour = null;
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
      /* Aus einer fremden Datei kann auch eine halbe Geometrie kommen. Was
         nicht vollstaendig ist, faellt weg und wird beim Oeffnen nachgerechnet
         — sonst zeichnete die Tour eine Linie aus Bruchstuecken. */
      store.tours.push(repairGeo(repairTour(t))); known[t.id] = true; added++;
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

/* ============================================== Baukasten

   Bausteine fuegen einem Profil REGELN hinzu, die BRouter von Haus aus nicht
   hat. Das geht nicht ueber Parameter: Ein .brf-Profil ist ein Programm, kein
   Formular (siehe BROUTER.md). Der Weg ist deshalb ein anderer — der
   vollstaendige Profiltext wird zusammengesetzt und einmalig hochgeladen.

   Damit das ueberhaupt moeglich ist, liegen die Basisprofile im Repo
   (Verzeichnis basis/). Warum, und was das kostet: basis/README.md und
   OFFENE-PUNKTE.md, P8.

   Preis in Anfragen: Ein Profil MIT Bausteinen kostet einmalig eine
   zusaetzliche Uebertragung, danach rechnet es wie jedes andere. Ohne
   Bausteine bleibt es bei genau einer Anfrage je Berechnung. */

const BAUSTEINE = [{
  id: 'maxspeed',
  name: 'Tempolimit meiden',
  kurz: 'bewertet maxspeed als eigene Kosten',
  was: 'BRouter kennt nur seine Verkehrsschätzung. Das Tempolimit steht in den ' +
       'Kartendaten auf gut der Hälfte der Strecke — und wird von keinem ' +
       'mitgelieferten Profil ausgewertet. Dieser Baustein macht daraus eine ' +
       'eigene Kostendimension: Je höher das Limit, desto teurer der Weg.',
  beleg: 'Gemessen am 18.08.2026 über 187,6 km: Der Anteil an Straßen mit Tempo 70 ' +
         'oder mehr fällt von 23,7 % auf 8,7 %, bei rund 10 % Mehrweg. Auf einer ' +
         'ruhigen 156-km-Strecke (19.08.2026) blieben davon 7,3 % → 7,0 % übrig, bei ' +
         '20 m Mehrweg.',
  warnung: 'Wie viel er bringt, hängt ganz an der Strecke: Wo ohnehin kaum schnelle ' +
           'Straßen im Weg liegen, ändert er fast nichts — schaden kann er dort aber ' +
           'auch nicht. Mit dem Wert 0 kommen exakt die Referenzwerte heraus.',
  param: {
    key: 'consider_speed', name: 'Tempolimit meiden', type: 'range',
    min: 0, max: 3, step: 0.5, def: 1,
    scale: ['aus', 'deutlich', 'kompromisslos'],
    desc: 'Wie stark schnelle Straßen gemieden werden. 0 schaltet den Baustein ' +
          'rechnerisch ab, ohne ihn zu entfernen.',
    fmt: function (v) { return v.toFixed(1).replace('.', ',') + (v === 0 ? ' · aus' : ''); }
  },
  global: 'assign consider_speed = 1  # %consider_speed% | Straßen mit hohem Tempolimit meiden | number',
  /* Nur die hohen Werte aufzaehlen, nicht die niedrigen: BRouter prueft
     Tag-Werte gegen seine Nachschlagetabelle, und `maxspeed=5` kennt sie
     nicht — der Upload scheiterte mit „unknown lookup value: 5". Alles, was
     hier nicht steht, faellt in den else-Zweig und kostet nichts extra. */
  regel: [
    'assign speedpenalty =',
    '      if not consider_speed then 0',
    '      else if maxspeed=70              then multiply 0.6 consider_speed',
    '      else if maxspeed=80              then multiply 0.9 consider_speed',
    '      else if maxspeed=90              then multiply 1.2 consider_speed',
    '      else if maxspeed=100|110|120|130 then multiply 1.6 consider_speed',
    '      else 0'
  ].join('\n'),
  add: '  add speedpenalty'
}];

function bausteinById(id) {
  let found = null;
  BAUSTEINE.forEach(function (b) { if (b.id === id) found = b; });
  return found;
}

function blocksOf(profile) {
  return (profile && Array.isArray(profile.blocks)) ? profile.blocks : [];
}

/* ------------------------------------------------- Profiltext bauen

   Drei Einfuegestellen, alle drei an Stellen, die in fastbike.brf und
   trekking.brf gleich aussehen:

     1. der Parameter in den globalen Abschnitt,
     2. die Regel selbst unmittelbar vor `assign costfactor`,
     3. ein `add <name>` in die Kette der Strafaufschlaege.

   Bewusst kein Ersetzen des Kostenausdrucks: Der ist mehrzeilig und in beiden
   Profilen verschieden. Ein zusaetzlicher Summand ist der kleinste Eingriff,
   den man verstehen und pruefen kann. */
function buildProfileText(base, blocks) {
  let text = base;
  blocks.forEach(function (id) {
    const b = bausteinById(id);
    if (!b) return;

    const g = text.search(/^---context:global.*$/m);
    if (g < 0) throw new Error('Im Profiltext fehlt der Abschnitt context:global.');
    const gEnde = text.indexOf('\n', g) + 1;
    text = text.slice(0, gEnde) + '\n' + b.global + '\n' + text.slice(gEnde);

    const c = text.search(/^assign costfactor\b/m);
    if (c < 0) throw new Error('Im Profiltext fehlt assign costfactor.');
    text = text.slice(0, c) + b.regel + '\n\n' + text.slice(c);

    const c2 = text.search(/^assign costfactor\b/m);
    const rest = text.slice(c2);
    const m = rest.match(/\n[ \t]+add [^\n]*\n/);
    if (!m) throw new Error('In assign costfactor fehlt eine add-Zeile zum Anhängen.');
    const pos = c2 + m.index + m[0].length;
    text = text.slice(0, pos) + b.add + '\n' + text.slice(pos);
  });
  return text;
}

/* Kleiner Streuwert, nur um zu erkennen, ob sich der Text geaendert hat.
   Keine Sicherheitsfunktion — es geht darum, nicht jedes Mal neu hochzuladen. */
function textHash(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

const basisCache = {};

async function basisText(basis) {
  if (basisCache[basis]) return basisCache[basis];
  const datei = (basis.indexOf('trekking') === 0 || basis === 'safety') ? 'trekking' : 'fastbike';
  const res = await fetch('basis/' + datei + '.brf');
  if (!res.ok) throw new Error('Der mitgelieferte Profiltext fehlt (basis/' + datei + '.brf).');
  const t = await res.text();
  basisCache[basis] = t;
  return t;
}

/* Laedt hoch, wenn noetig, und liefert den Profilnamen fuer die Anfrage.
   Der Server vergibt eine ID der Form custom_<zahl>. Sie wird beim Profil
   gemerkt, zusammen mit dem Streuwert des Textes: Solange sich am Text nichts
   aendert, wird nicht neu hochgeladen. */
async function serverProfileFor(profile) {
  const blocks = blocksOf(profile);
  if (!blocks.length) return profile.basis;

  const base = await basisText(profile.basis);
  const text = buildProfileText(base, blocks);
  const hash = textHash(text);
  if (profile.uploadId && profile.uploadHash === hash) return profile.uploadId;

  setStatus('Profil wird übertragen …', 'busy');
  const res = await fetch(BROUTER + '/profile', { method: 'POST', body: text });
  if (!res.ok) {
    throw routeError('Das Profil konnte nicht übertragen werden (Fehler ' + res.status + ').');
  }
  let data = null;
  try { data = await res.json(); } catch (err) { data = null; }
  /* Anders als beim Rechnen meldet dieser Endpunkt Fehler im Klartext:
     `{"profileid":"…","error":"Profile error: ParseException … at line 238:
     unknown lookup value: 5"}` — und zwar mit HTTP 200. Wer nur den Status
     prueft, haelt ein kaputtes Profil fuer gelungen und bekommt den Fehler
     erst spaeter als nichtssagenden 500 beim Rechnen zurueck. */
  if (data && data.error) {
    throw routeError('Der Baustein wurde vom Server abgelehnt: ' + data.error);
  }
  const id = data && data.profileid;
  if (!id) throw routeError('Der Server hat keine Profil-Kennung zurückgegeben.');

  /* Nur eigene Profile werden gespeichert — genau die koennen Bausteine haben. */
  const eigen = store.profiles.filter(function (x) { return x.id === profile.id; })[0];
  if (eigen) { eigen.uploadId = id; eigen.uploadHash = hash; persist(); }
  profile.uploadId = id; profile.uploadHash = hash;
  return id;
}

/* ----------------------------------------------------- Baukasten-UI */

let draftBlocks = [];

function renderKit() {
  const host = $('#kitBody');
  host.textContent = '';
  const p = byId(editing);

  const kopf = document.createElement('p');
  kopf.className = 'note';
  kopf.innerHTML = '<b>Bausteine fügen Regeln hinzu</b>, die BRouter von Haus aus ' +
    'nicht hat. Anders als die Regler im Profil ändern sie nicht nur Werte — deshalb ' +
    'wird ein Profil mit Bausteinen vor dem ersten Rechnen einmalig zum Server ' +
    'übertragen. Danach kostet es wie jedes andere genau eine Anfrage.';
  host.appendChild(kopf);

  BAUSTEINE.forEach(function (b) {
    const an = draftBlocks.indexOf(b.id) !== -1;

    const box = document.createElement('div');
    box.className = 'card';

    box.appendChild(paramRow(
      { name: b.name, key: b.id, type: 'switch', desc: b.was },
      function () { return draftBlocks.indexOf(b.id) !== -1; },
      function (v) {
        const i = draftBlocks.indexOf(b.id);
        if (v && i === -1) draftBlocks.push(b.id);
        if (!v && i !== -1) draftBlocks.splice(i, 1);
        dirty = true;
        renderKit();
      }
    ));

    if (an) {
      box.appendChild(paramRow(b.param,
        function () {
          return Object.prototype.hasOwnProperty.call(draft, b.param.key)
            ? draft[b.param.key] : b.param.def;
        },
        function (v) { draft[b.param.key] = v; dirty = true; }
      ));
    }

    const beleg = document.createElement('p');
    beleg.className = 'note';
    beleg.textContent = b.beleg;
    box.appendChild(beleg);

    /* Was ein Baustein NICHT kann, gehoert neben das, was er kann. */
    if (b.warnung) {
      const w = document.createElement('div');
      w.className = 'flag';
      w.innerHTML = '<span class="k">!</span><p>' + b.warnung + '</p>';
      box.appendChild(w);
    }
    host.appendChild(box);
  });

  /* Warum nur einer? Weil nur einer sich bewaehrt hat. Das gehoert hier hin,
     sonst sieht der Baukasten nach einer halbfertigen Liste aus. */
  const warum = document.createElement('p');
  warum.className = 'note';
  warum.innerHTML = '<b>Aufgenommen wird nur, was sich nachweisen lässt.</b> Jeder ' +
    'Baustein hier ist gegen den echten Server gemessen, und zu jedem gehört eine ' +
    'Kontrolle: Auf 0 gestellt muss exakt die Route herauskommen, die ohne ihn ' +
    'entsteht. Ein dritter Kandidat („Kopfsteinpflaster meiden") wurde am 19.08.2026 ' +
    'gebaut und wieder verworfen — er änderte auf keiner Teststrecke etwas, weil ' +
    '<code>fastbike</code> Kopfsteinpflaster ohnehin als unbefestigt meidet. Die ' +
    'Messungen stehen in <code>BROUTER.md</code>, Test 2 und 7 bis 8.';
  host.appendChild(warum);

  const hinweis = document.createElement('p');
  hinweis.className = 'note';
  hinweis.innerHTML = 'Grundlage ist der mitgelieferte Profiltext aus <code>basis/</code> ' +
    '— dieselbe Datei, die BRouter ausliefert, ergänzt um die Regel. Freien ' +
    'Profiltext gibt es bewusst nicht: Beim Rechnen quittiert der Server einen ' +
    'Fehler im Profil nur mit einem leeren <code>HTTP 500</code>. Beim Übertragen ' +
    'meldet er ihn zwar im Klartext — aber erst, nachdem man ihn gemacht hat.';
  host.appendChild(hinweis);
}

/* ========================================================= Verdrahtung */

/* Der Griff kann beides: Antippen schaltet eine Raste weiter, Ziehen fuehrt
   das Blatt der Hand nach. Nur Antippen fuehlt sich auf dem Telefon defekt an
   — man zieht, und nichts folgt. Waehrend des Ziehens bekommt das Blatt eine
   feste Hoehe in Pixeln; beim Loslassen entscheidet die naechstgelegene Raste,
   und die Hoehe geht zurueck ans Stylesheet. */
(function dragSheet() {
  const sheet = $('#sheet');
  const grab = $('#grab');
  let startY = 0, startH = 0, moved = false, dragging = false;

  grab.addEventListener('pointerdown', function (e) {
    dragging = true;
    moved = false;
    startY = e.clientY;
    startH = sheet.getBoundingClientRect().height;
    sheet.style.transition = 'none';
    sheet.classList.add('dragging');
    document.body.classList.add('dragging');
    try { grab.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
  });

  grab.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 5) moved = true;
    if (!state.routes.length) return;   /* aus dem leeren Zustand fuehrt nur Rechnen */
    const h = detentPx();
    sheet.style.height = Math.min(h[3], Math.max(h[1], startH + dy)) + 'px';
    positionRail();
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    sheet.classList.remove('dragging');
    document.body.classList.remove('dragging');
    const h = sheet.getBoundingClientRect().height;
    sheet.style.transition = '';
    /* Erzwingt eine Stilberechnung. Ohne sie gilt für den Browser beim
       nächsten Höhenwechsel noch das `transition:none` von eben — die
       Bewegung fiele aus und `transitionend` käme nie; die Leiste rückte
       erst der Zeitgeber in afterSheetSettled zurecht. Am 19.08.2026 im
       Entwurf aufgefallen. */
    void sheet.offsetHeight;
    if (!moved) { setDetent(detent >= 3 ? 1 : detent + 1); return; }
    const hs = detentPx();
    let best = 1;
    [1, 2, 3].forEach(function (i) {
      if (Math.abs(hs[i] - h) < Math.abs(hs[best] - h)) best = i;
    });
    setDetent(best);
  }
  grab.addEventListener('pointerup', release);
  grab.addEventListener('pointercancel', release);
})();

$('#grab').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setDetent(detent >= 3 ? 1 : detent + 1);
  }
});

/* Aufraeumen gehoert nach unten zur Route, nicht in die Werkzeugleiste: Die
   Leiste traegt Kartenwerkzeuge, hier geht es um Rechenergebnisse. */
$('#clearBtn').addEventListener('click', function () {
  if (state.routes.length < 2) return;
  const keep = aroute();
  const weg = state.routes.length - 1;
  state.routes.forEach(function (r) {
    if (r !== keep && r.layer) map.removeLayer(r.layer);
  });
  state.routes = [keep];
  state.ra = 0;
  state.prev = null;
  detentsInvalidieren();
  renumber();
  scrubHide();
  paintRoutes();
  showRoute();
  setDetent(detent);
  toast(weg === 1 ? 'Eine Route entfernt — ' + keep.profileName + ' bleibt.'
                  : weg + ' Routen entfernt — ' + keep.profileName + ' bleibt.');
});

/* Einzelne Route entfernen. Der Aufraeum-Knopf raeumt alles bis auf eine ab —
   fuer „diese eine weg" braucht es einen Griff an der Route selbst. Er sitzt
   am ausgewaehlten Reiter, weil dort schon die Aufmerksamkeit ist. */
function removeRoute(i) {
  const r = state.routes[i];
  if (!r || state.routes.length < 2) return;
  if (r.layer) map.removeLayer(r.layer);
  if (state.prev === r) state.prev = null;
  state.routes.splice(i, 1);
  if (state.ra >= state.routes.length) state.ra = state.routes.length - 1;
  detentsInvalidieren();
  renumber();
  scrubHide();
  paintRoutes();
  showRoute();
  setDetent(detent);
  toast('Route entfernt.');
}

$('#attribBtn').addEventListener('click', function () {
  const box = $('#attribBox');
  box.hidden = !box.hidden;
  this.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
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
$('#mLayer').addEventListener('click', function () { renderLayers(); openSheet('layers'); });
$('#lDone').addEventListener('click', closeSheets);

/* Eigene Zoomknoepfe statt Leaflets zoomControl: Das ist mit Begruendung
   abgeschaltet (siehe oben bei der Karteninitialisierung), und links stoert
   es die volle rechte Kante nicht. */
$('#zIn').addEventListener('click', function () {
  scrubHide();
  map.zoomIn();
});
$('#zOut').addEventListener('click', function () {
  scrubHide();
  map.zoomOut();
});

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

$('#editorDone').addEventListener('click', endEdit);
$('#toKit').addEventListener('click', function () { renderKit(); open('kit'); });
$('#kitBack').addEventListener('click', function () { close('kit'); });

$('#saveCancel').addEventListener('click', function () {
  dirty = false; close('savedlg'); backFromEditor(); toast('Änderungen verworfen.');
});
$('#saveUse').addEventListener('click', function () { close('savedlg'); useDraft(); });
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
step('Kartenbild', function () { setLayer(store.layer, false); });
step('Kartenausschnitt', function () {
  const v = startView();
  map.setView(v[0], v[1], { animate: false });
  regionHolen();
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

/* Fenster gedreht oder Grösse geändert: Die Rasten sind gemessen, das
   Höhenprofil zeichnet in Pixeln — beides muss nachgezogen werden. Gedrosselt,
   weil resize auf manchen Geräten im Dutzend feuert. */
let resizeTimer = null;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    detentsInvalidieren();
    if (state.routes.length) setDetent(detent);
    else positionRail();
    if (aroute()) drawElevation(aroute());
  }, 250);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    /* updateViaCache: 'none' — das Worker-Skript nie aus dem HTTP-Cache nehmen,
       sonst kann eine neue Version übersehen werden. Siehe CLAUDE.md. */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .catch(function () { /* ohne SW läuft die App trotzdem */ });
  });
}
