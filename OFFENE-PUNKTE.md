# Offene Punkte

Entscheidungen, die **an bereits Gebautem hängen** und noch nicht gefallen sind.

Abgrenzung zu den Nachbardateien:

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | Was gilt |
| `BROUTER.md` | Was gemessen ist, plus offene **Tests** an der Engine |
| `IDEEN.md` | Was man **zusätzlich** bauen könnte |
| `OFFENE-PUNKTE.md` | Wie etwas heißen oder sich verhalten soll, das es schon gibt |
| `UMSETZUNG.md` | Was beim Bauen entschieden wurde und noch zu bestätigen ist |
| `PROFILE.md` | Welche Profile es gibt und welche wir übernehmen |
| `SERVER.md` | Wer die Server betreibt und was sie aushalten |

Ein Punkt verschwindet hier nicht, wenn er entschieden ist — er bekommt das
Ergebnis angehängt und wandert bei Bedarf als Regel in die `CLAUDE.md`.

---

## P1 — Wie heißt der Bereich für Bausteine? · vorerst „Baukasten"

**Stand 18.08.2026: bleibt „Baukasten", wird im Betrieb geprüft.**

Zur Wahl standen *Baukasten*, *Regeln*, *Erweitert*, *Entwicklermodus*,
*Werkstatt*.

*Gegen „Erweitert":* verspricht mehr vom Gleichen — noch mehr Regler. Zudem gibt
es im normalen Editor bereits einen Abschnitt *Diagnose* mit den seltenen
technischen Schaltern; genau dort würde man „Erweitert" vermuten. Zwei Orte mit
demselben Versprechen.

*Gegen „Entwicklermodus":* signalisiert „nicht für dich gedacht", obwohl der
einzige Nutzer genau die Zielgruppe ist. Und es bedeutet anderswo Diagnose und
Fehlersuche, nicht neue Funktionen bauen.

*Für „Regeln" sprach:* Der einfache Editor ändert Werte, dieser ändert Regeln —
und daran hängt auch, ob ein Upload nötig ist.

*Dagegen — und das gab den Ausschlag:* **Aus Nutzersicht ist das kein
Unterschied.** Ein Schalter „Ortschaften umfahren" im normalen Editor fühlt sich
an wie ein Baustein. Die Trennung Werte/Regeln ist unsere interne, technische —
kein Benennungskriterium für die Oberfläche.

*Was der Name wirklich transportieren muss:* dass es hier **tiefer** wird, dass
Widersprüche möglich sind und die Folgen weniger vorhersehbar. Ein Ort zum
Ansehen, nicht zum unbekümmerten Herumtippen.

**Zu klären im Betrieb:** Trägt „Baukasten" diese Warnung? Der Verdacht ist, dass
er zu einladend klingt. Erst benutzen, dann entscheiden.

---

## P2 — Woraus besteht der Name einer gespeicherten Tour? · offen

Das Auffälligste an einer Tour ist, **wo sie langgeht** — „Hannover → München",
„Osterausfahrt". Kilometer und Höhenmeter sind relevant, aber zweitrangig. Offen
ist, was davon automatisch entsteht und was der Nutzer selbst schreibt.

**Harte Einschränkung:** Ortsnamen automatisch zu erzeugen bräuchte einen
**zweiten externen Dienst** (Nominatim oder ähnlich). Das berührt die
Architekturentscheidung, die in der `CLAUDE.md` unter „Snapping der Wegpunkte"
bereits offen liegt — und die dort bewusst vertagt wurde. **Ohne diese
Entscheidung ist ein automatischer Name aus Ortsnamen nicht möglich.**

Vorschlag bis dahin:

| Ebene | Inhalt | Herkunft |
|---|---|---|
| Name | „Okertal-Runde" | vom Nutzer, vorbelegt mit Datum |
| Kennzeile | `43,5 km · 965 hm · Harz ruhig` | automatisch |
| Detail | Basisprofil plus die stärksten Abweichungen | automatisch |

**Zu klären:** Reicht der Profilname in der Kennzeile, oder gehört das
Basisprofil dazu? Und ab wie vielen Abweichungen wird die Zeile unlesbar?

**Mitentschieden werden muss:** Eine Tour speichert eine **Kopie** der
verwendeten Werte, keinen Verweis aufs Profil. Sonst wird eine alte Tour
rückwirkend falsch beschriftet, sobald das Profil sich ändert — und beim
Wiederherstellen käme eine andere Route heraus als damals. Daraus folgt der
Hinweis „Profil hat sich seit dieser Tour geändert" samt Wahl zwischen alten und
heutigen Werten.

---

## P3 — Bleibt die Sprungleiste im Profil-Editor? · vorerst ja

Bei durchgehendem Scrollen ist ihr Nutzen strittig, und sie kostet Platz. Für die
Übersicht über sechs Abschnitte spricht sie. Am 18.08.2026 deutlich kompakter
gemacht und vorerst behalten.

**Zu klären im Betrieb:** Wird sie tatsächlich benutzt, oder scrollt man ohnehin?

---

## P4 — Bleibt der freie Profiltext? · offen, Neigung nein

Im Baukasten unten als Textfeld vorhanden, damit die Entscheidung an etwas
Sichtbarem fallen kann.

*Dagegen:* Einen Syntaxfehler quittiert der Server mit `HTTP 500` und leerem
Body — keine Zeile, kein Hinweis, nur „geht nicht". Ein Tippfehler in einem
Parameternamen fällt sogar völlig lautlos aus, weil unbekannte Namen still
ignoriert werden.

*Dafür:* Der Baukasten trägt alles, was sich als „Angabe X bewerten mit Stärke Y"
formulieren lässt. Er stößt an Grenzen bei verknüpften Bedingungen —
„Hauptstraße **ohne** Radweg **und** über Tempo 70".

**Vorschlag:** ohne Freitext bauen. Fehlt konkret etwas, wird daraus ein neuer
Baustein statt eines Texteditors — dann bleibt jede Regel getestet.

---

## P5 — Was passiert beim Bearbeiten eines nicht aktiven Profils? · vorläufig gelöst

Seit 18.08.2026 schließt die Profilauswahl beim Auswählen nicht mehr, und jede
Zeile hat einen Bearbeiten-Knopf.

Vorläufig umgesetzt: Bearbeiten **aktiviert nicht**. Ansehen ist noch keine
Entscheidung. Stattdessen zeigt der Editor bei einem fremden Profil oben rechts
*Verwenden* statt *Fertig*.

**Zu klären:** Ist diese Trennung im Gebrauch spürbar sinnvoll, oder will man
nach dem Bearbeiten ohnehin immer wechseln?

---

## P6 — Sperrbereiche nachträglich ändern · erledigt 18.08.2026

Gelöst zusammen mit einem größeren Problem, das dabei auffiel: **Rückgängig kann
nur in umgekehrter Reihenfolge löschen.** Wer sechs Wegpunkte gesetzt hat und den
zweiten loswerden will, müsste vier gute mit zerstören. Das ist keine
Unbequemlichkeit, sondern eine Sackgasse.

**Lösung: Jedes gesetzte Element ist antippbar und öffnet ein kleines Menü direkt
am Objekt.** Wegpunkte bieten Löschen, Sperrbereiche Löschen und *Radius ändern* —
letzteres startet den Zwei-Tap-Vorgang neu, der Mittelpunkt bleibt stehen.

Kein neues Muster: Die bestehende `app.js` bindet an jeden Wegpunkt bereits ein
Popup mit „Punkt löschen". Neu ist nur, dass Sperrbereiche dasselbe bekommen.

Drei Entwurfsentscheidungen dabei:

**Der Mittelpunkt ist das Ziel, nicht die Kreisfläche.** Wäre die Fläche
antippbar, schluckte ein großer Sperrbereich jeden Tap auf die Karte darunter —
dort ließe sich kein Wegpunkt mehr setzen. Der Rand wiederum ist als dünne Linie
auf dem Touchscreen kein Ziel. Deshalb bleibt der Mittelpunkt dauerhaft sichtbar;
er zeigt nebenbei an, dass hier etwas anfassbar ist.

**Verschieben bleibt Ziehen, das Menü deckt nur ab, was Ziehen nicht kann.**
Wegpunkte sind in der echten App ziehbar, und dafür ist Ziehen unschlagbar. Ein
zweiter, schlechterer Weg daneben wäre Ballast.

**Vorhandene Elemente gewinnen gegen den aktiven Modus.** Ein Tap auf ein Objekt
öffnet dessen Menü, unabhängig davon, ob gerade Wegpunkt- oder
Sperrbereich-Modus aktiv ist. Sonst legte man einen Kreismittelpunkt auf einen
Wegpunkt und käme an keinen von beiden mehr heran.

**Verworfen:** langes Drücken statt Antippen. Auf iOS kollidiert das mit
Systemgesten und ist nicht zu erraten.

**Rückgängig bleibt trotzdem.** Es ist der schnellste Weg für den Fehler, den man
gerade eben gemacht hat — ein Tap statt zielen, Menü öffnen, löschen.

---

## P7 — Verhalten der Profil-Kurzauswahl · entschieden 18.08.2026

Drei Fragen, die beim Ausprobieren des Entwurfs auffielen, und wie sie gelöst sind.

**Die Reihenfolge sprang beim Auswählen.** Das aktive Profil wurde nach oben
sortiert und tauschte mit dem, was dort stand. Unter dem Finger die Plätze zu
tauschen kostet sofort die Orientierung.

→ **Die Reihenfolge wird beim Öffnen eingefroren** und steht still, solange das
Blatt offen ist. Neu sortiert wird erst beim nächsten Öffnen. Das aktive Profil
wird dabei *nicht* vorgezogen — der gefüllte Punkt reicht als Kennzeichnung.

**Was passiert bei einer Auswahl aus „Mehr Profile"?** Rückt es an die erste
Stelle? Fällt dafür eines heraus?

→ **Es rückt an die erste Stelle, alle anderen eine Position nach unten, die
Liste bleibt fünf lang — der letzte fällt heraus.**

Mein erster Vorschlag war, die Liste stattdessen auf sechs wachsen zu lassen,
damit sich nichts bewegt. Verworfen: Wer aus einer anderen Ebene kommt, kommt
**neu hinzu**, und genau das soll man sehen. Das Argument dagegen — das Springen
der Zeilen — gilt hier nicht, weil die Ebene ohnehin gewechselt wird und der
Blick neu ansetzt.

Wichtig ist die Unterscheidung: **Auswahl innerhalb der Vorauswahl bewegt nur
den Punkt. Auswahl aus der Vollliste rückt nach oben.** Verschiedene Ebenen,
verschiedenes Verhalten — aber jeweils dasjenige, das die Wahrnehmung ordnet.

**Der Editor öffnete sich hinter dem Profilblatt, die Profilliste über dem
Baukasten.** Zwei Ausprägungen desselben Fehlers: Bei gleichem `z-index`
gewinnt das später im Markup stehende Element. Welche Ebene obenauf liegt, hing
also an der Reihenfolge im Dokument statt am Aufruf.

→ **Ebenen bekommen ihren `z-index` beim Öffnen zugewiesen**, aufsteigend. Damit
liegt immer obenauf, was zuletzt aufgerufen wurde — unabhängig vom Markup. Ein
fester Wert je Ebene löst das nicht, sobald zwei Ebenen gleichzeitig offen sein
können. Die Regel steht in der `CLAUDE.md` unter „Gestaltung".

Zusätzlich: Der Editor **schließt die aufrufende Ebene** und öffnet sie beim
Zurückgehen wieder, damit man dort landet, wo man losgegangen ist. Die Vollliste
dagegen lässt die Vorauswahl darunter stehen — sie ist Ebene 3 über Ebene 2.

**Zu klären im Betrieb:** Ist das Zurückkehren zur aufrufenden Ebene angenehm,
oder ist es ein Tap zu viel auf dem Weg zurück zur Karte?

---

## P8 — Woher kommt der Profiltext für den Baukasten? · entschieden 19.08.2026

**Ergebnis: mitliefern.** `basis/fastbike.brf` und `basis/trekking.brf` liegen
im Repo, zusammen 34 KB. Eine zweite fremde Abhängigkeit im Betrieb wäre
schlechter. Der Baukasten ist damit scharf; die Kontrolle (`consider_speed = 0`
liefert exakt die Referenzwerte) ist am 19.08.2026 bestanden. Begründung,
Alterungsproblem und Abgleich-Weg: `basis/README.md` und `UMSETZUNG.md` U7.

Die ursprüngliche Abwägung bleibt darunter stehen.

---

## P8-alt — die Abwägung dazu

Beim Umsetzen aufgefallen und vorher übersehen: **Neue Regeln brauchen den
vollständigen Profiltext.** Der Upload-Weg (`POST /brouter/profile`) erwartet
eine komplette `.brf`-Datei, nicht ein Änderungsfragment.

Die API gibt diesen Text nicht heraus — `GET /brouter/profile/<id>` ist kein
Download, sondern liefert eine Fehlermeldung als JSON. Ein hochgeladenes Profil
lässt sich also nicht einmal zurücklesen.

Damit gibt es genau zwei Wege, und beide sind Entscheidungen:

| Weg | Preis |
|---|---|
| `fastbike.brf` und `trekking.brf` **im Repo mitliefern** | rund 24 KB, und die Kopien laufen mit der Zeit vom Original weg |
| Zur Laufzeit **von GitHub holen** | zweite fremde Abhängigkeit, entgegen der bisherigen Linie |

**Solange das offen ist, zeigt der Baukasten nur, was kommen soll, und tut
nichts.** Ein toter Knopf wäre schlimmer als ein ehrlicher Hinweis.

**Für die Abwägung wichtig:** Der Nutzen ist bereits gemessen. Ein Baustein, der
`maxspeed` bewertet, senkt den Anteil an Straßen mit Tempo 70 oder mehr von
23,7 % auf 8,7 % — bei rund 10 % Mehrweg. Siehe `BROUTER.md`, Test 2.

**Verwandt:** Die Kopien im Repo hätten dasselbe Problem wie jede eingefrorene
Fremddatei — sie altern still. Das spricht für einen Abgleich-Hinweis, nicht für
blindes Mitliefern.

---

## P9 — Fünf Bearbeiten-Knöpfe untereinander · offen

Beim visuellen Durchsehen am 18.08.2026 aufgefallen: In der Profilauswahl trägt
**jede** Zeile einen umrandeten Knopf „Bearbeiten". Fünf davon untereinander
ergeben einen kräftigen orangen Streifen am rechten Rand, der mit den
Profilnamen um Aufmerksamkeit konkurriert. Auf einem schmalen Display wird es
enger, und die Namen brechen früher ab.

Der Grund für die Knöpfe bleibt richtig: Einsehen und Bearbeiten sind zentral
und dürfen nicht hinter mehreren Taps liegen (siehe P7).

**Vorschlag:** Umrandung nur beim **aktiven** Profil, bei den übrigen schlichter
oranger Text ohne Rahmen. Gleiche Trefferfläche, gleiche Erreichbarkeit — aber
nur noch ein betonter Knopf statt fünf.

**Zu klären:** Ist der schlichte Text noch deutlich genug als Knopf erkennbar,
oder verliert man ihn? Am Gerät entscheiden.

---

## P10 — Wie heißen die Reiter im Routenstapel? · entschieden 19.08.2026

**Ergebnis: oben nur `A`, `B`, `C`. Der ganze Kontext steht unter der Auswahl.**

Im Entwurf vom 19.08.2026 trug jeder Reiter noch „A · Wenig Verkehr · 43,4 km".
Das liest sich gut bei zwei Routen und bricht bei zehn: Die Reiter werden so
breit, dass man nicht mehr durchklicken, sondern nur noch scrollen kann. Wer
mehrere Varianten vergleicht, will schnell hin und her — genau das verhindert
eine lange Beschriftung.

Deshalb:

| Ort | Inhalt |
|---|---|
| Reiterzeile | nur der Buchstabe: `A` `B` `C` … |
| darunter, für die ausgewählte | Route A · Wenig Verkehr · 43,4 km · 965 hm · 3:36 h |
| darunter | Vergleich zur **zuletzt ausgewählten** Route |

Der Vergleich bezieht sich bewusst auf die zuletzt ausgewählte und nicht fest
auf A: Wer von B nach C springt, will den Unterschied zu B sehen.

**Noch offen:** Was der Buchstabe bedeutet, wenn eine Route dazwischen gelöscht
wird. Rutschen die Buchstaben nach (aus C wird B) oder bleiben sie stehen? Für
Nachrutschen spricht die kurze Liste ohne Lücken, dagegen, dass sich unter dem
Finger eine Beschriftung ändert.

---

## P11 — Die Rasten des Routenblatts · entschieden 19.08.2026

**Ergebnis: vier Zustände, jeder mit eigenem Inhalt.** Im Entwurf gebaut und
durchgeklickt:

| Zustand | Inhalt | wie man hinkommt |
|---|---|---|
| **leer** | nur der Knopf | Ausgangslage, bevor gerechnet wurde |
| **klein** | Kennzahlen und Bedienung; Reiter erst ab zwei Routen | Griff |
| **halb** | dazu das Höhenprofil, **Karte bleibt sichtbar** | automatisch nach jeder Berechnung |
| **voll** | die ganze Analyse | Griff |

Ein eigener Knopf *Analyse* stand kurz daneben und ist wieder entfallen: Zwei
Bedienelemente für dieselbe Bewegung, und der Griff kann es ohnehin. Aus der
halben und der vollen Raste holt außerdem ein Tap auf die Karte zurück.

**Die Werkzeugleiste bleibt, solange sie Platz hat** — auch in der halben Raste.
Sie dort auszublenden war kurz gebaut und wieder verworfen: In der halben Raste
wird gearbeitet (Punkte setzen, Sperrbereich anlegen, Modus wechseln), und genau
dort die Werkzeuge wegzunehmen wäre widersinnig. Erst im Vollbild ist kein Platz
mehr, dann verschwindet sie von selbst. Gedeckelt wird nichts: Ein Deckel schöbe
die Leiste unter das Blatt, und der unterste Knopf wäre unerreichbar — derselbe
Fehler wie am 18.08.2026.

**Die halbe Raste hat jetzt einen Grund, den keine andere erfüllen kann.** Wer
im Höhenprofil eine Stelle antippt, will auf der Karte sehen, wo die Steigung
liegt — dafür müssen beide gleichzeitig da sein. Im Vollbild bliebe von der
Karte nichts, in der kleinen Raste gäbe es kein Profil. Im Entwurf ist das
Anfahren gebaut: Finger aufs Profil, Punkt auf der Karte, mit Kilometer und
Höhe. Dazu lässt sich in der halben Raste durch die Analyse scrollen, ohne die
Karte zu verlieren.

**Deshalb geht das Blatt nach dem Rechnen auf halb**, nicht ins Vollbild: Dort
steht das Ergebnis vollständig — Kennzahlen, Profil und die Linie auf der Karte.

**Die Höhen werden gemessen, nicht gesetzt.** Klein ist mit einer Route
niedriger als mit dreien; halb endet unter der Höhenprofil-Karte, gedeckelt bei
62 % der Bildhöhe, damit ein Drittel Karte bleibt.

**Ziehen ist der Weg, Tippen die Abkürzung.** Am Griff ziehen bewegt das Blatt
und rastet beim Loslassen an der nächstgelegenen Stufe ein; ein Tap schaltet
eine Stufe weiter. Ohne Ziehen war die Bedienung ein Rätsel — genau daran ist
der zweite Stand gescheitert.

**Stumpf ist die Karte nur im Vollbild.** Dort sind 92 px Karte übrig — ein Tap
darauf kann nur heißen „gib mir die Karte zurück"; er zieht das Blatt eine Stufe
zu und setzt **nichts**. Erst der nächste Tap setzt wieder einen Wegpunkt.

Die einfachere Regel „jede geöffnete Raste zieht zu" war am 19.08.2026 kurz
gebaut und ist wieder raus: Die halbe Raste ist dafür da, auf der Karte zu
arbeiten und gleichzeitig das Profil zu sehen. Ein Tap, der sie zuzieht,
zerstörte sie bei der ersten Benutzung. Der Preis ist, dass die Regel zwei Fälle
kennt — dafür widerspricht keiner davon dem Zweck seiner Raste.

**Gefundener Fehler, der hierher gehört:** Die auf 44 px vergrößerte
Trefferfläche des Griffs lag über der Reiterzeile. Ein Tap auf „A" traf damit
den Griff und schaltete eine Raste weiter, statt die Route zu wechseln — es sah
aus, als spränge die Auswahl ins Vollbild. Die Fläche wächst jetzt nach **oben**
über den Blattrand hinaus statt nach unten ins Blatt hinein. Merksatz für alle
weiteren unsichtbaren Trefferflächen: Sie dürfen nur über toten Raum wachsen,
nie über Bedienelemente.

**Für die Übernahme in die App zu beachten:** Die Zuordnung Profilstelle →
Kartenpunkt läuft im Entwurf über den Index der ausgedünnten Geometrie. In der
App muss sie über die aufsummierte Distanz gehen, sonst läuft der Punkt bei
ungleichen Punktabständen aus dem Tritt.

---

## P11-alt — der ursprüngliche Befund (bleibt als Begründung stehen)

**Der Befund vom 19.08.2026: Die mittlere Raste ist kein Zustand, sondern ein
Fehler.** Sie zeigt Kennzahlen und Bedienung wie die kleine, dazu ein
angeschnittenes Stück Analyse — und lässt sich durch einen Tap auf die Karte
nicht schließen. Beides trat im Entwurf und in der gebauten App auf.

Der zweite Teil ist eigenständig falsch: Ein Tap auf die Karte ist ein Tap auf
die unterste Ebene. Was darüber liegt, muss sich dabei schließen.

**Woher der überflüssige Zustand kommt.** Die `CLAUDE.md` beschreibt drei
Rasten: *nur Kennzahlen · plus Bedienung · plus Analyse*. Gebaut wurde etwas
anderes — schon die kleinste Raste zeigt Kennzahlen **und** Bedienung. Damit hat
die mittlere ihren Inhalt verloren und zeigt seither dasselbe wie die kleine,
nur höher. Der Fehler steckt also nicht im Verhalten, sondern in einer Raste,
die nichts mehr zu zeigen hat.

**Folge, falls der Vorschlag unten angenommen wird:** Die Zeile „unten ein Blatt
mit drei Rasten" in der `CLAUDE.md` muss geändert werden. Bis dahin steht dort
absichtlich noch die alte Fassung — sie ist das Verbindliche und wird nicht
nebenbei umgeschrieben.

### Vorschlag: zwei Rasten und drei Regeln

| Zustand | Inhalt |
|---|---|
| **leer** (keine Route berechnet) | eine schmale Leiste: *Route berechnen* und ein Satz, was zu tun ist |
| **klein** | Reiterzeile, Kennzahlen der ausgewählten Route, Bedienknöpfe |
| **voll** | zusätzlich die Analyse |

1. Nach jeder erfolgreichen Berechnung geht das Blatt auf **voll** — das
   Ergebnis ist der Grund, warum man den Knopf gedrückt hat.
2. Der Griff schaltet zwischen **klein** und **voll**. Mehr Zustände gibt es
   nicht.
3. Ein Tap auf die Karte bringt das Blatt auf **klein** zurück — und setzt bei
   diesem einen Tap **nichts**. Erst der nächste Tap setzt wieder einen
   Wegpunkt. Sonst zieht man das Blatt zu und hat nebenbei einen Punkt gesetzt,
   den man nicht wollte.

**Was daran noch zu klären ist:** Ob „leer" ein eigener Zustand ist oder nur die
kleine Raste mit leeren Feldern. Für einen eigenen Zustand spricht, dass der
klobige Knopf im Nichts der erste Eindruck der App ist; dagegen, dass es eine
vierte Höhe zu erklären gibt.

---

## P12 — Bleiben die Werkzeuge stehen oder wandern sie mit? · entschieden 19.08.2026

**Ergebnis: Sie wandern mit, aber nur zwischen den Rasten.** Beim Wechsel von
*leer* auf *klein* rücken Werkzeugleiste, Zoom und die Nennung ein Stück nach
oben; im Vollbild verschwinden sie, weil in 92 px Restkarte kein Platz für sie
ist und sie sonst an die Profilpille stoßen.

Damit bewegt sich pro Bedienschritt höchstens einmal etwas — nicht stufenlos
mit jedem Pixel, den das Blatt zurücklegt. Die Begründung dagegen bleibt
trotzdem gültig und wird im Gebrauch geprüft: Ein Werkzeug, das seinen Platz
wechselt, muss jedes Mal neu gesucht werden.

---

## P12-alt — die Abwägung dazu (bleibt als Begründung stehen)

Heute wandern Werkzeugleiste, Zoom und die Nennung der Datenquellen mit der
Oberkante des Blattes nach oben und unten. Das wirkt sauber, solange sich das
Blatt selten bewegt.

**Dagegen spricht:** Ein Werkzeug, das seinen Platz wechselt, muss jedes Mal neu
gesucht werden. Auf jeder Karten-App, die man kennt, stehen Zoom und
Standortknopf fest.

**Dafür spricht:** Bleiben sie stehen, verschwinden sie hinter dem Blatt, sobald
es aufgeht — oder sie müssen so weit oben sitzen, dass sie ständig Karte
verdecken.

Ein Mittelweg wäre, sie nur zwischen **klein** und **voll** umzusetzen (also
höchstens einmal je Bedienschritt) statt jeder Bewegung stufenlos zu folgen.
Entscheidung offen; hängt an P11.

---

## P13 — Bleibt die Hinweiszeile im leeren Blatt? · offen

Im Entwurf vom 19.08.2026 **entfernt**, aber die Entscheidung steht noch aus.
Gemeint ist die Zeile, die im leeren Blatt über dem Knopf stand:

> `Tippe auf die Karte, um den Start zu setzen.`
> `1 Punkt — mindestens ein zweiter wird gebraucht.`
> `4 Punkte, 1 Sperrbereich — bereit zum Berechnen.`

**Für das Entfernen (aktueller Stand des Entwurfs):** Der erste Eindruck der App
ist dann eine Karte mit einem Knopf am unteren Rand statt einer halbleeren
Fläche. Und die Zeile sagt größtenteils, was man ohnehin sieht — die Punkte
liegen auf der Karte.

**Für das Behalten:** Sie ist der einzige Ort, an dem der Zustand **stehen
bleibt**. Eine Einblendung ist nach drei Sekunden weg; wer das Telefon
zwischendurch weglegt, hat keine Rückmeldung mehr, warum der Knopf grau ist.

**Was dagegen spricht, sich zu sorgen:** Rückmeldung gibt es an vielen Stellen —
die Einblendung nach jeder Aktion, die Farbe des Knopfes, die Punkte auf der
Karte, ab der ersten Berechnung die Kennzahlen. Es ist eher viel als wenig.

**Ein möglicher Mittelweg:** Die Zeile nur dann zeigen, wenn sie etwas sagt, das
man nicht sieht — also bei „noch ein zweiter Punkt fehlt", nicht bei „bereit zum
Berechnen". Dann steht sie nur im Ausnahmefall da und der leere Zustand bleibt
schmal.

Zusammen mit P11: Das Blatt wächst mit dem, was es zu zeigen hat — vom Knopf
über die Kennzahlen bis zur vollen Analyse. Diese Frage entscheidet nur, wo das
Wachstum anfängt.

---

## P14 — Die Prozentzahlen stammen aus zu wenigen Strecken · offen

In der App stehen an mehreren Stellen Zahlen aus Messungen: „Hauptstraßenanteil
42,5 % bei 1,0", „`smoothness` fehlt auf rund 70 % der Strecke", „Tempo ≥ 70 von
23,7 % auf 8,7 %".

**Das ist gut so und soll bleiben** — eine Zahl mit Datum ist besser als ein
Gefühl, und der Nutzer kann einschätzen, ob eine Einstellung ihm etwas bringt.

**Aber:** Diese Werte stammen jeweils aus einer Handvoll Strecken in
Niedersachsen und im Harz, teilweise aus einer einzigen. Sie sind eine
Größenordnung, keine Zusage. Wie sehr das trügen kann, hat Test 8 gezeigt: Auf
43 km sah der Befund genau umgekehrt aus wie auf 156 km.

**Was zu tun wäre:** Dieselben Fragen auf fünf bis zehn Strecken in
verschiedenen Gegenden messen — Flachland, Mittelgebirge, Stadtnähe, Grenzlagen
— und aus den Einzelwerten Spannen machen („zwischen 20 und 40 %"). Das Werkzeug
dafür liegt in `messungen/`; es fehlt nur die Zeit an der Leitung.

**Was das nicht werden soll:** Wissenschaft. Es geht um eine ehrliche
Einschätzung für einen einzelnen Nutzer, nicht um Veröffentlichungsreife. Eine
Spanne aus acht Strecken reicht völlig.

**Bis dahin:** Die Zahlen bleiben stehen, tragen aber ihr Datum. In
`messungen/ERKENNTNISSE.md` steht ausdrücklich dabei, worauf sie beruhen.

---

## P15 — Routen bearbeiten: was passiert mit dem Stapel? · teilweise gelöst

**Gelöst am 19.08.2026:** Wer eine Route auswählt, bekommt jetzt auch ihr Profil
in die Pille oben links. Vorher zeigte die Pille etwas anderes an als die
ausgewählte Route unten — und die nächste Berechnung lief mit einem Profil, das
man gar nicht gewählt hatte. Existiert das Profil nicht mehr, entstehen aus den
in der Route gespeicherten Werten wieder übernommene Werte.

**Offen bleibt der Fall, den du beschrieben hast:** Ich habe die Routen A bis D
und möchte *eine davon* bearbeiten — also ihre Wegpunkte verschieben, ohne die
anderen zu verlieren. Heute wirft jede Änderung an den Wegpunkten den **ganzen**
Stapel weg, weil keine der Routen mehr zur Frage passt.

Drei denkbare Wege:

| Weg | Was er bedeutet |
|---|---|
| **So lassen** | Der Stapel beantwortet die Frage „welches Profil für diese Punkte". Ändern sich die Punkte, ist es eine neue Frage |
| **Wegpunkte je Route** | Jede Route bekommt ihre eigenen Punkte. Mächtig, aber die Karte zeigt dann Punkte, die zu einer nicht ausgewählten Route gehören |
| **Nachrechnen statt verwerfen** | Beim Ändern eines Punktes alle Routen neu rechnen. Ehrlich, aber bei vier Routen sind das vier Anfragen auf einen Schlag — an gespendete Infrastruktur |

**Meine Neigung: so lassen, aber die Quittung ernst nehmen.** Sie sagt jetzt,
wie viele Routen verworfen werden. Wer viel verglichen hat, sieht also, was ihn
eine Punktverschiebung kostet, bevor er sie bereut — und kann vorher speichern.

Zu entscheiden, sobald sich im Gebrauch zeigt, ob der Fall überhaupt vorkommt.

---

## P16 — Farbschema: reicht die Systemeinstellung? · vermutlich ja

**Zur Klarstellung, weil es leicht zu verwechseln ist:** Die App richtet sich
**nicht** nach der Tageszeit. Sie folgt `prefers-color-scheme` — also genau der
Einstellung, die im Gerät steht. Wer sein iPhone dauerhaft auf Dunkel gestellt
hat, bekommt die App dauerhaft dunkel; wer den automatischen Wechsel nach
Sonnenuntergang eingestellt hat, bekommt ihn auch hier.

Damit tut die App bereits das, was man von ihr erwarten würde, und braucht dafür
keine eigene Logik.

**Offen bleibt nur:** Ob es zusätzlich eine **manuelle** Umschaltung im Menü
geben soll — für den Fall, dass man am hellen Tag im Wald doch lieber dunkel
liest oder umgekehrt. Dagegen spricht, dass jede Einstellung, die es im System
schon gibt, in der App eine zweite Wahrheit schafft. Dafür spricht, dass die
Karte selbst hell bleibt und der Kontrast zum dunklen Blatt Geschmackssache ist.

---

## P17 — Das App-Icon · neu gezeichnet am 19.08.2026

Das erste Icon (petrolblauer Grund, hellblaue Zickzacklinie, Pastellpunkte)
stammte aus der ersten Runde und teilte mit der App **keine einzige Farbe**.

**Am Icon wird nichts gezeichnet — nur eine Farbe getauscht.** Drei Anläufe
waren nötig, um dahin zu kommen:

1. Alles neu gezeichnet: geschwungene Route, App-Palette. Der Zickzack ist auf
   60 px Kantenlänge besser zu erkennen — zurückgenommen.
2. Form zurück, aber weiter mit der App-Palette. Auch zu viel: Ein Icon muss
   nicht dieselben Farben tragen wie die Oberfläche.
3. Zickzack nachgezeichnet, Originalfarben. Immer noch falsch — die
   **Nachzeichnung traf den Verlauf nicht**, und der des Originals war besser.

**Die Lehre:** Wo eine Vorlage schon gut ist, wird sie nicht nachgebaut, sondern
bearbeitet. `werkzeuge/icon.py` arbeitet deshalb pixelweise auf der
Originaldatei (`werkzeuge/icon-original-*.png`, aus der Git-Historie geholt) und
ersetzt genau eine Farbe: Die Linie war `#7DD3FC` und ist jetzt `#FF6B33`. Blau
kommt in der App nirgends vor, Orange ist ihre Signalfarbe — und die Linie im
Icon ist dieselbe Route wie die auf der Karte. Verlauf, Kantenglättung und der
weiche Schein bleiben unangetastet.

Der Kniff dabei: Ein Pixel am Rand der Linie ist eine Mischung aus Blau und dem,
was daneben liegt. Für jedes Pixel wird geprüft, ob es sich als „Blau plus X"
erklären lässt; wenn ja, wird der Blauanteil durch Orange ersetzt und der
Mischungsgrad beibehalten. Sonst bliebe ein blauer Saum um die Punkte stehen.

Drei Dateien: die beiden ausgelieferten Icons vollflächig quadratisch (iOS
maskiert selbst — eigene runde Ecken gäben einen doppelten Rand), dazu
`doku/bilder/icon-rund.png` mit runden Ecken und Transparenz für die Startseite.

**Offen:** Ob GitHub das Icon als Social-Preview bekommen soll. Das lässt sich
nur über die Weboberfläche einstellen (Settings → Social preview), nicht über
die API.

---

## P18 — Der Dateiname beim Teilen sagt zu wenig · entschieden 19.08.2026

Geteilt wird als `2026-08-19_Route.gpx`. Wer drei Strecken hintereinander in die
Dateien-App legt, hat dort `Route.gpx`, `Route-2.gpx`, `Route-3.gpx` liegen und
muss jede öffnen, um zu wissen, welche welche ist. Das Datum allein trennt sie
nicht einmal, wenn sie am selben Tag entstanden sind.

**Was zur Verfügung steht,** ohne einen zweiten Dienst zu bemühen:

| Angabe | Beispiel | woher |
|---|---|---|
| Tourname | `Okertal-Runde` | nur bei einer **gespeicherten** Tour |
| Distanz | `43km` | immer |
| Profil | `fastbike-lowtraffic` | immer |
| Reiter | `A`, `B` | nur bei mehreren Routen im Stapel |
| Höhenmeter | `965hm` | immer |

**Der Haken:** Der aussagekräftigste Teil — der Name — existiert genau dann
nicht, wenn man ihn am nötigsten braucht, nämlich bei einer frisch gerechneten
Route, die noch nicht gespeichert ist. Ortsnamen (`Goslar-BadHarzburg`) wären
das Naheliegende, brauchen aber umgekehrte Geokodierung; das ist dieselbe
Entscheidung wie bei P2 und den Tourennamen, siehe `CLAUDE.md`.

**Zu entscheiden:** Aus welchen Teilen der Name zusammengesetzt wird, in welcher
Reihenfolge, und was passiert, wenn der Tourname Zeichen enthält, die in einem
Dateinamen nichts zu suchen haben. Ein Vorschlag zum Draufschauen:
`2026-08-19_Okertal-Runde_43km.gpx` — und ohne Tourname
`2026-08-19_43km_fastbike-lowtraffic.gpx`.

**Aufgefallen:** 19.08.2026, beim Umbau auf lokal erzeugte GPX-Dateien.

### Entschieden: Datum, Kennung, Distanz

```
2026-08-19_Okertal-Runde_43.5km.gpx        eine gespeicherte Tour
2026-08-19_fastbike-lowtraffic_43.5km.gpx  eine frisch gerechnete Route
```

**Datum zuerst**, damit die Liste in der Dateien-App chronologisch fällt.
**In der Mitte das Aussagekräftigste**, was ohne einen zweiten Dienst zu haben
ist: der Tourname, sonst der Profilname — denn genau darin unterscheiden sich
die Routen eines Stapels. **Hinten die Distanz**, mit einer Nachkommastelle;
sie hält zwei Varianten derselben Frage auseinander, die sonst gleich hießen.

**Der Reiterbuchstabe kommt nicht vor.** „A" bedeutet in der Dateien-App eine
Woche später nichts mehr — er ordnet innerhalb einer Sitzung, nicht außerhalb.

**Zwei Fälle brauchten eine Extrawurst**, beide beim Ausprobieren aufgefallen:

1. **Der vorgeschlagene Tourname ist selbst Datum plus Distanz**
   („19.08.2026 · 43,5 km"). Wer ihn stehen lässt, bekäme beides doppelt:
   `2026-08-19_19-08-2026-43-5-km_43.5km.gpx`. Ein Name ohne ein einziges Wort
   sagt nichts, was der Rest nicht schon sagt — geprüft wird auf eine
   Buchstabenfolge von mindestens drei Zeichen, sonst tritt der Profilname an
   seine Stelle.
2. **Lange Namen** werden bei 40 Zeichen am letzten Bindestrich gekappt, nicht
   mitten im Wort.

**Umlaute bleiben stehen.** Auf iOS sind sie in Dateinamen unbedenklich, und
„Hoehenrunde" statt „Höhenrunde" wäre eine Verschlimmbesserung. Alles andere,
was kein Buchstabe und keine Ziffer ist, wird zum Bindestrich.

**Ortsnamen bleiben außen vor** („Goslar-BadHarzburg"). Sie bräuchten umgekehrte
Geokodierung — dieselbe eine Entscheidung wie bei P2 und der Ortssuche, siehe
`CLAUDE.md`. Fällt sie irgendwann, ist der Dateiname eine der Stellen, die
davon profitieren.

---

## P19 — Die volle Raste liegt unter der Dynamic Island · behoben 19.08.2026

**Am iPhone gemessen:** Aus der vollen Raste kommt man nicht mehr heraus. Der
Griff sitzt dort ganz oben — und genau dort sitzt auch die Dynamic Island. Der
Tap geht ans System, nicht an die App. Die volle Raste ist damit eine
Sackgasse: Ziehen greift nicht, Tippen greift nicht.

Das trifft nur die volle Raste. Klein und halb liegen tief genug.

**Warum die Notlösung „einfach die Karte antippen" hier nicht rettet:** Sie
existiert zwar — in der vollen Raste zieht ein Tap auf die verbleibenden 92 px
Karte das Blatt eine Stufe zu (siehe `CLAUDE.md`). Aber 92 px sind wenig, und
sie stehen ganz oben am Rand, also wiederum in der Nähe der Insel. Als
**einziger** Ausweg ist das zu wenig; es war als Abkürzung gedacht, nicht als
Notausgang.

**Mögliche Wege, alle noch nicht abgewogen:**

1. **Die volle Raste endet tiefer.** Ein Abstand nach oben, der die Insel frei
   lässt. Kostet Inhalt genau dort, wo die Analyse ohnehin knapp ist — und die
   Höhe wird gemessen, nicht gesetzt (`CLAUDE.md`), das Maß müsste also an der
   Messung ansetzen, nicht an einem Prozentwert.
2. **Der Griff wandert.** Nicht oben mittig, sondern tiefer oder an eine Seite.
   Bricht mit dem Muster, das in den anderen Rasten funktioniert.
3. **Ein zweiter Ausweg.** Ein Schließen-Knopf im Blatt selbst, unabhängig vom
   Griff. Doppelte Bedienung für dieselbe Sache.
4. **Die volle Raste fällt weg.** Wenn die Analyse in die halbe passt, wird das
   Problem gegenstandslos. Größter Eingriff, aber vielleicht der ehrlichste.

**Aufgefallen:** 19.08.2026, am Gerät.

### Nachgesehen — es war keine Abwägung, sondern eine fehlende Zeile

Die volle Raste rechnete sich als `H - 44`, mit `H` als voller Fensterhöhe.
Die Seite läuft mit `viewport-fit=cover`; `H` beginnt also am **obersten
Bildschirmpunkt**, nicht unterhalb der Statusleiste. Der 44-px-Streifen lag
damit vollständig im Bereich des Systems, und die Trefferfläche des Griffs
(`#grab::before` reicht 14 px höher) begann bei y = 30 — mitten in der Insel,
die etwa von y = 11 bis y = 50 reicht.

Der Wert stammt aus `c28a030`; davor waren es 92 px, und damit lag der Griff
knapp unterhalb der Insel. Deshalb ist der Fehler erst mit dieser Verkleinerung
entstanden und nicht früher aufgefallen.

**Weg 1 war also nicht nur der billigste, sondern der einzig richtige** — die
anderen drei hätten ein Rechenversehen zur Gestaltungsfrage gemacht:

```js
const voll = H - 44 - safeTop();
```

`env(safe-area-inset-top)` ist in JavaScript nicht auszulesen. Gemessen wird es
über einen unsichtbaren Klotz genau dieser Höhe (`visibility:hidden`, nicht
`display:none` — sonst gäbe es nichts zu messen).

**Gegengerechnet** bei simulierten 59 px Inset: Streifen 103 px statt 44, die
Trefferfläche beginnt bei y = 89 statt y = 30. Ohne Insel ist der Zuschlag null,
dort ändert sich kein Pixel.

**Am Gerät noch zu bestätigen.** Die Insel lässt sich am Schreibtisch nur
nachstellen, nicht nachbauen.

**Als Regel übernommen** in die `CLAUDE.md`: Was am oberen Rand angefasst werden
muss, wird gegen `safe-area-inset-top` gerechnet, nicht gegen die Fensterhöhe.

---

## P20 — `persist()` schreibt jedes Mal alles · offen, noch nicht gemessen

`persist()` (`app.js`) legt den **gesamten** Speicher in einem Zug ab:

```js
localStorage.setItem(STORE_KEY, JSON.stringify(store));
```

Ein Aufruf kostet also immer den vollen Umfang — Touren, Profile,
Einstellungen —, auch wenn sich nur eine Kleinigkeit geändert hat. Und
aufgerufen wird nicht selten: bei jeder Berechnung, bei jeder Profilwahl, bei
jedem Wechsel der ausgewählten Route.

**Warum das erst jetzt zählt.** Bis zum 19.08.2026 wog eine Tour rund 900 Byte;
hundert davon waren 90 KB, und das fällt nirgends auf. Seit die Tour ihre
Geometrie mitträgt, sind es rund 8 KB — hundert Touren also **etwa 800 KB, bei
jedem Speichern neu serialisiert und synchron geschrieben**. `localStorage`
blockiert dabei den Hauptthread.

**Nicht gemessen ist, ab wann das spürbar wird.** Die Zahl oben ist gerechnet,
nicht gestoppt — und ausgerechnet auf dem Zielgerät (Safari auf dem iPhone) ist
sie am wenigsten zu erraten. Vor jeder Entscheidung gehört deshalb eine
Messung dazwischen: Speicher künstlich mit 25, 50, 100 Touren füllen und die
Dauer eines `persist()` am Gerät stoppen. Solange die im einstelligen
Millisekundenbereich liegt, ist hier nichts zu tun.

**Wege, falls doch:**

1. **Je Tour ein Schlüssel.** `bikeRouteriOS.tour.<id>` statt eines Blocks.
   Speichern kostet dann nur die geänderte Tour. Dafür wird das Laden zu einer
   Schleife über alle Schlüssel, und die Sicherung muss sie einsammeln.
2. **Nur schreiben, was sich geändert hat.** Setzt voraus, dass die App weiß,
   was das ist — heute weiß sie es nicht, und es zu wissen heißt, an jeder
   Änderungsstelle daran zu denken. Fehleranfällig.
3. **Gebündelt schreiben.** Mehrere Änderungen kurz hintereinander ergeben
   einen Schreibvorgang statt fünf. Billig zu bauen, hilft aber nur gegen die
   Häufigkeit, nicht gegen die Größe des einzelnen Schreibvorgangs.
4. **IndexedDB statt `localStorage`.** Asynchron, blockiert nichts, für große
   Datenmengen gedacht. Der größte Eingriff — und iOS räumt auch IndexedDB weg,
   die Sicherung als Datei bliebe also genauso nötig.

**Zusammenhang:** Die Geometrie zu speichern war trotzdem richtig (`CLAUDE.md`,
„Eine Tour speichert die Route selbst"). Hier geht es nicht darum, ob sie
gespeichert wird, sondern **wie oft sie dabei durch die Serialisierung läuft**.

**Aufgefallen:** 19.08.2026, beim Umbau — als Folge davon, nicht als Fehler
darin.

---

## P21 — Die Differenzzeile bricht um · offen, Vorschlag steht

**Beobachtet am 19.08.2026** (`IMG_4723_varA_kopf62_unten893.PNG`): Der
Vergleich zweier Routen steht heute in zwei Zeilen —

```
gegenüber A  +1,7 km  +39 hm  +6 min
Tempo 70+: 0,3 % statt 2,2 %
```

— und mit dreistelligen Differenzen werden daraus drei. Gefordert ist eine
Lösung, die **einzeilig bleibt, ohne Information zu kürzen**.

**Der Vorschlag: die Wiederholung streichen, nicht den Inhalt.** Die Einheiten
stehen schon in den Kennzahlen darüber. Also die Differenzen spaltenweise
darunter, in derselben Aufteilung:

```
60,1 km  |  125 hm  |  2:46 h
  +1,7   |   +39    |   +6 min        gegenüber A
```

Damit wächst die Zeile nur noch mit den Ziffern und nicht mehr mit den
Wörtern — bei dreistelligen Differenzen kann sie nicht umbrechen.

**Was daran offen ist: `Tempo 70+`.** Im ersten Entwurf sollte der Wert in die
Analyse wandern, weil er keine Kennzahl der Route ist und in der Spaltenform
keinen Platz hat. Dagegen spricht, dass er die einzige Zahl in der App ist, die
etwas über den **Verkehr** sagt — und genau darum geht es dem Nutzer
(`CLAUDE.md`, Zielnutzer: „Asphaltqualität und wenig Autoverkehr"). Viele
fahren ungern auf Bundesstraßen, und der Unterschied zwischen 0,3 % und 2,2 %
ist beim Vergleich zweier Routen die interessanteste Zahl von allen.

**Zugleich ist die Aussage unvollständig:** Tempolimit ist nicht
Verkehrsdichte. Eine Landstraße mit Tempo 70 und zehn Autos am Tag ist etwas
anderes als eine mit Tempo 70 und tausend. Was dazu in den Kartendaten
überhaupt steht, ist ungeprüft — `BROUTER.md` kennt bisher nur `maxspeed` und
die Straßenart.

**Damit drei Fragen, in dieser Reihenfolge:**

1. Gibt es in OSM ein Feld, das Verkehrsdichte annähert und flächendeckend
   genug erfasst ist, um es zu zeigen? (Zu messen wie in `messungen/` — nicht
   zu diskutieren.)
2. Falls ja: Dann gehören Tempolimit **und** Dichte in die Analyse, als eigene
   Karte, und die Differenzzeile wird frei für die drei Kennzahlen.
3. Falls nein: Dann bleibt `Tempo 70+` die beste vorhandene Näherung — und
   muss in der Differenzzeile bleiben. Dann wäre die Spaltenform nur die halbe
   Lösung, und die zweite Zeile bräuchte ihre eigene knappe Form.

**Nicht gebaut**, weil es die Reihenfolge aus dem Entwurf umstellt
(`CLAUDE.md`: „Der Vergleich steht als Differenz unter den Kennzahlen") und an
Frage 1 hängt.

**Zum Ansehen: `doku/entwurf-vergleich-2026-08-20.html`.** Drei Formen
nebeneinander, mit den Farben und Maßen der App, hell und dunkel umschaltbar:

| Entwurf | Idee | was er kostet |
|---|---|---|
| 1 · Differenz in Spalten | jede Differenz unter ihrer Kennzahl, Einheiten entfallen | Tempo 70+ bleibt eine eigene Zeile |
| 2 · Verkehr als vierte Kennzahl | Tempo 70+ rückt nach oben, gleiche Form wie die anderen | die vierte Spalte ist ohne Erklärung nicht zu deuten |
| 3 · Mit Spaltenköpfen | kleine Köpfe über den Werten, Einheiten wandern dorthin | eine Zeile mehr Höhe |

Jeder Entwurf zeigt zusätzlich die Grenzfälle: dreistellige Differenzen, eine
kürzere Route (negative Werte), viel Verkehr, und die erste Route ganz ohne
Vergleich. Am ersten Versuch von Entwurf 2 ist gleich sichtbar geworden, woran
diese Form hängt: Mit dem Etikett `T70+` direkt am Wert lief die Zeile über den
Blattrand.
