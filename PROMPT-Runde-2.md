# Prompt für Runde 2

Lies zuerst die `CLAUDE.md`. Meilenstein 1 ist live und auf dem iPhone getestet.

## Ergebnisse des iPhone-Tests (bitte in die CLAUDE.md übernehmen)

Was verifiziert funktioniert und **nicht angefasst werden soll**:

- Installation über "Zum Home-Bildschirm", Kaltstart ohne Safari-UI
- Trefferflächen der Marker (44 px) sind in der Praxis ausreichend
- Routenberechnung, Distanz- und Höhenmeterangabe
- **Der Teilen-Pfad funktioniert vollständig.** Das Share-Sheet zeigt die Datei
  korrekt als "GPS Exchange Format (GPX), 173 KB" an, der Inhalt ist gültiges
  GPX von BRouter 1.7.9, die Werte im Header stimmen mit der Anzeige überein.
  Die verfallende Nutzergeste ist nicht eingetreten, ein Tap genügt.

Wichtig für die Zukunft: OsmAnd erscheint nicht im Share-Sheet, weil es sich auf
iOS nicht als Share-Ziel registriert, sondern nur als Dokument-Handler. Der
funktionierende Weg ist "In Dateien sichern" → in der Dateien-App "Öffnen mit".
**Das ist kein Fehler dieser App. Am Teilen-Pfad nichts ändern, auch nicht
"verbessern".** Bitte als Warnung in die CLAUDE.md aufnehmen.

---

## Aufgabe 1: Name ändern

Überall `Routenplaner` durch `bikeRouteriOS` ersetzen — in `manifest.json`
(`name` und `short_name`), im `<title>` und in einer eventuellen Überschrift in
der Oberfläche.

Beachte: Auf dem iOS-Home-Bildschirm ist nur Platz für ungefähr 12 Zeichen,
danach kürzt iOS. `bikeRouteriOS` liegt an der Grenze. Setz `short_name` auf
etwas, das sicher passt, und `name` auf die Langform.

## Aufgabe 2: Fehlerbehandlung bei nicht routbaren Punkten

Reproduzierter Fall: Ein Wegpunkt lag in der offenen Feldflur, zu weit von einer
erfassten Straße entfernt. Der Server antwortete mit
`no track found at pass=0`.

Die aktuelle Meldung lautet sinngemäß "liegt er außerhalb der abgedeckten
Region?" — das ist irreführend, die Region war abgedeckt.

Zu tun:

1. Diesen Serverfehler gezielt erkennen und eine passende Meldung ausgeben,
   sinngemäß: ein Punkt liegt zu weit von einer Straße entfernt, bitte näher an
   einen Weg verschieben.
2. Den betroffenen Wegpunkt auf der Karte hervorheben, damit klar ist, welcher
   gemeint ist. Falls sich aus der Serverantwort nicht ableiten lässt, welcher
   Punkt es war: alle Marker hervorheben und das in der Meldung offen sagen,
   statt zu raten.
3. Die generische Meldung für tatsächlich unabgedeckte Regionen bleibt bestehen,
   aber für andere Fehlerfälle.

**Nicht** implementieren: automatisches Snapping der Wegpunkte auf die nächste
Straße. Das bräuchte einen zweiten externen Dienst und ist eine offene
Architekturfrage, die ich separat entscheide. Vermerk in der CLAUDE.md unter
offenen Punkten.

## Aufgabe 3: Tourenarchiv

Das ist der eigentliche Kern dieser Runde.

- **Speichern** — Button "Route speichern", verfügbar sobald eine Route
  berechnet ist. Fragt nach einem Namen, schlägt einen sinnvollen Standard vor
  (Datum, Distanz).
- **Gespeichert wird** — Name, Datum, gewähltes Profil, die Wegpunkte,
  Distanz und Höhenmeter. **Nicht** die berechnete Route selbst: Sie wird beim
  Laden neu berechnet. Das hält den Speicher klein und die Route aktuell.
- **Liste** — aufklappbare Übersicht mit Name, Datum, Distanz. Neueste oben.
- **Laden** — setzt Wegpunkte und Profil wieder, berechnet die Route neu.
- **Umbenennen und Löschen**, jeweils mit Rückfrage vor dem Löschen.
- **Archiv-Export und -Import** als JSON-Datei über denselben Teilen-Mechanismus
  wie die GPX. Grund steht in der CLAUDE.md: iOS kann `localStorage` verwerfen,
  deshalb muss es eine Sicherungsmöglichkeit geben. Der Import muss vorhandene
  Einträge zusammenführen, nicht überschreiben.

Speicherung ausschließlich im `localStorage`, kein Backend, kein Sync.

## Ausdrücklich nicht in dieser Runde

- Nogo-Bereiche (Runde 3)
- Höhenprofil-Diagramm
- Profil-Editor
- Snapping (siehe oben)
- Alles unter "Nicht-Ziele" in der CLAUDE.md

## Abschluss

Wie beim letzten Mal: gegen die Live-Version auf GitHub Pages verifizieren, nicht
nur lokal. Danach kurz zusammenfassen, was funktioniert, was du weggelassen hast,
und worauf ich beim iPhone-Test achten soll — insbesondere, ob das Archiv einen
Neustart der App übersteht.
