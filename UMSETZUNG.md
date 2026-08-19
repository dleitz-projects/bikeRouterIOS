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
