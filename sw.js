/* Minimaler Service Worker.
   Zweck ist die Installierbarkeit ("Zum Home-Bildschirm" ohne Safari-Leiste),
   nicht Offline-Routing — das ist ein Nicht-Ziel.

   Beim Ausliefern einer geaenderten Version CACHE hochzaehlen. */

const CACHE = 'bikerouterios-v23';

const SHELL = [
  './',
  'index.html',
  'app.js',
  'params.js',
  'style.css',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  /* Die Basisprofile fuer den Baukasten. Ohne sie liesse sich ein Profil mit
     Bausteinen offline nicht einmal zusammensetzen — und beim ersten Rechnen
     nach der Installation waere ein zweiter Ladevorgang noetig. */
  'basis/fastbike.brf',
  'basis/trekking.brf'
];

const CDN = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Schriften liegen bei Google Fonts. Faellt das aus, greift die
// Rueckfallkette im CSS — die App bleibt lesbar.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Faellt das CDN aus, soll die Installation trotzdem gelingen.
    await Promise.all(CDN.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

function cacheable(url) {
  return url.origin === self.location.origin
    || url.hostname === 'unpkg.com'
    || FONT_HOSTS.indexOf(url.hostname) !== -1;
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Routen nie cachen — sie sollen immer frisch sein.
  // Kacheln nie cachen — das wuerde den Speicher unbegrenzt fuellen.
  if (url.hostname.endsWith('brouter.de')) return;
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    const fresh = fetch(e.request).then((res) => {
      if (res.ok && cacheable(url)) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);

    // Das Navigationsdokument IMMER zuerst aus dem Netz holen, nur offline
    // aus dem Cache. Sonst liefert eine neue Version ihre eigene alte
    // index.html aus, registriert damit den alten Service Worker erneut —
    // und ein Deployment kommt auf dem Geraet nie an.
    if (e.request.mode === 'navigate') {
      return (await fresh) || (await cache.match(e.request)) || (await cache.match('./')) || Response.error();
    }

    // Uebrige Dateien: aus dem Cache antworten, im Hintergrund aktualisieren.
    const hit = await cache.match(e.request);
    if (hit) {
      e.waitUntil(fresh);
      return hit;
    }
    return (await fresh) || Response.error();
  })());
});
