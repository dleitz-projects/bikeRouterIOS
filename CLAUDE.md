# Projekt: bikeRouteriOS (PWA)

App-Name: `bikeRouteriOS` (Langform, `manifest.json` → `name`, `<title>`).
Auf dem Home-Bildschirm kürzt iOS nach etwa 12 Zeichen, deshalb ist
`short_name` bewusst `bikeRouter` — kurz genug, um ungekürzt zu bleiben.

## Zweck

Eine private, installierbare Web-App (PWA) für iOS, die Radrouten über die
BRouter-Engine berechnet, sie lokal archiviert und als GPX an andere Apps
weitergibt.

Hintergrund: Die bestehenden Planer (Komoot, Strava, cycle.travel) verstecken
ihre Routing-Logik hinter undurchschaubaren Profilen. BRouter macht die Regeln
transparent, hat aber weder eine iOS-App noch eine Tourenverwaltung. Genau diese
Lücke schließt dieses Projekt.

## Zielnutzer

Ein einzelner Nutzer, Rennrad, iPhone. Fährt geplante Start-Ziel-Strecken.
Prioritäten beim Routing: Asphaltqualität und wenig Autoverkehr. Höhenmeter und
Streckenlänge sind zweitrangig.

## Ziele

1. Karte, auf der per Tap Start-, Ziel- und Zwischenpunkte gesetzt und
   verschoben werden können
2. Routenberechnung über die BRouter-API mit wählbarem Profil
3. Route auf der Karte darstellen, mit Distanz und Höhenmetern
4. GPX-Export über das native iOS-Share-Sheet (Web Share API mit Dateien)
5. Lokales Tourenarchiv mit Name, Datum, Distanz — wiederaufrufbar und editierbar
6. Nogo-Bereiche (Kreise mit einstellbarem Radius), um Städte zu umfahren
7. Installierbar über "Zum Home-Bildschirm", mit eigenem Icon und ohne Safari-UI

## Nicht-Ziele

Diese Punkte sind bewusst ausgeschlossen. Nicht implementieren, auch nicht
"schon mal vorbereiten":

- Keine Turn-by-turn-Navigation, keine Sprachansagen
- Keine Hintergrund-Standortverfolgung (auf iOS im Browser ohnehin nicht möglich)
- Kein Aufzeichnen von Fahrten, keine Statistiken, keine Trainingsauswertung
- Kein Benutzerkonto, kein Login, keine Server-seitige Datenhaltung
- Keine Komoot-/Strava-Integration (dafür gibt es keine offene Schreib-API)
- Keine Offline-Routenberechnung (BRouter ist Java, kein Port verfügbar)
- Keine Social-Features, kein Teilen von Routen mit anderen Nutzern

## Auf dem iPhone verifiziert (14.08.2026) — nicht anfassen

Diese Punkte sind am echten Gerät geprüft und funktionieren. Sie sind **kein
Umbaugebiet**, auch nicht für naheliegende Verbesserungen:

- Installation über "Zum Home-Bildschirm", Kaltstart ohne Safari-UI
- Trefferflächen der Marker (44 px) reichen in der Praxis
- Routenberechnung, Distanz- und Höhenmeterangabe
- **Der Teilen-Pfad in ganzer Länge.** Das Share-Sheet zeigt die Datei korrekt
  als "GPS Exchange Format (GPX)" mit passender Größe, der Inhalt ist gültiges
  GPX von BRouter 1.7.9, die Werte im GPX-Header stimmen mit der Anzeige
  überein. Ein Tap genügt; die befürchtete verfallende Nutzergeste tritt
  nicht ein.

### Warnung: OsmAnd fehlt im Share-Sheet — das ist kein Fehler

OsmAnd registriert sich auf iOS **nicht als Share-Ziel**, sondern nur als
Dokument-Handler. Der funktionierende Weg ist "In Dateien sichern" und dann in
der Dateien-App "Öffnen mit".

Das liegt an OsmAnd, nicht an dieser App. **Am Teilen-Pfad deshalb nichts
ändern — auch nicht "verbessern".** Jeder Umbau, der OsmAnd ins Share-Sheet
holen soll, ist verlorene Zeit und gefährdet einen Pfad, der nachweislich
funktioniert.

## Technische Rahmenbedingungen

- **Vanilla JavaScript, kein Framework.** Kein React, kein Vue, kein Svelte.
- **Kein Build-Prozess.** Kein npm, kein Vite, kein Bundler. Die Dateien, die im
  Repo liegen, sind exakt die Dateien, die ausgeliefert werden.
- **Leaflet** für die Karte, per CDN eingebunden.
- **So wenige Dateien wie möglich.** Richtwert: `index.html`, `app.js`,
  `style.css`, `manifest.json`, `sw.js`. Nur aufteilen, wenn eine Datei
  unübersichtlich wird.
- Kartenkacheln von OpenStreetMap. Attribution korrekt einbinden.
- Zielbrowser ist **Safari auf iOS**. Layout für schmale Displays, Bedienelemente
  fingertauglich (Mindestgröße 44 px), Safe Areas beachten.
- Speicherung im `localStorage`. Beachten: iOS räumt Web-Speicher unter Umständen
  weg. Deshalb muss es eine Export-Funktion für das gesamte Archiv geben.

## BRouter-API

Ein einzelner GET-Request, keine Authentifizierung, kein API-Key:

```
https://brouter.de/brouter
  ?lonlats=<lon>,<lat>|<lon>,<lat>|...
  &profile=<profilname>
  &alternativeidx=0
  &format=geojson
```

- Koordinatenreihenfolge ist **lon,lat** (nicht lat,lon — häufige Fehlerquelle)
- `format=geojson` zum Anzeigen, `format=gpx` zum Exportieren
- Nogo-Bereiche über den Parameter `nogos=<lon>,<lat>,<radius_in_metern>`,
  mehrere durch `|` getrennt

### Fehlerantworten: am Body unterscheiden, nicht am Statuscode

Beobachtet am 14.08.2026. BRouter trennt seine Fehlerfälle **nicht** über den
HTTP-Status — die drei häufigen Fälle kommen alle als `400` mit einem
`text/plain`-Body. Wer nach Status verzweigt, gibt zwangsläufig falsche
Meldungen aus:

| Body | Bedeutung |
|---|---|
| `no track found at pass=0` | Ein Wegpunkt liegt zu weit von einer erfassten Straße entfernt |
| `datafile <name>.rd5 not found` | Punkt außerhalb der abgedeckten Region |
| `operation killed by thread-priority-watchdog after N seconds` | Server bricht ab, meist zu weite Distanz |

Der Body kann auch leer sein — dann bleibt nur eine generische Meldung.
Fehlerantworten tragen die CORS-Header ebenfalls, der Text ist im Browser also
lesbar.

### Profile

Standardprofil ist `fastbike-lowtraffic`. Es entspricht den Prioritäten des
Nutzers am besten: bleibt auf Asphalt, bestraft aber Haupt- und Bundesstraßen
deutlich.

Auswählbar sein sollen:

| Profil | Verhalten |
|---|---|
| `fastbike` | Asphalt, schnell, nimmt Hauptstraßen gern mit |
| `fastbike-lowtraffic` | **Standard** — wie oben, aber Hauptstraßen bestraft |
| `fastbike-verylowtraffic` | nochmal verkehrsscheuer |
| `trekking` | Allrounder, toleriert unbefestigte Wege |

Der öffentliche BRouter-Server läuft auf gespendeter Infrastruktur (FOSSGIS).
Keine unnötigen Anfragen, kein automatisches Neuberechnen bei jeder
Mausbewegung — erst auf Aktion des Nutzers.

## Deployment

GitHub Pages, Branch `main`, Verzeichnis `/` (root). HTTPS ist über `*.github.io`
automatisch vorhanden und Voraussetzung für Service Worker und Installierbarkeit.
Das Repo muss dafür öffentlich sein.

- Repo: `github.com/dleitz-projects/bikeRouterIOS`
- Seite: `https://dleitz-projects.github.io/bikeRouterIOS/`

Die Seite liegt unter einem **Unterpfad**, nicht auf der Domain-Wurzel. Deshalb
müssen alle Pfade relativ bleiben (`./` in `manifest.json` für `start_url` und
`scope`, kein führender `/` bei Skripten, Styles, Icons und der
Service-Worker-Registrierung). Ein absoluter Pfad würde lokal funktionieren und
erst auf Pages brechen.

Nach jeder Änderung `CACHE` in `sw.js` hochzählen, sonst liefert der Service
Worker weiter die alte Version aus.

Damit ein Deployment überhaupt ankommt, gilt zusätzlich:

- Das **Navigationsdokument wird network-first** ausgeliefert, der Cache dient
  nur als Offline-Rückfall. Käme die `index.html` aus dem Cache, würde eine
  alte Version ihre eigene alte `app.js` laden, damit den alten Service Worker
  erneut registrieren — und das Update erreicht das Gerät nie.
- Registrierung mit `updateViaCache: 'none'`, damit das Worker-Skript nicht aus
  dem HTTP-Cache kommt.

Alle übrigen Dateien laufen weiter stale-while-revalidate.

## Geklärte Architekturentscheidung: CORS → Variante A

**Getestet am 14.08.2026.** `brouter.de` sendet
`Access-Control-Allow-Origin: *` — also für jede fremde Domain.

Damit gilt **Variante A: rein statische PWA mit direktem `fetch` aus dem
Browser.** Kein Proxy, kein eigener Container, kein Server-Code.

Seit dem Deployment zusätzlich in der Praxis bestätigt: Die Berechnung läuft
im Browser von `https://dleitz-projects.github.io` aus, also von einer echten
fremden Origin. Der curl-Test war damit korrekt.

Belegt für alle drei relevanten Aufrufvarianten (jeweils `HTTP 200` und
`Access-Control-Allow-Origin: *`, gesendet mit `Origin: https://example.github.io`):

- `format=geojson`
- `format=gpx`
- zusätzlich mit `nogos=<lon>,<lat>,<radius>`

Weitere Beobachtungen:

- Der Request ist ein CORS-*simple request* (GET, keine eigenen Header) — es
  gibt also keinen Preflight, der separat scheitern könnte. Deshalb beim `fetch`
  **keine eigenen Header setzen** (kein `Accept`, kein `Content-Type`), sonst
  wird daraus ein Preflight-pflichtiger Request.
- Der Content-Type der GeoJSON-Antwort ist `application/vnd.geo+json`, **nicht**
  `application/json`. `response.json()` ist das egal, aber eine Bibliothek, die
  den Content-Type auswertet, kann darüber stolpern.
- Die Antwort trägt `Content-Disposition: attachment` — für `fetch` irrelevant,
  nur beim direkten Aufruf im Browser würde die Datei heruntergeladen.
- `bikerouter.de/brouter` antwortet mit `404`; das ist ein reines Web-Frontend
  und keine API unter diesem Pfad. Als Fallback nicht nötig und nicht vorgesehen.

### Plan B, falls die CORS-Header verschwinden

`Access-Control-Allow-Origin: *` ist die freundliche Konfiguration eines
fremden, gespendeten Servers (FOSSGIS) — keine Zusage. Fällt sie weg, ist der
Ausweg der **selbstgehostete BRouter-Container**, nicht ein Proxy: Ein Proxy
würde die Last weiterhin auf die gespendete Infrastruktur legen und nur die
Browser-Regel umgehen. Der Container braucht zusätzlich die Routing-Segmente
für die befahrene Region.

Einstiegspunkt für die Recherche: `github.com/abrensch/brouter`, README,
Abschnitt Docker. Bewusst kein Image-Name, kein Tag, keine Segment-URL hier —
die ändern sich, das Repo bleibt. Dort steht die jeweils aktuelle Wahrheit.

## Offene Punkte

### Snapping der Wegpunkte auf die nächste Straße — offen, nicht bauen

Wenn ein Wegpunkt zu weit von einer erfassten Straße liegt, meldet BRouter
`no track found at pass=0`. Die App erklärt das und hebt die Punkte hervor,
verschiebt sie aber **nicht** automatisch.

Automatisches Snapping bräuchte einen **zweiten externen Dienst** (Nominatim,
Overpass oder einen Map-Matching-Dienst) — also eine neue Abhängigkeit, eine
zweite Fehlerquelle und zusätzliche Last auf fremder Infrastruktur. Das ist
eine Architekturentscheidung, die der Nutzer separat trifft. Bis dahin: nicht
implementieren, auch nicht vorbereiten.

## Arbeitsweise

- In Meilensteinen arbeiten. Keine Features aus späteren Runden vorwegnehmen,
  auch wenn sie naheliegen.
- Bei Unklarheiten nachfragen statt raten.
- Nach jedem Meilenstein: kurz zusammenfassen, was funktioniert und was noch
  offen ist.
