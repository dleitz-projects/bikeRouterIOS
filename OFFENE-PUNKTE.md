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
