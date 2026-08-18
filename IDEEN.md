# Ideen

Sammelstelle für alles, was noch nicht entschieden ist. Bewusst getrennt von der
`CLAUDE.md`: dort steht, was gilt — hier steht, worüber man reden kann.

Eine Idee darf hier unfertig, halbgar oder am Ende verworfen sein. Verworfenes
wird **nicht gelöscht**, sondern auf `verworfen` gesetzt und behält seine
Begründung. Sonst kommt dieselbe Idee in einem halben Jahr wieder und niemand
weiß mehr, warum sie damals durchgefallen ist.

Belege und Messungen gehören nicht hierher, sondern in die `BROUTER.md`.
Hier steht nur, was eine Idee daraus macht.

**Status:** `offen` · `in Arbeit` · `umgesetzt` · `verworfen`

---

## Idee 1 — Tempolimit als eigene Kostendimension

**Status:** offen, aber messtechnisch belegt · **Aufwand:** mittel

Ausgelöst durch die Beobachtung, dass Beschaffenheits- und Verkehrsdaten auf
weiten Teilen der Strecke keinen Einfluss zu haben scheinen.

Die Prüfung drehte die Frage um: Es gibt kein Datenloch, sondern eine
Gewichtungslücke. `maxspeed` liegt auf gut der Hälfte der Strecke vor und wird
von den mitgelieferten Profilen mit null gewichtet — obwohl eine
Tempo-100-Straße für einen Rennradfahrer spürbar unangenehmer ist als eine
Tempo-50-Straße, selbst bei gleicher Verkehrsklasse.

Der Testlauf (Test 2 in `BROUTER.md`) zeigt: Der Anteil schneller Straßen fällt
um fast zwei Drittel, der Mehrweg liegt bei rund 10 %.

**Offene Frage:** Wird daraus ein Regler im Profil-Editor („Schnellstraßen
meiden"), oder gleich ein eigenes mitgeliefertes Profil?

**Haken:** Braucht den Upload-Weg, nicht den Parameterweg — es ist eine neue
Regel, kein geänderter Wert. Damit hängt die Idee an Test 5 (Lebensdauer
hochgeladener Profile).

---

## Idee 2 — Anmeldung und Gerätesynchronisierung

**Status:** offen, Architekturentscheidung · **Aufwand:** groß (~1,5 Tage plus Einrichtung)

Profile, Einstellungen und das Tourenarchiv sind nutzerabhängig und sollten eine
neue Sitzung überleben — auch auf einem zweiten Gerät. Heute liegt alles im
`localStorage`, den iOS jederzeit wegräumen darf.

Der Weg, der ohne eigenen Server auskommt: Anmeldung über Google direkt im
Browser (nur Client-ID, **kein** Client-Secret — deshalb auf rein statischem
Hosting möglich), Daten in einem versteckten, app-eigenen Ordner im Google Drive
des Nutzers.

**Warum das die Nicht-Ziele nicht bricht:** In der `CLAUDE.md` steht „keine
Server-seitige Datenhaltung". Die gibt es weiterhin nicht — wir betreiben nichts,
halten nichts, verwahren nichts. Die Daten liegen beim Nutzer. Nur der Buchstabe
„kein Login" fiele. Der Sinn des Nicht-Ziels bleibt gewahrt.

**Bekannte Haken:**

- Einmalige Handarbeit: Google-Cloud-Projekt, Client-ID, Domain eintragen
- Der Drive-Zugriff gilt als sensibler Bereich. Ohne App-Verifizierung erscheint
  beim ersten Anmelden ein Warnbildschirm
- Zugriffstoken laufen nach etwa einer Stunde ab — gelegentlich ein Anmelde-Tap
- Der eigentliche Aufwand ist nicht der Login, sondern das **Zusammenführen zweier
  Stände**, wenn auf zwei Geräten unabhängig etwas geändert wurde
- Die App muss ohne Netz vollständig funktionieren; der Drive-Stand ist Abgleich,
  nicht Quelle

**Einordnung:** Der sauberste Weg, aber ein eigener Meilenstein — nach UI und
Profil-Editor, nicht davor.

---

## Idee 3 — Automatisches Sichern

**Status:** teils entschieden, teils offen · **Aufwand:** klein

Eine Sicherung, die nur auf Knopfdruck passiert, wird vergessen. Genau dann
räumt iOS den Speicher weg.

**Was nicht geht:** Ein Browser darf auf iOS keine Dateien unbemerkt schreiben —
die dafür nötige Schnittstelle fehlt in Safari. Jede Dateisicherung braucht
zwingend einen Tap. Die Idee, das an den Knopf „Route berechnen" zu hängen, geht
technisch, würde aber bei **jeder** Berechnung das Teilen-Menü aufreißen.

**Was geht und in jedem Fall gebaut werden sollte:**

1. `navigator.storage.persist()` anfordern — bittet Safari aktiv, den Speicher
   nicht wegzuräumen
2. Von `localStorage` auf **IndexedDB** wechseln: größeres Kontingent, robuster,
   wird bei Speicherdruck später verworfen
3. Gedrosselte Erinnerung: nur wenn sich seit der letzten Sicherung wirklich
   etwas geändert hat **und** sie länger als einige Tage her ist — dann ein
   sichtbarer Hinweis mit einem Tap, keine Überraschung

Wirklich unsichtbar wird es erst mit Idee 2.

---

## Idee 4 — Route auf der Karte nach Belag oder Straßenklasse einfärben

**Status:** offen · **Aufwand:** klein

Die Daten dafür liegen bereits in jeder Antwort (siehe `BROUTER.md`, Abschnitt
„Was in der Routenantwort steckt"). Statt einer einfarbigen Linie könnte die
Route abschnittsweise eingefärbt sein — Asphalt, wassergebundene Decke,
unbefestigt. Oder wahlweise nach Straßenklasse.

Damit sieht man auf einen Blick, **wo** die schlechten Abschnitte liegen, statt
nur zu wissen, dass es 12 % davon gibt.

**Offene Frage:** Umschaltbar oder fest? Und verträgt sich das mit der
Lesbarkeit der Karte auf einem kleinen Display?

---

## Idee 5 — Ersatzindikator für fehlende Asphaltqualität

**Status:** offen, Ausgang ungewiss · **Aufwand:** unklar

`smoothness` fehlt auf rund 70 % der Strecke, auf Landstraßen sogar auf 85 % —
und beschreibt ausgerechnet die wichtigste Priorität des Nutzers.

**Offene Frage:** Lässt sich daraus etwas bauen, oder wäre jeder Ersatzindikator
nur Raten mit mehr Schritten? Siehe Test 3 in `BROUTER.md`.

Ein Gedanke wäre, die Qualität nicht zu schätzen, sondern **selbst zu erfassen**:
befahrene Abschnitte manuell bewerten und diese Bewertung lokal in die Routenwahl
einfließen lassen. Das wäre allerdings ein deutlich größeres Vorhaben und
berührt das Nicht-Ziel „kein Aufzeichnen von Fahrten".

---

## Idee 6 — Umwelt-Schalter im Editor sichtbar machen

**Status:** offen · **Aufwand:** klein

`consider_forest`, `consider_noise`, `consider_river` und `consider_town` haben
laut Messung tatsächlich Datengrundlage — Waldnähe etwa auf 95 % der Strecke.
Sie sind bisher unsichtbar, weil sie nur in der Profildatei stehen.

Als verständlich benannte Schalter im Editor („Durch Wald und Parks führen",
„Ortschaften umfahren", „Lärm meiden") wären das vier Hebel ohne
Implementierungsaufwand — sie existieren bereits, man muss sie nur anbieten.

**Vorher klären:** Test 4 in `BROUTER.md` — was kosten sie an Umweg?
