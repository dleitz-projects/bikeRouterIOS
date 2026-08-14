'use strict';

/* Rennrad-Routenplaner — Meilenstein 1
   Karte, Wegpunkte, Profilauswahl, Routenberechnung, GPX-Teilen. */

const BROUTER = 'https://brouter.de/brouter';
const TIMEOUT_MS = 30000;

const el = {
  map: document.getElementById('map'),
  profile: document.getElementById('profile'),
  calc: document.getElementById('calc'),
  share: document.getElementById('share'),
  clear: document.getElementById('clear'),
  stats: document.getElementById('stats'),
  status: document.getElementById('status')
};

/* waypoints: [{ marker }] — die Koordinate lebt im Marker, damit Drag
   und Zustand nicht auseinanderlaufen koennen.
   route:     Ergebnis der letzten erfolgreichen Berechnung, oder null.
   gpx:       zwischengespeicherte GPX-Datei zur signature der aktuellen Route. */
const state = { waypoints: [], layer: null, route: null, gpx: null, busy: false };

/* ---------------------------------------------------------------- Karte */

const map = L.map(el.map, { zoomControl: true }).setView([51.85, 10.30], 9);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende | Routing: <a href="https://brouter.de">BRouter</a>'
}).addTo(map);

map.on('click', (e) => addWaypoint(e.latlng));

/* ----------------------------------------------------------- Wegpunkte */

function icon(index, total) {
  const kind = index === 0 ? ' wp--start' : (index === total - 1 ? ' wp--end' : '');
  // Sichtbarer Punkt 26 px, Trefferfläche 44 px — Vorgabe für Touch.
  return L.divIcon({
    className: 'wp-hit',
    html: `<div class="wp${kind}">${index + 1}</div>`,
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

  state.waypoints.push({ marker });
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
  state.waypoints.forEach((w, i) => w.marker.setIcon(icon(i, n)));
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

/* Ein GET ohne eigene Header: bleibt ein CORS-simple-request, kein Preflight. */
async function request(target) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, TIMEOUT_MS);

  let res;
  try {
    res = await fetch(target, { signal: ctrl.signal });
  } catch (err) {
    throw new Error(timedOut
      ? 'Der Routing-Server antwortet nicht (Zeitüberschreitung).'
      : 'Keine Verbindung zum Routing-Server. Ist das iPhone online?');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // BRouter meldet Fehler als text/plain, teils mit leerem Body und in
    // Server-Jargon. Deshalb immer eine verständliche Erklärung voranstellen
    // und den Originaltext nur als Detail anhängen.
    const body = (await res.text().catch(() => '')).trim();
    let lead;
    if (res.status === 400) {
      lead = 'Für mindestens einen Punkt gibt es keine Kartendaten — liegt er außerhalb der abgedeckten Region?';
    } else if (res.status >= 500) {
      lead = 'Der Server konnte keine Route berechnen. Liegen alle Punkte nahe an befahrbaren Wegen und nicht zu weit auseinander?';
    } else {
      lead = `Der Server antwortete mit Fehler ${res.status}.`;
    }
    throw new Error(body ? `${lead} (Server: ${body})` : lead);
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
      throw new Error('Die Antwort des Servers war kein gültiges GeoJSON.');
    }

    const feature = data && data.features && data.features[0];
    const coords = feature && feature.geometry && feature.geometry.coordinates;
    if (!coords || coords.length < 2) {
      throw new Error('Zwischen diesen Punkten wurde keine Route gefunden.');
    }

    draw(coords);
    show(feature.properties || {});
    state.route = { points, profile };
    state.gpx = null;
    setStatus('Route berechnet.');
  } catch (err) {
    invalidate();
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

function show(props) {
  const metres = Number(props['track-length']);
  const ascend = Number(props['filtered ascend']);
  const parts = [];
  if (Number.isFinite(metres)) {
    parts.push(`${(metres / 1000).toFixed(1).replace('.', ',')} km`);
  }
  if (Number.isFinite(ascend)) {
    parts.push(`${Math.round(ascend)} hm aufwärts`);
  }
  el.stats.textContent = parts.join('  ·  ');
  el.stats.hidden = parts.length === 0;
}

/* --------------------------------------------------------- GPX-Teilen */

function filename() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_Route.gpx`;
}

/* Muss synchron aus der Tap-Behandlung heraus laufen: navigator.share()
   verlangt eine frische Nutzerinteraktion. Deshalb hier kein await davor. */
function shareOrDownload(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] })
      .then(() => setStatus('GPX geteilt.'))
      .catch((err) => {
        if (err && err.name === 'AbortError') {
          setStatus('Teilen abgebrochen.');
          return;
        }
        // Typisch: die Nutzerinteraktion ist durch das Laden verfallen.
        // Dann als Download ausliefern; beim naechsten Tap liegt die
        // Datei bereits vor und das Share-Sheet oeffnet sich sofort.
        download(file);
        setStatus('Share-Sheet nicht verfügbar — Datei wurde heruntergeladen. Nochmal tippen öffnet das Teilen-Menü.', true);
      });
    return;
  }
  download(file);
  setStatus('Teilen wird hier nicht unterstützt — GPX wurde heruntergeladen.');
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
    shareOrDownload(state.gpx);
    return;
  }

  state.busy = true;
  syncButtons();
  el.share.textContent = 'Lade …';
  setStatus('GPX wird geholt …');

  try {
    const res = await request(url('gpx', state.route.points, state.route.profile));
    const blob = await res.blob();
    state.gpx = new File([blob], filename(), { type: 'application/gpx+xml' });
    setStatus('GPX bereit.');
    shareOrDownload(state.gpx);
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    state.busy = false;
    el.share.textContent = 'Teilen';
    syncButtons();
  }
}

/* ----------------------------------------------------------- Verdrahtung */

el.calc.addEventListener('click', calculate);
el.share.addEventListener('click', share);
el.clear.addEventListener('click', clearWaypoints);

// Anderes Profil heisst andere Route — Ergebnis verwerfen, aber nicht
// automatisch neu rechnen (schont den gespendeten Server).
el.profile.addEventListener('change', () => {
  if (state.route) invalidate('Profil geändert — bitte neu berechnen.');
});

syncButtons();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne SW laeuft die App trotzdem */ });
  });
}
