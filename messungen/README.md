# messungen/

Rohdaten und Werkzeug für alles, was in `BROUTER.md` als Tabelle steht.

**Warum das hier liegt:** Eine Messung, die nur als Tabelle in einer
Markdown-Datei steht, lässt sich nicht wiederholen. Wer in einem halben Jahr
prüfen will, ob ein Ergebnis noch gilt — der Server ändert sich (siehe
`SERVER.md`) —, braucht die Methode und nicht nur die Zahl.

| Datei | Inhalt |
|---|---|
| `strecken.json` | Referenzstrecken. Immer dieselben nehmen, sonst sind zwei Läufe nicht vergleichbar |
| `messen.py` | Fährt eine Messreihe und legt sie als TSV ab |
| `ergebnisse/` | Ein TSV je Lauf, mit Datum, Profil, Strecke und Notiz im Kopf |

## Benutzen

```sh
python3 messungen/messen.py \
  --profil custom_1787086801219 \
  --strecke harz-lang \
  --parameter consider_speed --werte 0,1,2.5 \
  --fest consider_traffic=1.0 \
  --notiz "Test 2 Nachlauf"
```

Ausgegeben wird je Wert eine Zeile mit Länge, Höhenmetern, Fahrzeit, Kosten und
den Anteilen, um die es meistens geht: Tempo ≥ 70, Hauptstraßen, rauer Belag,
befestigt, und wie viel Strecke gar keine `smoothness` trägt.

## Zwei Regeln, beide teuer gelernt

**Mindestens 100 km.** Auf kurzen Strecken gibt es keine echten Alternativen —
was der Router wählt, ist dort oft alternativlos. Test 8 sah auf 43 km richtig
aus und war auf 156 km das genaue Gegenteil. Kurze Strecken taugen für Fragen
nach der *Datenlage* („wie viel Kopfsteinpflaster liegt in dieser Altstadt"),
nicht für Fragen nach dem *Verhalten*.

**Immer eine Kontrolle mitmessen.** Jeder Eingriff braucht einen Wert, der ihn
neutral stellt — meist 0. Damit müssen exakt die Referenzwerte herauskommen.
Ohne diese Probe ist nicht zu unterscheiden, ob ein Eingriff wirkt oder ob er
nebenbei etwas anderes kaputt macht.

## Mengenbegrenzung beachten

`brouter.de` weist nach etwa 30 Anfragen in kurzer Folge jede weitere mit
`HTTP 403` ab. Das Skript wartet deshalb acht Sekunden zwischen zwei Anfragen.
Diese Pause nicht verkürzen — der Server ist gespendete Infrastruktur.

## Hochgeladene Testprofile

Messreihen mit Bausteinen brauchen ein hochgeladenes Profil. Die Kennung
(`custom_…`) steht im Kopf der jeweiligen TSV-Datei. Ob sie nach Wochen noch
gilt, ist offen — siehe `BROUTER.md`, Test 5. Notfalls neu hochladen:

```sh
curl -X POST --data-binary @profil.brf https://brouter.de/brouter/profile
```

Antwortet mit `{"profileid": "custom_…"}` — **und mit einem Feld `error`, falls
der Profiltext einen Fehler hat, trotz HTTP 200.** Immer beides ansehen.
