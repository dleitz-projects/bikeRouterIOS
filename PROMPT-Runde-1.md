# Prompt für Runde 1

Lies zuerst die `CLAUDE.md` in diesem Verzeichnis. Sie enthält Ziele,
Nicht-Ziele und die technischen Rahmenbedingungen.

---

## Schritt 0: CORS-Test (zuerst, vor jeder Zeile Code)

Bevor du irgendetwas baust, kläre die offene Architekturfrage aus der CLAUDE.md.

**Wichtig:** Ein normaler `curl`-Aufruf beweist hier nichts. CORS wird
ausschließlich vom Browser durchgesetzt — curl bekommt die Antwort immer,
unabhängig davon, ob der Server CORS erlaubt. Prüfe deshalb nicht den
Response-Body, sondern die **Response-Header**, und schicke dabei einen
`Origin`-Header mit, der eine fremde Domain vorgibt:

```bash
curl -s -o /dev/null -D - \
  -H "Origin: https://example.github.io" \
  "https://brouter.de/brouter?lonlats=10.335,51.803|9.573,52.267&profile=fastbike-lowtraffic&alternativeidx=0&format=geojson"
```

Die Testkoordinaten sind Clausthal-Zellerfeld → Wennigsen.

Suche in der Ausgabe nach `access-control-allow-origin`.

- **Header vorhanden** (`*` oder die gesendete Origin) → Variante A: rein
  statische PWA mit direktem `fetch`. Damit weiterarbeiten.
- **Header fehlt** → Variante B nötig (Proxy oder eigener Container).
  **Nicht selbst entscheiden — hier anhalten und mich fragen.**

Teste zusätzlich `https://bikerouter.de` als Alternative, falls brouter.de
keine CORS-Header sendet.

Trage das Ergebnis in die CLAUDE.md unter "Offene Architekturentscheidung" ein
und ersetze die Überschrift entsprechend. Sag mir das Ergebnis, bevor du
weitermachst.

---

## Schritt 1: Grundgerüst (nur bei Variante A ohne Rückfrage weiterbauen)

Baue die minimale, lauffähige Version. **Nur diese Funktionen, nichts darüber
hinaus:**

1. **Karte** — Leaflet, OSM-Kacheln, Startausschnitt Niedersachsen/Harz,
   korrekte Attribution.

2. **Wegpunkte** — Tap auf die Karte setzt einen Punkt. Marker sind per Drag
   verschiebbar. Ein einzelner Punkt ist der Start, jeder weitere hängt sich
   hinten an. Löschen einzelner Punkte muss möglich sein.

3. **Profilauswahl** — Dropdown mit den vier Profilen aus der CLAUDE.md,
   `fastbike-lowtraffic` vorausgewählt.

4. **Routenberechnung** — Button "Route berechnen". Erst auf Klick, nicht
   automatisch. Ladezustand anzeigen. Fehler (kein Netz, Server antwortet nicht,
   keine Route gefunden) verständlich melden statt still zu scheitern.

5. **Darstellung** — Route als Linie auf der Karte, Karte passend zoomen.
   Darunter Distanz in km und Höhenmeter aufwärts.

6. **GPX-Export** — Button "Teilen". Holt die Route als `format=gpx` und öffnet
   über die Web Share API das native Share-Sheet mit der GPX-Datei als Anhang.
   Dateiname im Format `YYYY-MM-DD_Route.gpx`. Fallback auf einen normalen
   Download, wenn `navigator.canShare` mit Dateien nicht unterstützt wird.

7. **PWA-Grundlagen** — `manifest.json` mit Name, Icons und
   `display: standalone`, dazu ein minimaler Service Worker, damit die App über
   "Zum Home-Bildschirm" ohne Safari-Leiste startet. Ein Platzhalter-Icon reicht.

## Ausdrücklich noch nicht in dieser Runde

- Tourenarchiv / localStorage
- Nogo-Bereiche
- Höhenprofil-Diagramm
- Eigene Profile oder Profil-Editor
- Alles unter "Nicht-Ziele" in der CLAUDE.md

## Abschluss

Sag mir am Ende:

- was funktioniert und was du bewusst weggelassen hast
- wie ich es lokal starte
- welche Schritte ich für das Deployment auf GitHub Pages selbst tun muss
- worauf ich beim ersten Test auf dem iPhone besonders achten soll
