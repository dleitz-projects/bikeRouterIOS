# Bilder für die Startseite

Hier liegen die Bilder, die `README.md` einbindet.

**Die drei App-Bilder (06 bis 08) sind echte Aufnahmen** aus der laufenden App,
aufgenommen im Browser bei 390 px Breite über die Referenzstrecke
Goslar–Torfhaus–Bad Harzburg. Sie zeigen dieselben Zahlen, die auch in
`BROUTER.md` stehen — 43,4 km mit 965 Höhenmetern, im Vergleich gegen Trekking
mit 59,2 km.

**Die übrigen sind Platzhalter (`.svg`)**, weil sie iOS-Systemdialoge zeigen:
das Teilen-Menü von Safari, „Zum Home-Bildschirm", den Home-Bildschirm selbst.
Die kann nur ein echtes iPhone liefern.

## Ersetzen

Jeden Platzhalter durch einen echten iPhone-Screenshot ersetzen:

1. Screenshot am iPhone machen (Seitentaste + Lauter).
2. Als PNG unter demselben Namen hier ablegen, aber mit `.png` statt `.svg`.
3. In `README.md` die Endung ändern: `01-safari-oeffnen.svg` → `.png`.
4. Den Platzhalter löschen.

Die Namen sind durchnummeriert, damit die Reihenfolge der Anleitung erhalten
bleibt.

`icon-rund.png` ist kein Screenshot, sondern das App-Icon mit runden Ecken und
Transparenz — nur für die Startseite. Die ausgelieferten `icon-192.png` und
`icon-512.png` im Wurzelverzeichnis sind bewusst vollflächig quadratisch: iOS
legt seine eigene Maske darüber, und ein Icon mit eigenen runden Ecken bekäme
dort einen doppelten Rand. Erzeugt werden alle drei von `werkzeuge/icon.py`.

| Datei | Was drauf sein soll |
|---|---|
| `01-safari-oeffnen` | Die App in Safari, Adressleiste sichtbar — erkennbar **Safari**, nicht Chrome |
| `02-teilen-symbol` | Untere Safari-Leiste, das Teilen-Symbol markiert |
| `03-zum-homebildschirm` | Teilen-Menü, nach unten gescrollt bis „Zum Home-Bildschirm" |
| `04-hinzufuegen` | Der Dialog mit Icon und Namen, oben rechts „Hinzufügen" |
| `05-homebildschirm` | Der Home-Bildschirm mit dem neuen Icon |
| `06-erste-route` | Die App im Vollbild mit einer berechneten Route |
| `07-vergleich` | Zwei Routen: Reiter A/B, abgelegte gestrichelt, Differenzzeile |
| `08-analyse` | Blatt im Vollbild mit Höhenprofil und Anteilen |
| `09-osmand-dateien` | Das Teilen-Menü der App mit „In Dateien sichern" |

## Worauf beim Fotografieren achten

- **Immer dasselbe Farbschema.** Hell oder dunkel, aber nicht gemischt — sonst
  wirkt die Anleitung zusammengestückelt.
- **Dieselbe Route** in allen App-Bildern. Ein Wechsel der Strecke zwischen zwei
  Bildern lässt den Leser suchen, was sich geändert hat.
- **Keine persönlichen Daten** im Bild: Uhrzeit und Akku sind unkritisch,
  aber gespeicherte Touren mit Namen wie „Zur Arbeit" besser vorher umbenennen.
- **Der markierte Punkt** (Teilen-Symbol, Menüeintrag) darf nachträglich
  hervorgehoben werden — ein Kreis oder Pfeil hilft mehr als eine Bildunterschrift.

Die Platzhalter selbst sind mit einem Skript erzeugt; sie brauchen nicht
aufgehoben zu werden, sobald echte Bilder da sind.
