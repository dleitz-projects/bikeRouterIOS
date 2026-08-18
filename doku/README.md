# doku/

Material, das **nicht ausgeliefert wird**, sondern das Projekt erklärt.

Wichtig fürs Deployment: GitHub Pages liefert dieses Verzeichnis zwar mit aus,
aber nichts hier wird von der App geladen. Der Service Worker cacht es nicht,
`index.html` verlinkt es nicht. Es kostet nur Repo-Platz, keine Ladezeit.

| Datei | Was drin steht |
|---|---|
| `ui-entwurf-2026-08-18.html` | Zweiter Stand, bestätigt am 18.08.2026 und umgesetzt |
| `ui-entwurf-2026-08-19.html` | Dritter Stand: Routenstapel, Kartenwahl, Zoom, schlankere Bedienung, alle Serverprofile |

## `ui-entwurf-2026-08-18.html`

Eine einzelne, in sich geschlossene HTML-Datei — im Browser öffnen, fertig.
Kein Build, keine Abhängigkeit außer den Schriften von Google Fonts.

Der Entwurf hat **keine echte Funktion**: keine Karte, kein Routing, keine
Speicherung. Er zeigt Aufbau, Bedienung und Wortwahl. Alle Zahlen darin sind
echte Messwerte einer Harz-Runde über drei Wegpunkte (43,5 km, 965 Höhenmeter,
86,6 % Asphalt, 49,7 % Wirtschaftsweg), damit sichtbar wird, wie sich die
Anzeige mit realen Werten verhält statt mit gefälligen Platzhaltern.

Die Karte ist gezeichnet, nicht geladen — sie folgt aber der echten
Streckengeometrie.

**Er ist eine Momentaufnahme, kein lebendes Dokument.** Weicht die gebaute App
später ab, gilt die App. Diese Datei wird nicht nachgepflegt, sondern bleibt als
Beleg stehen, wie der Stand am 18.08.2026 aussah.

Weil das so ist, bekommt **jede weitere Entwurfsvariante eine eigene Datei**.
Ein Entwurf wird nie überschrieben — sonst ist die Vorstufe weg und mit ihr die
Möglichkeit, zwei Varianten nebeneinanderzuhalten. Am 18.08.2026 genau so
verloren gegangen.

**Umgesetzt am 18.08.2026.** Die App folgt diesem Entwurf. Zwei bewusste
Abweichungen:

- Der **Baukasten** zeigt nur, was kommen soll, und tut nichts. Grund und
  Entscheidungsstand in `OFFENE-PUNKTE.md`, Punkt P8.
- Der Parameter `processUnusedTags` steht **nicht** im Editor. Die App setzt ihn
  bei jeder Anzeigeberechnung selbst, weil die Auswertung der Tempolimits sonst
  still leer bliebe. Damit entfällt der Abschnitt „Diagnose".


## `ui-entwurf-2026-08-19.html`

Dritter Stand. Baut auf dem zweiten auf und zeigt vier neue Dinge:

- **Routenstapel.** Eine berechnete Route bleibt liegen, wenn die nächste dazu
  kommt — gestrichelt und grau, die ausgewählte kräftig. Antippen wechselt,
  auf der Karte oder über die Chips im Blatt. Der Vergleich steht als Differenz
  unter den Kennzahlen.
- **Kartenbild** als fünftes Werkzeug in der rechten Leiste.
- **Zoomknöpfe** links unten, darunter die Nennung der Datenquellen als „©".
- **Alle 29 Profile**, die `brouter.de` tatsächlich kennt, gruppiert unter
  *Mehr Profile* — mit deutschem Namen, echtem Serverbezeichner und einer
  Zeile, was das Profil bewirkt.

Dazu ist die Bedienung schlanker geworden: kleinere Kennzahlen, flachere
Knöpfe, engere Abstände. Die 44-px-Trefferflächen bleiben unverändert.

**Die Zahlen sind wieder echt.** Zwei Routen über dieselben drei Wegpunkte, am
19.08.2026 auf `brouter.de` gerechnet: `fastbike-lowtraffic` mit 43,4 km und
965 Höhenmetern, `trekking` mit 59,2 km und 884 Höhenmetern. Der Vergleich, den
der Stapel sichtbar machen soll, steht damit selbst auf Messwerten: 15,8 km
Mehrweg gegen einen Rückgang schneller Straßen von 25,5 % auf 1,8 %.

Anders als der zweite Stand hat diese Datei ein `<meta charset="utf-8">` und
einen Doctype. Ohne beides zeigt ein Webserver die Umlaute falsch an — beim
Öffnen per Doppelklick fällt das nicht auf, über `http://` sofort.
