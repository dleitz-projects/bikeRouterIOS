# Was die Messungen ergeben haben

Alle Messungen auf einen Blick, mit Ergebnis und Konsequenz. Die vollständigen
Aufbauten stehen in `BROUTER.md`, die Rohdaten in `ergebnisse/`.

**Stand: 19.08.2026.** Gemessen gegen `brouter.de` (BRouter 1.7.10).

---

## Auf einen Blick

| # | Frage | Ergebnis | Folge |
|---|---|---|---|
| 1 | Fehlen die Daten oder die Gewichtung? | **Die Gewichtung.** Belag zu 99,4 % erfasst, `maxspeed` auf 51 % — aber mit 0 gewichtet | Baustein statt Regler |
| 2 | Bringt `maxspeed` als Kostendimension etwas? | **Ja**, Tempo ≥ 70 von 23,7 % auf 8,7 % bei 10 % Mehrweg | gebaut |
| 5 | Verfallen hochgeladene Profile? | läuft | — |
| 6 | Ab welcher Länge bricht der Server ab? | **offen, wichtig** | — |
| 7 | Baustein gegen Kopfsteinpflaster? | **Nein**, kein Effekt — `fastbike` meidet es ohnehin als unbefestigt | verworfen |
| 8 | Baustein für `smoothness`? | **Nein, schädlich** — treibt die Route auf Hauptstraßen | verworfen |
| 9 | Was unterscheidet die GPX-Hinweise? | Der Standard erzeugt **gar keine**; OsmAnd braucht Modus 3 | dokumentiert |
| — | Serverprofile: welche gibt es? | **29 von 64** Namen antworten | in der App |
| — | Mengenbegrenzung | `403` nach ~30 Anfragen in Folge | eigener Fehlerfall |

---

## Die drei Lehren, die mehr wert sind als die Zahlen

### 1. Mindestens 100 km, sonst misst man Zufall

**Test 8 sah auf 43 km richtig aus und war auf 156 km das Gegenteil.** Der
`smoothness`-Baustein schien mittelmäßigen Belag von 10,2 % auf 8,4 % zu senken —
auf der langen Strecke stellte sich heraus, dass er den Hauptstraßenanteil von
25 % auf 34 % **hochtreibt**.

Auf kurzen Strecken gibt es keine echten Alternativen. Was der Router dort
wählt, ist oft alternativlos, und ein Eingriff sieht harmlos aus, obwohl er es
nicht ist.

Kurze Strecken bleiben brauchbar für Fragen nach der **Datenlage** („wie viel
Kopfsteinpflaster liegt in dieser Altstadt") — nie für Fragen nach dem
**Verhalten**.

### 2. Eine Datenlücke ist keine neutrale Leerstelle

Der Kern des `smoothness`-Befunds: Wo ein Feld fehlt, kann nicht bestraft
werden. Und es fehlt nicht zufällig, sondern **systematisch auf Hauptstraßen**.
Ein Eingriff, der nur bewertet, was erfasst ist, bestraft damit die kleinen
getaggten Nebenwege und belohnt die ungetaggten großen. Der Anteil ohne Angabe
stieg von 64,8 % auf 74,6 % — die Route floh regelrecht in die Lücke.

Das ist der gemessene Beleg für die Regel aus der `CLAUDE.md`: *Wo Daten fehlen,
wird kein Regler angeboten.*

### 3. Ohne Kontrolle ist eine Messung wertlos

Jeder Eingriff braucht einen Wert, der ihn neutral stellt — meist 0. Damit
müssen **exakt** die Referenzwerte herauskommen: gleiche Länge, gleiche Kosten,
gleiche Höhenmeter. Ohne diese Probe ist nicht zu unterscheiden, ob ein Eingriff
wirkt oder ob er nebenbei etwas anderes kaputt macht.

Beim Tempolimit-Baustein: `consider_speed = 0` → 43,40 km, Kosten 115098 —
identisch mit dem unveränderten Profil.

---

## Zahlen, die in der App stehen

Diese Werte stehen als Hinweis neben den jeweiligen Reglern. Sie stammen aus
**einer** Messreihe und sind als Größenordnung gemeint, nicht als Zusage.

| Wo | Aussage | Quelle |
|---|---|---|
| `consider_traffic` | Hauptstraßen 42,5 % bei 1,0 · 36,8 % bei 4,0 · 27,6 % bei 8,0 | Test „Belegte Gleichungen", 18.08.2026 |
| Abbiegehinweise | „automatisch" = byte-identisch mit „keine" | Test 9 |
| Tempolimit-Baustein | 23,7 % → 8,7 % (187 km) · 7,3 % → 7,0 % (156 km) | Test 2 |
| Asphalt-Notiz | `smoothness` fehlt auf ~70 % der Strecke | Test 1 |

**Diese Zahlen sind noch nicht breit genug abgesichert.** Sie stammen jeweils
aus einer Handvoll Strecken in Niedersachsen und im Harz. Als Einschätzung für
den Nutzer sind sie brauchbar und besser als gar nichts — als Naturgesetz taugen
sie nicht. Siehe `OFFENE-PUNKTE.md`, P14.

---

## Was als Nächstes zu messen wäre

1. **Die Längengrenze des Servers** (Test 6). Ohne Zahl kann die App weder
   warnen noch eine Strecke sinnvoll aufteilen.
2. **Die Umwelt-Schalter** (Test 4): `consider_forest`, `consider_noise`,
   `consider_river`, `consider_town` haben Datengrundlage — was kosten sie an
   Umweg?
3. **Die Prozentzahlen breiter absichern** (P14): dieselben Fragen auf fünf bis
   zehn Strecken in verschiedenen Gegenden, damit aus Einzelwerten Spannen
   werden.
4. **Ob `mtb` auf brouter.de dasselbe ist wie auf bikerouter.de** — der Name
   allein sagt es nicht.
