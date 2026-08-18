# Offene Punkte

Entscheidungen, die **an bereits Gebautem hängen** und noch nicht gefallen sind.

Abgrenzung zu den Nachbardateien:

| Datei | Inhalt |
|---|---|
| `CLAUDE.md` | Was gilt |
| `BROUTER.md` | Was gemessen ist, plus offene **Tests** an der Engine |
| `IDEEN.md` | Was man **zusätzlich** bauen könnte |
| `OFFENE-PUNKTE.md` | Wie etwas heißen oder sich verhalten soll, das es schon gibt |

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

## P8 — Woher kommt der Profiltext für den Baukasten? · offen, blockiert

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