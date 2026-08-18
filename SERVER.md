# Der Routing-Server

Die ganze App hängt an einem fremden Server. Fällt der aus, ändert seine
Adresse, seine Grenzen oder seine Antworten, steht alles still — es gibt kein
Offline-Routing (siehe Nicht-Ziele in der `CLAUDE.md`). Deshalb sammelt diese
Datei alles, was über die Server bekannt **und gemessen** ist.

Abgrenzung zu den Nachbardateien:

| Datei | Inhalt |
|---|---|
| `BROUTER.md` | wie die Engine **rechnet** — Profilsprache, Tags, Kostenmodell |
| `PROFILE.md` | welche **Profile** es gibt und welche wir übernehmen |
| `SERVER.md` | wer die Server **betreibt**, was sie aushalten, wie sie scheitern |

---

## Wer ist wer

Drei Namen, die leicht zu verwechseln sind — sie gehören zu drei verschiedenen
Dingen, nicht zu drei Konkurrenten.

| Name | Was es ist | Wer |
|---|---|---|
| **BRouter** | die Engine selbst, Java, MIT-Lizenz, seit 2014 | Arndt Brenschede, `github.com/abrensch/brouter` |
| **brouter-web** | eine Weboberfläche für diese Engine | Norbert Renner, `github.com/nrenner/brouter-web` |
| **brouter.de** | die Seite des Engine-Autors, mit öffentlicher Instanz | Arndt Brenschede |
| **bikerouter.de** | eine **zweite öffentliche Instanz** mit eigener Oberfläche | Marcus Jaschen (c/o MTB News GmbH) |
| **brouter.m11n.de** | ältere Instanz desselben Betreibers | Marcus Jaschen |

**Es ist dieselbe Engine.** Gemessen am 19.08.2026: Beide Server beantworten
denselben Aufruf mit derselben Antwortstruktur und nennen sich im Feld `creator`
`BRouter-1.x`. bikerouter.de ist kein eigenes Routing-Verfahren, sondern eine
Instanz derselben Software mit **eigener Profilsammlung** und einer stark
ausgebauten Oberfläche.

**Das Verhältnis ist freundlich, nicht feindlich.** Die Startseite von
brouter.de verweist selbst auf „Marcus' site". Wer hier „der Originale" fragt:
Die Engine kommt von Brenschede, brouter.de ist seine Seite. bikerouter.de ist
die gepflegtere Oberfläche mit mehr Profilen und mehr Kartenquellen.

---

## Endpunkte

| Zweck | Adresse |
|---|---|
| Routing (unsere App) | `https://brouter.de/brouter?…` |
| Routing bei der zweiten Instanz | `https://bikerouter.de/brouter-engine/brouter?…` |
| Profiltexte der zweiten Instanz | `https://prod.bikerouter.de/profiles/<name>.brf` |
| Profilliste der zweiten Instanz | in `https://bikerouter.de/config.js`, Feld `BR.conf.profiles` |
| Profil hochladen | `POST https://brouter.de/brouter/profile` — siehe `BROUTER.md` |

`bikerouter.de/brouter` (ohne `-engine`) antwortet mit **404**. Das ist kein
Ausfall, sondern der falsche Pfad — eine Falle, die in der `CLAUDE.md` schon
einmal als „ist keine API" notiert war.

Ein Endpunkt, der die **Profilliste eines Servers** ausgibt, existiert nicht.
`https://brouter.de/brouter/profiles` antwortet 404. Welche Profile ein Server
kennt, lässt sich nur durch Ausprobieren feststellen — genau das steht in
`PROFILE.md`.

---

## Versionen — der Server ändert sich unter uns

| Datum | Server | `creator` in der Antwort |
|---|---|---|
| 14.08.2026 | brouter.de | `BRouter-1.7.9` |
| 19.08.2026 | brouter.de | **`BRouter-1.7.10`** |
| 19.08.2026 | bikerouter.de | `BRouter-1.7.9` |

Innerhalb von fünf Tagen hat sich die Version unter der laufenden App geändert,
ohne dass etwas aufgefallen wäre. Das ist der Normalfall bei fremder
Infrastruktur und der Grund, warum die Messungen in `BROUTER.md` und `PROFILE.md`
ein Datum tragen: Sie gelten für den Server von damals.

**Folge fürs Vertrauen in eigene Messungen:** Was einmal gemessen wurde, ist kein
Naturgesetz. Vor größeren Entscheidungen lieber nachmessen als glauben.

---

## CORS — beide Server erlauben fremde Herkunft

Gemessen am 19.08.2026 mit `Origin: https://example.github.io`:

| Server | `Access-Control-Allow-Origin` |
|---|---|
| brouter.de | `*` |
| bikerouter.de/brouter-engine | `*` |

Damit ist die zweite Instanz technisch ein **sofort einsetzbarer Ausweichweg**,
falls brouter.de ausfällt oder seine Header ändert. Details zur Abwägung unten
unter „Plan B".

---

## Wie der Server scheitert

Die vollständige Zuordnung Antwort → Bedeutung steht in der `CLAUDE.md`, weil
die App danach ihre Meldungen ausgibt. Hier steht, was dahintersteckt.

| Antwort | Bedeutung | gemessen |
|---|---|---|
| `400` + `no track found at pass=0` | Wegpunkt zu weit von einer erfassten Straße | 14.08.2026 |
| `400` + `datafile … not found` / `… not mapped in existing datafile` | Punkt außerhalb der abgedeckten Region | 14.08. / 18.08.2026 |
| `400` + `watchdog after N seconds`, N > 0 | Berechnung abgebrochen — **zu lange Strecke** | 14.08.2026 |
| `400` + `watchdog after 0 seconds` | gedrosselt, gar nicht gerechnet — zwei Anfragen überschnitten sich | 18.08.2026 |
| `403` + `Please, retry later!` | Mengenbegrenzung nach rund 30 Anfragen in kurzer Folge | 19.08.2026 |
| `500` + leerer Body | unbekannte Profil-ID **oder** ungültiger Parameterwert (`true`/`false` statt `1`/`0`) | 18.08.2026 |

Drei dieser sechs Fälle sind **Grenzen des Servers, nicht Fehler des Nutzers**.
Das ist der Grund, warum sie hier gesammelt stehen: Jede Meldung, die eine
Serverbremse als Nutzerfehler ausgibt, schickt jemanden auf eine sinnlose
Fehlersuche.

### Die Längengrenze ist der wichtigste offene Punkt

Beobachtet, aber **nicht ausgemessen**: Ab einer gewissen Streckenlänge bricht
der Server ab (`watchdog after N seconds`). Ab welcher Länge, hängt vermutlich
nicht nur an der Luftlinie, sondern auch an Profil, Gelände und Auslastung.

Solange die Grenze unbekannt ist, kann die App weder warnen noch sinnvoll
aufteilen. Ein Test dazu steht in `BROUTER.md`.

---

## Plan B, konkreter als bisher

Die `CLAUDE.md` nennt als Ausweg den selbstgehosteten Container. Nach der Messung
vom 19.08.2026 gibt es eine **Zwischenstufe**, die vorher nicht belegt war:

| Weg | Aufwand | Preis |
|---|---|---|
| **1. Zweite öffentliche Instanz** (bikerouter.de/brouter-engine) | eine geänderte Adresse | verlagert die Last nur auf den nächsten gespendeten Server; andere Profilsammlung; dort 1.7.9 statt 1.7.10 |
| **2. Eigener Container** | Docker, Segmentdateien, Betrieb | volle Kontrolle, keine fremde Last, kein Ausfall durch Dritte |

Weg 1 ist kein Ersatz für Weg 2, sondern ein **Notnagel für einen Abend**. Wer
ihn dauerhaft geht, hat das Problem nur verschoben.

Wichtig für Weg 1: Die Profilnamen sind **nicht** deckungsgleich. Ein Wechsel
der Adresse allein genügt nicht, wenn ein Profil auf dem anderen Server nicht
existiert — dann kommt `500` mit leerem Body. Siehe `PROFILE.md`.

---

## Offene Fragen

1. **Wo liegt die Längengrenze?** Siehe oben. Ohne Zahl keine Warnung.
2. **Wie hart ist die Mengenbegrenzung wirklich?** Gemessen wurde ein Fall:
   ~30 Anfragen mit 1,2 s Abstand. Unbekannt ist, ob sie pro Minute, pro Stunde
   oder gleitend zählt — und ob sie den Profil-Vergleich (mehrere Routen
   hintereinander) in der Praxis trifft.
3. **Verfallen hochgeladene Profile?** Läuft als Test in `BROUTER.md` seit dem
   18.08.2026.
4. **Sollte die App den Server anzeigen?** Wenn zwei Instanzen möglich sind, ist
   „mit welchem Server wurde das gerechnet" eine Angabe, die zu einer
   gespeicherten Tour gehören könnte.
