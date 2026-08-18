# doku/

Material, das **nicht ausgeliefert wird**, sondern das Projekt erklärt.

Wichtig fürs Deployment: GitHub Pages liefert dieses Verzeichnis zwar mit aus,
aber nichts hier wird von der App geladen. Der Service Worker cacht es nicht,
`index.html` verlinkt es nicht. Es kostet nur Repo-Platz, keine Ladezeit.

| Datei | Was drin steht |
|---|---|
| `ui-entwurf-2026-08-18.html` | Klickbarer Entwurf des neuen UI, bestätigt am 18.08.2026 |

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

**Umgesetzt am 18.08.2026.** Die App folgt diesem Entwurf. Zwei bewusste
Abweichungen:

- Der **Baukasten** zeigt nur, was kommen soll, und tut nichts. Grund und
  Entscheidungsstand in `OFFENE-PUNKTE.md`, Punkt P8.
- Der Parameter `processUnusedTags` steht **nicht** im Editor. Die App setzt ihn
  bei jeder Anzeigeberechnung selbst, weil die Auswertung der Tempolimits sonst
  still leer bliebe. Damit entfällt der Abschnitt „Diagnose".
