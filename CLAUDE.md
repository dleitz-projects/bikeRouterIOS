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

## Begleitende Dokumente

Diese Datei enthält **Verbindliches**: Entscheidungen, Regeln, Nicht-Ziele.
Was hier steht, gilt. Zwei Dateien daneben halten bewusst Unverbindliches:

- **`BROUTER.md`** — wie die Routing-Engine arbeitet und was davon nachgemessen
  ist, dazu eine Liste offener Tests. Wissen, das sich mit der nächsten Messung
  ändern darf.
- **`IDEEN.md`** — Ideensammlung mit Status. Auch Verworfenes bleibt dort mit
  Begründung stehen.
- **`OFFENE-PUNKTE.md`** — Entscheidungen, die an bereits Gebautem hängen und
  noch nicht gefallen sind. Benennungen, Verhalten, Grenzfälle.
- **`doku/`** — Material, das nicht ausgeliefert wird. Darin der klickbare
  UI-Entwurf, auf den sich der Abschnitt „Gestaltung" bezieht.

Wer die Engine anfasst, liest vorher `BROUTER.md`. Vieles, was naheliegend
aussieht, ist dort bereits gemessen und teils widerlegt.

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

## Gestaltung

Bestätigt am 18.08.2026 am klickbaren Entwurf `doku/ui-entwurf-2026-08-18.html`.
Der Entwurf ist die Momentaufnahme, die folgenden Punkte sind das Verbindliche
daraus.

**Grundform.** Karte vollflächig und randlos. Alles zur Bedienung schwebt
darüber und nimmt der Karte keinen dauerhaften Platz weg.

**Die Drei-Ecken-Regel.** Sie hat sich beim Entwerfen ergeben, nicht am
Reißbrett — gilt aber ab jetzt, weil sie die App ohne Erklärung begreifbar macht:

| Ecke | Gehört dorthin | Enthält |
|---|---|---|
| **oben links** | das Profil | aktives Profil, Wechseln, Bearbeiten, Baukasten |
| **oben rechts** | der Nutzer | Touren, Fahrer & Rad, Sicherung |
| **unten** | die Route | Kennzahlen, Berechnen, Teilen, Speichern, Analyse |

Die Trennlinie ist die Lebensdauer: Was über Routen hinweg gleich bleibt, gehört
nach oben rechts. Was nur diese eine Strecke betrifft, nach unten. Was bestimmt,
*wie* gerechnet wird, nach oben links.

**Eine neue Funktion muss in eine dieser drei Ecken passen.** Passt sie in keine,
ist im Zweifel die Funktion falsch geschnitten und nicht das Layout. Genau daran
ist aufgefallen, dass „Fahrer & Rad" nicht ins Routing-Profil gehört: Es hängt am
Nutzer, nicht an der Art der Route — auch wenn es technisch ein Parameter
derselben Profildatei ist.

Dazu kommt rechts eine senkrechte Leiste mit vier Kartenwerkzeugen und unten ein
Blatt mit drei Rasten: nur Kennzahlen · plus Bedienung · plus Analyse.

**Die Pille öffnet die Auswahl, nicht den Editor.** Ein Tap zeigt das aktive
Profil mit prominentem *Bearbeiten*, darunter vier weitere und einen Verweis
*Mehr Profile* auf die vollständige Liste, getrennt nach eigenen und
mitgelieferten. Alle Profile auf einmal aufzulisten wäre unübersichtlich.

Jede Zeile sagt, woran man ist: eigenes oder mitgeliefert, welches Basisprofil
dahintersteht, und ob Bausteine im Spiel sind — denn nur die kosten eine
zusätzliche Übertragung.

**Ein mitgeliefertes Profil zu bearbeiten erzeugt eine Kopie.** Das Original
bleibt unberührt und wählbar. Sonst wäre der verifizierte Ausgangszustand nach
einer Änderung unwiederbringlich weg.

**Die vier Kartenwerkzeuge.** Die ersten beiden sind ein Modus-Paar und
schließen sich gegenseitig aus, die letzten beiden lösen sofort aus:

| Werkzeug | Wirkung |
|---|---|
| Wegpunkt-Modus | Tippen auf die Karte setzt einen Wegpunkt (Standard) |
| Sperrbereich-Modus | Tippen auf die Karte legt einen Nogo-Kreis an |
| Rückgängig | nimmt den zuletzt gesetzten Punkt zurück, mindestens zwei bleiben |
| Standort | zentriert die Karte, ohne einen Punkt zu setzen |

Jeder Tap auf ein Werkzeug blendet kurz ein, was er bewirkt hat. Ohne diese
Rückmeldung ist ein Modusumschalter auf einer Karte nicht zu erraten.

**Jedes gesetzte Element ist antippbar** und öffnet ein kleines Menü direkt am
Objekt: Wegpunkte zum Löschen, Sperrbereiche zum Löschen und Radius ändern.
Rückgängig allein genügt nicht — es löscht nur in umgekehrter Reihenfolge, wer
also den zweiten von sechs Punkten entfernen will, müsste vier gute mit
zerstören. Beim Sperrbereich ist der **Mittelpunkt** das Ziel, nicht die Fläche:
Eine antippbare Fläche würde jeden Tap auf die Karte darunter schlucken.
Vorhandene Elemente haben dabei immer Vorrang vor dem aktiven Modus.

**Jeder Parameter zeigt seinen echten BRouter-Namen.** Unter „Autoverkehr
meiden" steht klein `consider_traffic`. Das ist Absicht und folgt direkt aus dem
Zweck des Projekts: Die bestehenden Planer verstecken ihre Routing-Logik, diese
App legt sie offen.

**Wo Daten fehlen, wird kein Regler angeboten.** Für Asphaltqualität gibt es
keinen Regler, sondern eine Notiz, warum es ihn nicht gibt — das Feld
`smoothness` fehlt in den Kartendaten auf rund 70 % der Strecke. Ein Regler ohne
Datengrundlage wäre eine Lüge an der Oberfläche.

**Was nicht die Route ändert, sagt das.** Die Werte unter „Fahrer & Rad" wirken
nur auf die geschätzte Fahrzeit. Der Reiter schreibt das hin, sonst schraubt man
dort und wundert sich, dass sich nichts bewegt.

**Zwei getrennte Werkzeuge, keine zwei Stufen.** *Profil anpassen* ist Bedienung
und ändert nur Werte — kein Upload. *Baukasten* ist Werkstatt und fügt neue
Regeln hinzu — mit Upload. Ein Profil mit Bausteinen lässt sich nicht mehr allein
über die einfachen Regler bedienen; die App muss das sagen, bevor Arbeit verloren
geht.

**Kein freier Profiltext.** Der Baukasten setzt Regeln aus vorgefertigten
Bausteinen zusammen und erzeugt den Profiltext selbst. Grund: Einen Syntaxfehler
quittiert der Server mit `HTTP 500` und leerem Body — es gäbe keine
Fehlermeldung, die dem Nutzer sagen könnte, was falsch ist.

**Speichern, Touren und Sicherung heißen verschieden.** Drei Dinge, die im
ersten Entwurf noch fast gleich hießen und deshalb doppelt wirkten:

| Bedienelement | Ort | Wirkung |
|---|---|---|
| *Tour speichern* | Blatt unten | legt die aktuelle Route unter einem Namen ab |
| *Öffnen* | Menü → Touren | holt eine gespeicherte Tour auf die Karte zurück |
| *Sicherung* | Menü oben rechts | schreibt alles zusammen in eine Datei |
| *Wiederherstellen* | Menü → Sicherung | lädt eine Sicherungsdatei zurück |

**„Wiederherstellen" ist ausschließlich für die Sicherungsdatei reserviert.** Das
Wort bedeutet: etwas war verloren und kommt zurück — und das trifft nur dort zu,
wenn iOS den Speicher geräumt hat. Eine gespeicherte Tour war nie weg, sie wird
**geöffnet**, wie ein Dokument. Stünde „Wiederherstellen" an beiden Stellen,
wäre dieselbe Falle zurück, die schon zwischen *speichern* und *sichern* lag.

Ein weiterer Unterschied, der oft verwechselt wird: **Bearbeiten** gibt es nur
bei einem **Profil**, nicht bei einer Tour. Ein Profil ist eine Rechenvorschrift,
eine Tour ein Ergebnis. Eine Tour zu ändern heißt, sie zu öffnen und Punkte zu
verschieben — dafür braucht es keinen eigenen Knopf. Nur der Name ist separat
änderbar.

**Was eine gespeicherte Tour anzeigt.** Drei Ebenen, klar nach Herkunft getrennt:

| Ebene | Inhalt | Herkunft |
|---|---|---|
| Name | „Okertal-Runde" | **vom Nutzer**, beim Speichern vorgeschlagen, frei änderbar |
| Kennzahlen | `43,5 km · 965 hm · 3:36 h` | automatisch |
| Profil | Profilname · Basisprofil · stärkste Abweichungen | automatisch |

Der Name gehört dem Nutzer, weil das Auffälligste an einer Tour ist, **wo sie
langgeht** — und das weiß nur er. Alles Übrige entsteht von selbst.

Die Profilzeile nennt bewusst nicht nur den Profilnamen. „Harz ruhig" sagt in
einem halben Jahr nicht mehr, was daran ruhig war; erst Basisprofil und
Abweichungen machen die Tour nachvollziehbar.

**Eine Tour speichert eine Kopie der verwendeten Werte, keinen Verweis aufs
Profil.** Sonst wäre eine alte Tour rückwirkend falsch beschriftet, sobald das
Profil sich ändert — und Wiederherstellen ergäbe eine andere Route als damals.
Weicht das heutige Profil vom gespeicherten ab, sagt die Tour das und lässt die
Wahl zwischen den damaligen und den heutigen Werten.

**Jede ausgelöste Aktion wird kurz eingeblendet.** Modus gewechselt, Punkt
gesetzt, Profil gewählt, Tour gespeichert — eine kurze Einblendung am unteren
Rand sagt, was passiert ist. Ohne sie ist auf einer Karte nicht zu erraten, was
ein Symbol bewirkt hat.

**Ebenen stapeln sich nach Aufrufreihenfolge, nicht nach Position im Markup.**
Bei gleichem `z-index` gewinnt sonst das später im Dokument stehende Element —
und eine Ebene verdeckt eine andere, die eigentlich obenauf gehört. Genau das ist
am 18.08.2026 passiert: Die Profilliste lag über dem Baukasten.

**Die Karte braucht einen eigenen `z-index`.** Leaflet vergibt seinen internen
Ebenen `z-index: 400` bis `700`. Bekommt der Kartencontainer selbst keinen Wert,
bildet er keinen Stapelkontext — dann konkurrieren diese 400er direkt mit der
Bedienung darüber und verdecken sie **vollständig**. Am 18.08.2026 genau so
passiert: Die gesamte Bedienung war unsichtbar, aber weiter anklickbar, weil
Leaflets Kachelebene `pointer-events: none` trägt. Ein Fehler, den man beim
Klicken nicht bemerkt, sondern nur im Bild.

**Wo eine Klasse `display` setzt, wirkt das Attribut `hidden` nicht.** Das
Browser-Stylesheet gibt `[hidden]` nur eine schwache Regel mit; jede
Klassenregel schlägt sie. Deshalb steht im Stylesheet einmalig
`[hidden]{display:none !important;}`.

**Der Kartenausschnitt muss die Überlagerungen kennen.** Ein gleichmäßiger Rand
bei `fitBounds` schiebt Start und Ziel unter das Blatt — man sähe seine eigene
Route nicht ganz. Oben und unten wird deshalb so viel Rand gegeben, wie
tatsächlich verdeckt ist.

**Auf einer Ebene ist immer nur ein Fenster offen.** Öffnet man ein zweites
Blatt, schließt das erste. Beide sitzen am unteren Rand; offen übereinander
ergäben sie einen Stapel, bei dem nicht mehr erkennbar ist, was wozu gehört.

**Das Routenblatt fährt zurück, wenn eine Ebene darüber aufgeht.** Es gehört zur
Grundebene und beansprucht in der vollen Raste fast den ganzen Bildschirm. Wird
darüber ein Blatt geöffnet, geht es auf die kleinste Raste — statt um denselben
Platz am unteren Rand zu streiten.

**Beide Farbschemata.** Hell und dunkel sind gleichwertig gestaltet, gesteuert
über die Einstellung des Geräts.

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
| `to-position not mapped in existing datafile` | dasselbe, andere Schreibweise — auch `from-position` |
| `operation killed by thread-priority-watchdog after N seconds` | Server bricht ab, meist zu weite Distanz |

**Auf Teilzeichenketten prüfen, nicht auf ganze Sätze.** Für „außerhalb der
Region" gibt es mindestens zwei Formulierungen, und sie teilen sich nur das Wort
`datafile`. Wer auf `datafile` **und** `not found` prüft, übersieht die zweite und
gibt eine nichtssagende Meldung aus. Gefunden am 18.08.2026 beim Testen.

Der Body kann auch leer sein — dann bleibt nur eine generische Meldung. Das
trifft auch auf **HTTP 500 mit leerem Body** zu, den es mindestens in zwei
Varianten gibt: ein ungültig geschriebener Profilparameter (siehe unten) und
eine unbekannte Profil-ID. Beide sind an der Antwort nicht auseinanderzuhalten.
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

Achtung, gemessen am 18.08.2026: Die drei `fastbike`-Zeilen sind **kein**
Beleg für drei verschiedene Profile. `fastbike-lowtraffic` ist nachweislich
`fastbike` mit einem anderen Wert für `consider_traffic`. Nur
`fastbike-verylowtraffic` ist tatsächlich eine eigene Datei. Siehe `BROUTER.md`,
Abschnitt „Belegte Gleichungen zwischen den Serverprofilen" — das ist für den
Entwurf des Profil-Editors wesentlich.

Der öffentliche BRouter-Server läuft auf gespendeter Infrastruktur (FOSSGIS).
Keine unnötigen Anfragen, kein automatisches Neuberechnen bei jeder
Mausbewegung — erst auf Aktion des Nutzers.

### Profilparameter direkt im Request — kein Upload nötig

Belegt am 18.08.2026, im Quellcode des Servers dokumentiert (`ServerHandler.java`).
Jeder Parameter eines Profils lässt sich im normalen GET überschreiben:

```
...&profile=fastbike&profile:consider_traffic=1.0
```

Damit bleibt die Serverlast bei **einer Anfrage pro Berechnung**. Geprüft und
funktionierend zusammen mit `format=gpx` und mit `nogos`.

Nachgewiesen: `profile=fastbike&profile:consider_traffic=1.0` liefert exakt
dasselbe Ergebnis wie das Serverprofil `fastbike-lowtraffic` — in Länge, Kosten
und Höhenmetern gleichzeitig.

**Zwingende Regel: Wahrheitswerte als `1` und `0` senden, niemals als `true`
oder `false`.**

| Schreibweise | Ergebnis |
|---|---|
| `profile:consider_town=1` / `=0` | funktioniert |
| `profile:consider_town=true` / `=false` | **HTTP 500, leerer Body** |
| `profile:unbekannterName=1` | wird still ignoriert, kein Fehler |

`true` und `false` kippen den Server mit einer Antwort, die von anderen Fehlern
nicht unterscheidbar ist — eine Falle, die ohne diese Notiz garantiert ein
zweites Mal zuschlägt. Dass unbekannte Parameternamen **still** ignoriert werden,
ist die zweite Hälfte der Falle: Ein Tippfehler im Parameternamen fällt nicht auf,
die Route wird einfach ohne ihn berechnet.

**Für die Anzeigeberechnung setzt die App `profile:processUnusedTags=1`.** Ohne
das liefert BRouter nur die Tags, die das Profil auch auswertet — `maxspeed`
gehört nicht dazu. Die Auswertung der Tempolimits bliebe dann dauerhaft leer,
ohne dass es auffiele. Beim GPX-Export wird der Schalter nicht gesetzt; dort
zählt nur die Strecke.

Was dieser Weg **nicht** kann: neue Regeln einführen. Ein `.brf`-Profil ist ein
Programm, keine Werteliste — Details in `BROUTER.md`. Wer etwa `maxspeed`
gewichten will, braucht den Upload-Weg (`POST /brouter/profile`), ebenfalls dort
beschrieben.

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

**Henne-Ei beim Umstieg:** Eine Korrektur am Service Worker kann auf das
Deployment, das sie ausliefert, noch nicht wirken — in Kontrolle ist ja noch
der alte Worker mit seiner alten Logik. Ein Gerät, das die vorige Version
installiert hat, braucht deshalb einmalig **zwei Aufrufe**: der erste holt im
Hintergrund die neuen Dateien, der zweite zeigt sie. Ab dann greift
network-first und ein Deployment ist beim ersten Aufruf da. Gemessen am
15.08.2026 beim Wechsel von `routenplaner-v1` auf `bikerouterios-v2`.

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

### Dieselbe Entscheidung betrifft auch die Tourennamen

Ein Tourenname, der automatisch entsteht — „Goslar → Bad Harzburg" statt
„18.08.2026 · 43,5 km" — bräuchte **denselben zweiten Dienst**: Aus Koordinaten
Ortsnamen zu machen ist umgekehrte Geokodierung, also Nominatim oder
gleichwertig.

Das ist wichtig für die Bewertung: Es sind **nicht zwei kleine Wünsche**, sondern
zwei Anwendungen derselben einen Entscheidung. Fällt sie einmal, sind beide
möglich; fällt sie nicht, ist keines von beiden machbar. Wer den Aufwand
abwägt, sollte deshalb beide Seiten zusammen betrachten — und mögliche weitere
Anwendungen, die sich daraus ergeben.

Bis dahin gilt: Der Tourenname wird beim Speichern aus Datum und Distanz
vorgeschlagen und vom Nutzer geändert.

## Arbeitsweise

- In Meilensteinen arbeiten. Keine Features aus späteren Runden vorwegnehmen,
  auch wenn sie naheliegen.
- Bei Unklarheiten nachfragen statt raten.
- Nach jedem Meilenstein: kurz zusammenfassen, was funktioniert und was noch
  offen ist.
