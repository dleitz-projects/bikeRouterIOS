# Umsetzung des Entwurfs vom 19.08.2026

Was beim Übertragen des Entwurfs in die App aufgefallen ist — und wie ich es
entschieden habe. Jede Entscheidung steht mit Begründung da, damit sie sich
umdrehen lässt, ohne dass jemand die Überlegung noch einmal führen muss.

**Alle Punkte hier sind zur Diskussion gestellt.** Was bestätigt wird, wandert
in die `CLAUDE.md`; was gekippt wird, bleibt hier mit dem Ergebnis stehen.

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | was gilt |
| `OFFENE-PUNKTE.md` | was am Gebauten noch offen ist |
| `UMSETZUNG.md` | was beim Bauen entschieden wurde und noch zu bestätigen ist |

---

## U1 — Ein Profilwechsel wirft den Routenstapel nicht mehr weg

**Vorher:** Wer das Profil wechselte, verlor die berechnete Route.

**Das ist mit dem Stapel genau verkehrt herum.** Dieselben Wegpunkte mit einem
anderen Profil zu rechnen ist der Zweck der Sache. Weggeworfen wird jetzt nur,
was nicht mehr zu den **Wegpunkten** passt.

**Entschieden:** Profilwechsel lässt den Stapel stehen; die Einblendung sagt
„noch einmal rechnen legt die Route dazu".

---

## U2 — Wegpunkt oder Sperrbereich geändert: der ganze Stapel geht weg

Ändert sich ein Wegpunkt, passt **keine** der gerechneten Routen mehr zur
Frage. Einzelne stehen zu lassen wäre schlimmer als sie zu verwerfen: Sie sähen
gültig aus, gehörten aber zu einer Fragestellung, die es nicht mehr gibt.

**Entschieden:** alles verwerfen. **Zu bedenken:** Wer nach fünf Vergleichen
einen Punkt verschiebt, verliert fünf Berechnungen — also fünf Anfragen an
gespendete Infrastruktur. Falls das im Gebrauch weh tut, wäre die Alternative
eine Rückfrage vor dem Verwerfen.

---

## U3 — Obergrenze: 24 Routen

Zuerst waren es sechs; auf Zuruf am 19.08.2026 auf **24 (A–X)** erhöht. Die
Grenze soll beim Ausprobieren nicht im Weg stehen — die Reiterzeile scrollt, und
aufgeräumt wird jetzt auch einzeln (U11).

**Zu bedenken:** Jede Route ist eine Anfrage an gespendete Infrastruktur. 24
sind kein Freibrief, sondern nur keine künstliche Bremse. Wer 24 Varianten
rechnet, sollte wissen, was er tut.

---

## U4 — Die Statuszeile zeigt nur noch, was man nicht sieht

Sie steht jetzt nur, solange **keine** Route da ist — und immer bei Fehlern
sowie während gerechnet wird. „Route B berechnet." neben den Kennzahlen von
Route B wäre gedoppelt.

Das ist der Mittelweg aus `OFFENE-PUNKTE.md`, P13: Die Zeile bleibt der einzige
Ort, an dem der Zustand **stehen** bleibt (eine Einblendung ist nach drei
Sekunden weg), kostet aber keinen Platz mehr, wenn sie nichts beiträgt.

---

## U5 — Das Kartenbild: nur freie Quellen, Nennung folgt der Karte

Aufgenommen sind **Standard** (OpenStreetMap), **Fahrradkarte** (CyclOSM) und
**Gelände** (OpenTopoMap) — alle drei ohne Anmeldung nutzbar. **Satellit** steht
grau daneben statt zu fehlen: Sonst fragt man sich in einem halben Jahr, ob es
vergessen wurde. Ohne Vertrag gibt es dafür keinen Anbieter.

**Die Nennung gehört zum Bild, nicht zur App.** Wer CyclOSM anzeigt, muss
CyclOSM nennen — das „©" am Kartenrand wechselt deshalb mit der Quelle.

**Zu bedenken:** Jede Quelle ist ein weiterer fremder Server. Das ist eine
andere Abhängigkeit als die Routing-Engine (kein Vertrag, kein Schlüssel, kein
Ausfall der Routenberechnung), aber es ist eine.

---

## U6 — Höhenprofil anfahren: über die Strecke, nicht über den Index

Im Entwurf lief die Zuordnung Profilstelle → Kartenpunkt über den Index der
ausgedünnten Geometrie. In der App geht sie über die **aufsummierte Distanz**:
BRouter liefert dichte Punkte in Kurven und dünne auf der Geraden — über den
Index gegangen liefe der Punkt aus dem Tritt.

Jede Route trägt dafür 140 gleichmäßig über die Strecke verteilte Stützstellen
mit Höhe und Kilometerstand.

**Der Punkt auf der Karte ist eine Leaflet-Ebene**, kein Element darüber: So
bleibt er beim Verschieben und Zoomen an seiner Stelle liegen, ohne dass die
App etwas nachrechnet.

---

## U7 — Der Baukasten liefert die Basisprofile mit

`OFFENE-PUNKTE.md` P8 hatte zwei Wege offen gelassen. **Entschieden: mitliefern**
(`basis/fastbike.brf`, `basis/trekking.brf`, zusammen 34 KB). Eine zweite fremde
Abhängigkeit im Betrieb wäre schlechter als 34 KB im Repo.

**Der Preis steht in `basis/README.md`:** Die Kopien altern still. Gemildert
dadurch, dass sie **nur für Profile mit Bausteinen** benutzt werden — ohne
Bausteine rechnet der Server mit seiner eigenen, aktuellen Fassung.

**Wie der Eingriff aussieht:** drei Einfügestellen, die in beiden Profilen
gleich aussehen — der Parameter in den globalen Abschnitt, die Regel vor
`assign costfactor`, ein `add <name>` in die Kette der Strafaufschläge.
Bewusst **kein** Ersetzen des Kostenausdrucks: Der ist mehrzeilig und in beiden
Profilen verschieden. Ein zusätzlicher Summand ist der kleinste Eingriff, den
man prüfen kann.

**Nachgemessen am 19.08.2026** über dieselben drei Wegpunkte im Harz:

| `consider_speed` | Strecke | Tempo ≥ 70 | Hauptstraßen | Kosten |
|---|---|---|---|---|
| 0 (Kontrolle) | 43,40 km | 25,5 % | 42,6 % | 115098 |
| 1,0 | 56,75 km | 4,5 % | 30,2 % | 123846 |
| 2,5 | 56,76 km | 4,4 % | 30,1 % | 129850 |

Mit 0 kommen **exakt** die Referenzwerte heraus — der Eingriff ist nachweislich
neutral, wenn er abgeschaltet ist. Auf dieser Strecke kostet er allerdings 31 %
Mehrweg statt der über 187 km gemessenen 10 %; wie teuer er wird, hängt stark
davon ab, ob es überhaupt eine ruhige Alternative gibt.

---

## U8 — Ein Profil mit Bausteinen kostet eine zusätzliche Übertragung, aber nur einmal

Die hochgeladene Kennung (`custom_…`) wird beim Profil gemerkt, zusammen mit
einem Streuwert des Textes. Solange sich am Text nichts ändert, wird nicht neu
hochgeladen. Ändern sich die Bausteine, verfällt die Kennung.

**Offen:** Was passiert, wenn der Server eine alte Kennung vergisst? `BROUTER.md`
Test 5 läuft dazu. Bis das geklärt ist, fehlt der Fall „einmal blind neu
hochladen und noch einmal versuchen".

---

## U9 — Touren speichern die Bausteine mit

Sonst ergäbe „Tour öffnen" eine andere Route als bei der Aufnahme — dieselbe
Begründung, aus der eine Tour schon bisher eine Kopie der Werte speichert und
keinen Verweis aufs Profil.

Beim Öffnen steht der Tourname jetzt in der Kopfzeile der Route
(`Route A · Tempolimit-Test · Okertal-Runde`) statt nur bis zum nächsten
Reiter-Tap.

---

## U11 — Einzelne Route entfernen

Der Aufräumen-Knopf räumt alles **bis auf die ausgewählte** ab. Für „genau diese
eine weg" sitzt jetzt ein Kreuz am **ausgewählten** Reiter — nicht an jedem:
Sonst wäre die Zeile ein Feld aus Löschknöpfen, und beim Durchklicken träfe man
das Falsche. Sichtbar ist das Kreuz klein, anfassbar sind 44 px.

**Die Buchstaben werden danach neu vergeben.** „A, C, F" liest sich wie ein
Fehler. Der Bezug für den Vergleich hängt deshalb an der Route selbst und nicht
an ihrem Buchstaben — sonst zeigte „gegenüber B" nach dem Löschen auf eine
andere Route.

---

## U12 — Gleiche Ergebnisse werden nicht doppelt abgelegt

Zwei Profile können dieselbe Route ergeben — belegt für `fastbike` mit
`consider_traffic = 1.0` gegen `fastbike-lowtraffic`. Sie zweimal übereinander
zu legen sähe nach Vergleich aus, wo keiner ist.

Verglichen wird über **Länge, Höhenmeter und Kosten**: Die Kosten unterscheiden
auch Routen, die zufällig gleich lang sind. Bei Gleichheit wird die vorhandene
Route ausgewählt und eingeblendet, welche das ist.

**Beim Testen bewährt:** Die Prüfung hat die dokumentierte Gleichung von selbst
noch einmal nachgewiesen.

---

## U13 — Wegpunkte im Höhenprofil

Zwischenpunkte stehen jetzt als dünne gestrichelte Linie mit ihrer Nummer im
Profil. Start und Ziel bleiben weg — sie sind die Ränder des Diagramms.

Die Lage wird über die nächstgelegene Stützstelle bestimmt, also über dieselbe
Kette wie das Anfahren (U6).

---

## U14 — Alle 29 Serverprofile sind wählbar, aber nicht alle einstellbar

Die vier eingerichteten Profile (Zügig, Wenig Verkehr, Sehr wenig Verkehr,
Trekking) haben einen Parameterkatalog und einen *Bearbeiten*-Knopf. Die
übrigen 25 sind **wählbar, aber ohne Regler** — und tragen das auch sichtbar
(„nur wählbar"), ebenso wie keinen Bearbeiten-Knopf.

**Begründung:** Welche Parameter etwa `mtb` kennt, weiß die App nicht. Regler
anzubieten, die der Server still ignoriert, wäre eine Lüge an der Oberfläche —
dieselbe Regel wie beim fehlenden Asphalt-Regler.

**Reihenfolge in der Vorauswahl:** erst die eingerichteten Profile, dann die
Gruppe, dann der Name. Andersherum stünde „Zügig (Asien/Pazifik)" auf Platz
vier — ein Profil, das in Europa Autobahnen erlaubt.

---

## U15 — Der zweite Baustein wurde gebaut und wieder verworfen

„Kopfsteinpflaster meiden" lag nahe: `surface` liegt zu 99,4 % vor. Gebaut,
hochgeladen, gemessen — **kein Effekt**: Die Route ändert sich weder auf der
Harz-Runde noch quer durch die Goslarer Altstadt, nur die ausgewiesenen Kosten
steigen. Der Grund steht in `fastbike.brf`: `cobblestone` zählt dort schon zu
`isunpaved` und wird ohnehin gemieden.

**Nicht gebaut.** Was nichts bewirkt, wird nicht angeboten — derselbe Maßstab
wie beim Regler ohne Datengrundlage. Die Messung steht in `BROUTER.md`, Test 7,
und der Baukasten sagt selbst, warum es nur einen Baustein gibt.

---

## U16 — Konsistenz geprüft

Nachgestellt am 19.08.2026 mit zwei Routen im Stapel:

| Geprüft | Ergebnis |
|---|---|
| Tour speichern bezieht sich auf die ausgewählte Route | ja — mit A ausgewählt landeten A's Werte und A's Profil in der Tour, nicht B's |
| Teilen (GPX) nimmt die ausgewählte Route | ja — Profil, Wegpunkte und Serverprofil kommen aus dem Routeneintrag |
| Tour öffnen rechnet mit den gespeicherten Werten | ja — dieselbe Länge auf den Meter, auch mit Baustein |
| Profilwechsel lässt den Stapel stehen | ja |
| Wegpunkt geändert verwirft den Stapel | ja, mit Angabe wie vieler Routen |
| Fehler beim Rechnen zerstört den Stapel nicht | ja — beim Watchdog-Fall blieb die vorhandene Route stehen |

---

## U18 — Zweite Runde am 19.08.2026

Was aus dem Durchsehen der gebauten App hervorging.

**Behoben:**

| Was | Warum es falsch war |
|---|---|
| Höhenprofil-Beschriftung verzerrt | `viewBox="0 0 340 104"` mit `preserveAspectRatio="none"` dehnt auf breiten Fenstern die Schrift mit. Jetzt viewBox in echten Pixeln |
| „©" wanderte im Vollbild mit nach oben | Es verschwindet jetzt, sobald der Kartenstreifen unter 92 px fällt — statt auf die Profilpille zu klettern |
| Vollbild ließ 92 px Karte | Jetzt 44 px: voll heißt voll, der Rest ist Griff zum Zurückziehen |
| Blatt sprang nach jeder Berechnung auf halb | Aufdringlich. Es bleibt jetzt, wo es war, mindestens klein — wer das Profil sehen will, zieht am Griff |
| Zähler „nie benutzt" stimmte nicht für alle | `store.tick` startete bei 1 statt 0 |
| „nur wählbar" in der Profilzeile | Sagte dem Nutzer nichts. Der fehlende Bearbeiten-Knopf sagt dasselbe ohne Wort |
| „Neu"-Knopf in der Profilliste | Ein zweiter Weg für etwas, das über *Bearbeiten* eines mitgelieferten Profils ohnehin entsteht |

**Neu:**

- **Der Startausschnitt kommt aus der Zeitzone**, nicht mehr aus dem Harz —
  siehe U19.
- **Profilbeschreibungen stehen wieder da**, an beiden Orten. Sie waren beim
  Übertragen aus dem Entwurf verlorengegangen; das war der stärkste Verlust.
- **Gemessene Zahlen stehen neben dem Regler** (`.pmess`), nicht nur in einer
  Markdown-Datei. Ein Wert ohne Größenordnung ist eine Zumutung.
- **`messungen/`** mit Skript, Referenzstrecken und Rohdaten.

---

## U19 — Startausschnitt aus der Zeitzone, ohne fremden Dienst

Die Karte stand beim ersten Start im Harz — also da, wo zufällig entwickelt
wurde. Drei Stufen lösen das jetzt, von genau nach grob:

1. **Der zuletzt betrachtete Ausschnitt.** Deckt jeden Start außer dem ersten.
2. **Die Zeitzone des Geräts.** `Intl.DateTimeFormat().resolvedOptions().timeZone`
   liefert `Europe/Berlin` — ohne Netzwerkzugriff, ohne Dienst, ohne dass etwas
   das Gerät verlässt. Eine Tabelle mit 16 europäischen Zonen macht daraus einen
   Kartenausschnitt.
3. **Mitteleuropa** als Rückfall.

**Warum keine IP-Geolokalisierung:** Die braucht immer einen fremden Dienst, dem
bei jedem Start die eigene Adresse mitgeteilt wird. Für eine App ohne Konto und
ohne Server wäre das die einzige Stelle, an der überhaupt Daten abfließen — und
genauer ist sie nicht: Beide treffen die Region, nicht den Ort. Wer den Ort will,
hat den Standort-Knopf.

Kostenlos wäre sie übrigens auch: `ipapi.co` und `ip-api.com` haben freie Tarife.
Die Frage war nie der Preis.

---

## U20 — „Übernehmen" statt „Bestehendes überschreiben"

Der alte Dialog bot *Als neues sichern* und *Bestehendes überschreiben*. Das
zweite klang, als würde etwas außerhalb dieses Profils ersetzt.

Jetzt drei Wege, der einfachste zuerst:

| Knopf | Was passiert |
|---|---|
| **Übernehmen** | Die Werte gelten ab sofort fürs Rechnen, ohne dass ein Profil entsteht. Sie stehen als *Übernommene Werte* ganz oben in der Liste und werden beim nächsten Übernehmen ersetzt |
| **Als neues Profil sichern** | Dauerhaft in der Liste, mit Namen |
| **„Harz ruhig" aktualisieren** | Nur bei eigenen Profilen, und mit dem Namen im Knopf — damit klar ist, was betroffen ist |

**Der Regelfall ist jetzt „Übernehmen".** Wer einen Regler verschieben will,
muss dafür kein Profil anlegen. Die Werte hängen an der Route: Wird sie
gespeichert, kommen sie als Kopie mit — eine gespeicherte Tour lässt sich
also immer nachrechnen, auch ohne dass je ein Profil entstand.

---

## U21 — Die Messungen liegen jetzt im Repo

`messungen/` enthält Referenzstrecken, ein Skript und die Rohdaten jedes Laufs.
Der Anlass war ein Fehler, den nur eine lange Strecke sichtbar gemacht hat:

**Der `smoothness`-Baustein war schon eingebaut**, gestützt auf eine Messung
über 43 km. Auf 156 km zeigte sich, dass er den Hauptstraßenanteil von 25 % auf
34 % hochtreibt — er bestraft die kleinen getaggten Nebenwege und belohnt die
ungetaggten großen. Wieder ausgebaut.

Daraus zwei Regeln, die jetzt festgeschrieben sind:

- **Mindestens 100 km** für jede Aussage über Routenwahl.
- **Immer eine Kontrolle mitmessen**, die den Eingriff neutral stellt.

Zusammenfassung in `messungen/ERKENNTNISSE.md`, Aufbauten in `BROUTER.md`.

---

## U22 — Der leere Balken unter dem Rechnen-Knopf

Auf dem iPhone stand unter dem Knopf ein rund 50 px hoher leerer Streifen — am
Rechner nicht zu sehen, weil es dort keine Safe Area gibt.

**Ursache:** `padding-bottom: calc(env(safe-area-inset-bottom) + 17px)`. Auf
einem Gerät mit Home-Indikator meldet `env()` bereits 34 px — das ist der
Abstand, den iOS für den Wischbalken vorsieht. Die zusätzlichen 17 px kamen
obendrauf, also 51 px.

**Behoben mit `max()` statt Addition:** `max(env(safe-area-inset-bottom), 17px)`.
Auf dem Gerät gelten 34 px, im Browser und auf Modellen ohne Indikator 17 px.
Es gibt keinen Fall, in dem beide Abstände zusammen nötig wären — der eine
ersetzt den anderen.

Dieselbe Korrektur an drei Stellen: Routenblatt, Vollbild-Ebenen und Menüs.

---

## U23 — Echte Screenshots auf der Startseite

Die Platzhalter sind ersetzt. Alle neun Bilder sind iPhone-Aufnahmen vom
19.08.2026.

**Zwei Bilder mussten bearbeitet werden:** Das Teilen-Menü zeigte die
AirDrop-Kontaktzeile mit vier Namen und Profilfotos erkennbarer Personen.
Verpixelt mit `werkzeuge/unkenntlich.py`.

**Verpixelt, nicht geschwärzt** — der Screenshot soll weiter zeigen, *dass* dort
eine Kontaktzeile steht, nur nicht mehr *wer*. Ein schwarzer Balken sähe aus wie
ein Fehler im Bild.

**Nebenbei gelernt:** iPhone-Screenshots kommen mit **16 Bit pro Kanal**. Ein
selbstgeschriebener PNG-Dekoder muss das können, sonst kommt Rauschen heraus —
mein erster Versuch hat genau das produziert. Das Werkzeug geht deshalb über
BMP als Zwischenformat, das `sips` auf jedem Mac erzeugt.

Die Rohbilder liegen nicht im Repo (`.gitignore`): Sie sind groß und können
persönliche Daten enthalten.

---

## U24 — Der graue Balken *unter* dem Blatt: das Fenster ist nicht der Bildschirm

Nach U22 stand weiterhin ein Streifen unter dem Rechnen-Knopf. Es war aber
nicht derselbe Fehler: Der Streifen liegt **außerhalb** des Blattes und trägt
`--ground` statt `--sheet`.

**Nicht geschätzt, sondern ausgemessen** — mit dem neuen
`werkzeuge/bildmass.py`, das jeden Farbwechsel entlang einer Linie mit
Bildpunkt, CSS-Pixel und Farbnamen aus `style.css` ausgibt:

```
y  2617–2681    872.3–893.7  css   65 px  #F7F8F2  --sheet (hell)
y  2682–2867    894.0–955.7  css  186 px  #E9EBE3  --ground (hell)
```

Bildschirm 956 px, Blattunterkante bei 893,7 px, und die Seite beginnt am
obersten Bildschirmpunkt (die erste Bildpunktzeile trägt Kartenfarbe). Die
fehlenden **62 px sind auf den Punkt `env(safe-area-inset-top)`** — dieselben
62 px, die oben zusätzlich da sind. Die App wird über die volle Höhe
gezeichnet, das Layout rechnet ohne den oberen Systemstreifen.

**Zwei Änderungen, die zweite sichert die erste ab:**

1. `.app` ist so hoch wie der Bildschirm, nicht wie das Fenster. Die Differenz
   wird gemessen und dreifach eingezäunt — nur in der installierten App,
   höchstens der obere Systemstreifen, nie negativ. Wo der Browser richtig
   rechnet, kommt null heraus und nichts ändert sich. Alle Höhenrechnungen
   gehen seitdem gegen den Rahmen (`appH()`), nicht gegen das Fenster.
2. Die Leinwand trägt `--sheet` statt `--ground`. Unten sitzt in jedem Zustand
   ein Blatt; malt das System außerhalb des Fensters, malt es jetzt in der
   Farbe, die dort ohnehin hingehört.

**Am Gerät geprüft, und Punkt 1 ist widerlegt.** iOS zeichnet **nicht**
unterhalb des Fensters: Es malt dort die Hintergrundfarbe, schneidet Inhalt
aber am Fensterrand ab. Der Streifen blieb, und nun lag die Unterkante des
Blattes darin — Analysekarten angeschnitten, das ganze Blatt 62 px zu tief.
Punkt 1 ist deshalb zurückgenommen, `.app` steht wieder auf `inset:0`. Punkt 2
bleibt: Der Streifen ist nicht mehr von der Unterkante des Blattes zu
unterscheiden.

*Die Regel daraus: Ein zu kleines Fenster ist an seiner Ursache zu beheben,
nicht durch Übergröße im Inneren. Und dass das System eine Fläche färbt, heißt
nicht, dass die Seite darauf zeichnen darf.*

**Neu dazu: `DARSTELLUNG.md`.** Neun Darstellungsfallen sind inzwischen am
Gerät aufgelaufen und keine einzige davon im Browser aufgefallen. Sie standen
verstreut in `CLAUDE.md`; jetzt stehen sie zusammen, mit Messverfahren,
Gerätetabelle und einer Prüfliste für die Sichtkontrolle. `CLAUDE.md` behält
nur, was gilt.

---

## U25 — `black-translucent` gestrichen

Der Griff an die Ursache statt an die Wirkung, nachdem U24 Punkt 1 am Gerät
gescheitert war. Die Zeile
`<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
ist raus; `viewport-fit=cover` bleibt und liefert weiter die Systemabstände.

**Zwei mögliche Ausgänge, beide besser als der Zustand davor:**

| Ausgang | Woran zu erkennen | Folge |
|---|---|---|
| Fenster wird 956 px | oberste Bildpunktzeile trägt Kartenfarbe | randlose Karte bleibt, 62 px gewonnen |
| Fenster bleibt 894 px, rückt unter die Statusleiste | oberste Zeile trägt Systemfarbe | nichts mehr abgeschnitten, dafür beginnt die Karte unter der Statusleiste; `safe-area-inset-top` ist dann null |

**Eingetreten ist der zweite Ausgang** (am Gerät, 19.08.2026, 17:56): Das
Fenster bleibt 894 px und rückt unter die Statusleiste. Die Seite reicht jetzt
bis 955,7 css — unten fehlt nichts mehr.

Der Tausch ist trotzdem gut, und zwar aus einem Grund, den ich vorher nicht
gesehen hatte: Mit `black-translucent` waren dieselben 62 px **zweimal** weg —
oben als reservierter Systemstreifen, unten als unerreichbarer Rand. Für Inhalt
blieben 832 px. Jetzt sind es 894. Und die Dynamic Island überlappt die Seite
überhaupt nicht mehr, womit Falle 6 aus `DARSTELLUNG.md` gar nicht mehr
auftreten kann.

**Der Stolperstein war real und hat zwei Deployments gekostet:** iOS liest die
`apple-mobile-web-app-*`-Zeilen beim **Anlegen** des Symbols, nicht bei jedem
Start. Sie stecken im Symbol, nicht in der Seite. Erst nach Löschen und
Neu-Hinzufügen war die Änderung da. Erkennungszeichen: Die App verhält sich
nach einer Einstellung, die im ausgelieferten HTML gar nicht mehr steht.

---

## U26 — Das „©" im Vollbild

Alles, was über dem Blatt schwebt, verschwindet, sobald der Streifen Karte zu
schmal wird — so steht es in der `CLAUDE.md`, und für Werkzeugleiste und Zoom
stimmte es auch. Das „©" blieb stehen und schob sich halb hinter die
Profilpille.

**Ursache:** Die Schwelle rechnete gegen den **ganzen** Streifen statt gegen
den nutzbaren und kam so auf genau 92 — abgeschnitten wurde aber erst *unter*
92. Ein Gleichstand auf die Stelle, der auf einem Gerät mit anderem
Systemstreifen nie aufgefallen wäre.

**Neu:** gemessen wird gegen den Streifen ohne den oberen Systembereich, jedes
Element an seiner eigenen Höhe, und es braucht nach oben dieselbe Luft, die es
nach unten hat. Damit fällt der Vollbild-Fall von selbst heraus — der Streifen
ist 44 px, das kleinste Element 30 px, und 30 + 14 + 14 passt nicht hinein. Im
Browser über alle vier Rasten durchgespielt: leer, klein und halb zeigen alles,
voll nichts.

Keine einzige Gerätezahl steht dafür im Code. Genau das ist die Absicht — feste
Schwellen tragen den Systemstreifen des Geräts in sich, an dem sie ermittelt
wurden.

---

## U27 — Die Farbe der Statusleiste

Folge von U25: Wo die Seite unter der Statusleiste beginnt, streicht iOS deren
Grund mit der **`theme-color`**. Die stand auf `--ground` — der Farbe der Karte.
Damit lag ein 62 px hoher Streifen Kartenfarbe **über** der Karte, ohne Karte
darin: der graue Balken oben.

**Jetzt `--sheet`**, in beiden Farbschemata, dazu passend `theme_color` im
Manifest. Die Begründung ist dieselbe wie bei der Leinwand unten: Was das System
für uns malt, ist eine Fläche der App — und jede randlose Fläche dieser App ist
`--sheet`. Oben und unten tragen damit denselben Ton, die Karte liegt dazwischen.

`background_color` im Manifest bleibt `--ground`: Das ist der Startbildschirm
beim Laden, keine Fläche neben der Karte.

---

## U28 — Der Kartenstreifen wird gegen die Kopfzeile gemessen

**Vorher:** Der Streifen über dem Blatt war 44 px hoch, gerechnet ab dem
Systemstreifen. Die Kopfzeile braucht aber 56 px (12 Innenabstand + 44 Knopf) —
die Profilpille ragte also 12 px ins Blatt und wurde unten angeschnitten.

Der Fehler steckte schon vorher drin; er fiel erst auf, als der Streifen von
106 auf 44 px schrumpfte (U25). Vorher hatte die Pille genug Karte um sich
herum, um nicht wie ein Fehler auszusehen.

**Jetzt:** gemessen ab `.chrome`-Unterkante. Die enthält den Systemstreifen
schon, weil ihr Innenabstand `calc(env(safe-area-inset-top) + 12px)` ist. Ein
gemessener Wert statt zweier gerechneter — und dieselbe Zahl gilt für den
Streifen wie für alles, was über dem Blatt schwebt.

**Mitgenommen: der Prozentwert der halben Raste.** Er stand auf 62 % der
Fensterhöhe. Jetzt endet die halbe Raste dort, wo die Werkzeugleiste gerade
noch Platz hat — in dieser Raste wird auf der Karte gearbeitet, dafür braucht
es die Leiste. Auf dem gemessenen iPhone kommt fast derselbe Wert heraus, aber
jetzt steht da, **warum** er so hoch ist. Für vier durchgerechnete Fenster
(dieses hier, iPhone mit und ohne `black-translucent`, ein kleines Gerät) gilt
in allen: Leiste in der halben Raste sichtbar, im Vollbild alles weg, Kopfzeile
nie überlappt.

---

## U29 — Der Versuch, Vollbild und vollen unteren Rand zugleich zu bekommen

**Die Frage:** Muss man sich wirklich entscheiden, ob die 62 px oben über der
Karte oder unten unter dem Blatt liegen?

**Der Messwert, der dagegen spricht.** Am 19.08.2026 um 17:16 stand im Manifest
noch `background_color: #E9EBE3`, die Seite malte ihre Leinwand aber schon in
`#F7F8F3`. Der Streifen unter dem Blatt trug:

```
y 2682–2867   894,0–955,7 css   #F7F8F3   --sheet
```

Die Farbe der **Seite**, nicht die des Systems. Die Seite malt also bis 956 —
der sichtbare Bereich reicht bis unten, nur der Rechenbereich endet bei 894.

**Warum der erste Versuch trotzdem scheiterte** (U24): Er dehnte einen
`position:fixed`-Rahmen. `fixed` hängt am Rechenbereich und wird an dessen Kante
abgeschnitten. Ein **Dokument**, das selbst höher ist, mit Inhalt im normalen
Fluss, ist etwas anderes — und war ungetestet.

**Jetzt gebaut:** `black-translucent` zurück (Karte wieder bis zur obersten
Bildpunktzeile), `html` so hoch wie der Bildschirm, `body` mit
`position:relative`, `.app` absolut darin. `overflow:hidden` ist weg — es
schnitte genau an der Kante ab, um die es geht; stattdessen hält ein
Scroll-Handler die Seite auf 0.

Die Korrektur ist wie in U24 dreifach eingezäunt: nur in der installierten App,
höchstens der obere Systemstreifen, nie negativ. Im Browser und überall, wo
Safari richtig rechnet, ist sie 0 und ändert nichts — nachgeprüft.

**Ergebnis am Gerät: gescheitert.** Der Streifen bleibt. Safari schneidet auch
im normalen Fluss am Fensterrand ab. Damit ist die Frage endgültig beantwortet
statt vermutet: **Der sichtbare Bereich ist das Fenster.** Dass das System
darunter die Hintergrundfarbe malt, heißt nur, dass es die Leinwand weiterführt.

**Entschieden: `black-translucent` bleibt.** Die Karte reicht bis zur obersten
Bildpunktzeile, die 62 px liegen unten unter dem Blatt in dessen Farbe. Der
Preis sind 62 px weniger Platz für Inhalt. Die Gegenprobe ist eine Zeile weit
entfernt, und beide Zustände sind am Gerät gesehen — die Wahl fiel auf die
Karte. Im Querformat stellt sich die Frage nicht, dort ist der Systemstreifen
null.

---

## U30 — Doppelte Ränder: 96 px über dem Bildschirmrand

Der Rechnen-Knopf stand 96 px über der untersten Bildpunktzeile: 62 px
unerreichbarer Streifen **plus** 34 px Innenabstand des Blattes für den
Home-Indikator. Beides leistet dasselbe. Oben dieselbe Rechnung: 62 px
Systemstreifen **plus** 12 px Innenabstand der Kopfzeile.

**Jetzt wird abgezogen statt addiert:**

| | vorher | jetzt |
|---|---|---|
| Profilpille, Oberkante | 74 px | **62 px** — direkt unter der Dynamic Island |
| Rechnen-Knopf über dem Rand | 96 px | **62 px** |

Oben und unten dieselbe Zahl — kein Zufall, es ist derselbe Streifen. Im
Stylesheet: `max(max(env(...), 17px) - var(--fenstermangel), 0px)` unten und
`max(env(...), 12px)` oben. Ohne Systemstreifen ändert sich nichts, dort greifen
die alten Werte.

**Das ist die dritte Fassung derselben Regel** — nach dem 51-px-Balken im Blatt
(U22) und dem Kartenstreifen gegen die Kopfzeile (U28): Ein Systemstreifen ist
ein Rand, kein Zuschlag zu einem Rand.

**Zum Prüfen genügen zwei Aufrufe** — an den `apple-mobile-web-app-*`-Zeilen hat
sich nichts geändert, das Symbol muss nicht neu angelegt werden.

---

## U17 — Was noch nicht umgesetzt ist

- **Route auf der Karte antippen** funktioniert, ist aber mit einer dünnen
  grauen Linie unter dem Daumen nicht immer leicht zu treffen. Die Reiter sind
  der verlässliche Weg. Ob die Linie eine größere unsichtbare Trefferfläche
  bekommt, ist offen.
- **Farbe je Route** statt „ausgewählt kräftig, Rest grau" — bewusst nicht
  gebaut: Das gäbe derselben Fläche eine zweite Bedeutung.
- **Ortssuche, Snapping, automatische Tourennamen** — hängen weiter an der
  einen Nominatim-Entscheidung (`CLAUDE.md`).
- **Weitere Bausteine.** Gebaut ist nur der gemessene (`maxspeed`); der zweite
  Kandidat ist an der Messung gescheitert (U15). Die Umwelt-Schalter aus
  `IDEEN.md` Idee 6 brauchen keinen Baustein, sondern nur einen Regler — das ist
  eine andere Baustelle.
- **Parameter für die 25 übrigen Serverprofile.** Sie ließen sich aus den
  Profiltexten lesen (die Kommentare tragen `%name% | Beschreibung | Typ`), aber
  dann müsste die App jeden Text mitliefern oder holen. Vorerst: wählbar, nicht
  einstellbar.
- **Ein Wort für den Fall „24 Routen erreicht".** Die Meldung sagt „erst
  aufräumen"; ob das im Gebrauch je vorkommt, ist offen.
