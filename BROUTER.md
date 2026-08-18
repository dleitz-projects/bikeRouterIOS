# BRouter — Arbeitsweise und gemessene Erkenntnisse

Diese Datei beschreibt, **wie die Routing-Engine tatsächlich arbeitet** und was
davon nachgemessen ist. Sie ist bewusst von der `CLAUDE.md` getrennt: dort steht
Verbindliches, hier steht Wissen. Wissen darf sich ändern, wenn eine neue Messung
etwas anderes zeigt.

Regel für diese Datei: **Jede Aussage trägt ihren Beleg oder ihr Datum.**
Eine unbelegte Vermutung gehört in „Offene Tests", nicht in den Fließtext.

---

## Offene Tests

Hier stehen Fragen, die sich mit ein paar Server-Anfragen beantworten lassen.
Erledigte bleiben mit Ergebnis stehen — der Weg dahin ist beim nächsten Mal
mehr wert als das nackte Ergebnis.

### Test 1 — Ist die dünne Datenlage schuld oder die Gewichtung? ✔ erledigt 18.08.2026

*Ausgangsvermutung:* Beschaffenheits- und Verkehrsdaten fehlen auf großen Teilen
der Strecke und haben deshalb kaum Einfluss auf die Route.

*Ergebnis:* **Die Vermutung war falsch, aber sie hat auf etwas Richtiges gezeigt.**
Der Belag ist zu 99,4 % erfasst, die Verkehrsschätzung liegt auf 100 % aller
Straßen, auf denen überhaupt Autos fahren. Es gibt kein Datenloch. Das Loch
sitzt in der **Gewichtung**: `maxspeed` liegt auf 51,2 % der Strecke vor und wird
von `fastbike.brf` mit null gewichtet. Details unter „Was im Datensatz liegt".

### Test 2 — Bringt `maxspeed` als eigene Kostendimension etwas? ✔ erledigt 18.08.2026

*Aufbau:* `fastbike.brf` um einen `speedpenalty` erweitert, der Tempo 70/80/90
und 100+ gestaffelt bestraft, gesteuert über einen neuen Parameter
`consider_speed`. Vier Strecken in Niedersachsen/Harz, zusammen 187,6 km.

*Kontrolle:* Mit `consider_speed=0` liefert das Testprofil auf allen vier
Strecken exakt die Referenzwerte. Der Eingriff ist also nachweislich neutral —
ohne diese Kontrolle wäre das Ergebnis wertlos.

| Variante | Strecke | Tempo ≥ 70 | Hauptstraßen |
|---|---|---|---|
| `fastbike-lowtraffic` (Referenz) | 187,6 km | 23,7 % | 30,7 % |
| `consider_speed = 0` (Kontrolle) | 187,6 km | 23,7 % | 30,7 % |
| `consider_speed = 1.0` | 206,1 km | 8,7 % | 24,6 % |
| `consider_speed = 2.5` | 211,2 km | 5,7 % | 23,3 % |

*Ergebnis:* **Deutlicher Effekt.** Der Anteil schneller Straßen fällt um fast
zwei Drittel, der Mehrweg beträgt rund 10 %. Wo keine schnellen Straßen liegen
(Hannover–Hildesheim), ändert sich nichts — der Eingriff schadet nicht, wo er
nicht greift.

*Einordnung:* Für einen Nutzer, dem wenig Autoverkehr wichtiger ist als
Streckenlänge, ist das ein sehr guter Tausch. Der Hebel existiert in keinem der
mitgelieferten Profile.

### Test 3 — Lässt sich fehlende `smoothness` sinnvoll ersetzen? offen

`smoothness` beschreibt die Asphaltqualität und fehlt auf rund 70 % der Strecke,
auf `secondary` sogar auf 85 %. Genau dieses Feld entspricht der wichtigsten
Priorität des Nutzers. Offen ist, ob sich aus Straßenklasse, Baulastträger oder
`tracktype` ein brauchbarer Ersatzindikator bauen lässt — oder ob das nur
Rateraten mit mehr Schritten wäre.

### Test 4 — Was kosten die Umwelt-Schalter wirklich? offen

`consider_forest`, `consider_noise`, `consider_river` und `consider_town` haben
laut Messung Datengrundlage (siehe unten). Ungeprüft ist, wie stark sie die
Route verlängern und ob das Ergebnis subjektiv besser wird.

### Test 5 — Verfallen hochgeladene Profile? läuft seit 18.08.2026

**Sonde:** `custom_1787045820175`, hochgeladen am 18.08.2026 um 11:37, routet
sofort nach dem Upload einwandfrei (16510 m auf der Kontrollstrecke).

**Prüfung:** Die ID gelegentlich erneut aufrufen und notieren, wann sie zum
ersten Mal nicht mehr antwortet.

| Datum | Antwortet noch? |
|---|---|
| 18.08.2026 | ja (Upload-Tag) |

**Worum es eigentlich geht.** Ein Ablauf ist *kein* Datenverlust: Der Profiltext
liegt ohnehin bei den Nutzerdaten, eine tote ID bedeutet nur einen erneuten
Upload. Die App muss das lediglich sauber abfangen, statt eine Fehlermeldung
durchzureichen.

Die wirklich relevante Frage ist die umgekehrte: **Kann man den gespendeten
Server zumüllen?** Bleiben hochgeladene Profile ewig liegen, erzeugt jede
Profiländerung dauerhaften Müll auf fremder Infrastruktur. Dann muss die App
sparsam hochladen — nur bei tatsächlicher Änderung, mit zwischengespeicherter
ID. Räumt der Server dagegen selbst auf, ist die Sache entspannt.

Solange das offen ist, gilt vorsorglich die sparsame Variante.

**Nebenbefund, unabhängig vom Ausgang:** Eine unbekannte oder abgelaufene ID
liefert **HTTP 500 mit leerem Body** — nicht unterscheidbar von anderen Fehlern.
Die App muss beim Fehlschlag mit einer Custom-ID deshalb einmal blind neu
hochladen und erneut versuchen, bevor sie einen Fehler meldet.

---

## Ein Profil ist ein Programm, keine Werteliste

Das ist der wichtigste Punkt zum Verständnis. Ein `.brf`-Profil sieht oben aus
wie eine Einstellungsdatei, ist aber darunter Programmcode:

```
assign consider_traffic = 0.1        # Parameter — eine Variable

assign costfactor                    # Programm — rechnet Kosten aus OSM-Tags
  switch or highway=primary highway=primary_link      1.2
  switch or highway=secondary highway=secondary_link  1.1
  switch    highway=unclassified   switch isunpaved 10 1.1
```

Etwa 24 Variablen stehen oben, darunter rund 300 Zeilen Regeln. Der `costfactor`
ist das Herz: er sagt, wie teuer ein Meter dieses Weges ist. `1.0` heißt neutral,
`10000` heißt gesperrt.

Daraus folgt die zentrale Unterscheidung für die App:

- **Werte ändern** = Variablen oben überschreiben. Geht ohne Upload.
- **Regeln ändern** = das Programm umschreiben. Geht nur mit Upload.

### Parameter beschreiben sich selbst

Die mitgelieferten Profile tragen ihre Bedienungsanleitung im Kommentar:

```
assign allow_steps      = true  # %allow_steps% | Set to false to disallow steps | boolean
assign downhillcost     = 60    # %downhillcost% | Cost for going downhill | number
assign consider_traffic = 0.1   # %consider_traffic% | ... | [1=very important, 0.5=pretty important, ...]
```

Format: `# %name% | Beschreibung | Typ`, wobei der Typ `boolean`, `number` oder
eine Auswahlliste in eckigen Klammern ist. Genau daraus baut die offizielle
Weboberfläche ihre Parametermaske.

**Für uns nicht zur Laufzeit abrufbar.** Die Texte stehen nur in den
`.brf`-Dateien im Quell-Repo, nicht hinter der API. Ein Parameterkatalog muss
deshalb in die App eingebettet werden. Das ist kein Nachteil: So kontrollieren
wir die Wortwahl selbst, statt englische Entwicklerkommentare durchzureichen.

---

## Die zwei Wege, ein Profil zu verändern

### Weg A — Parameter im Request (kein Upload)

Im Quellcode des Servers dokumentiert (`ServerHandler.java`, Abschnitt
Parameters): `profile:xxx = parameter in profile`.

```
...&profile=fastbike&profile:consider_traffic=1.0
```

Belegt am 18.08.2026: liefert Zeichen für Zeichen dasselbe Ergebnis wie das
Serverprofil `fastbike-lowtraffic`.

| | |
|---|---|
| Anfragen pro Berechnung | 1 |
| Vorhandene Werte ändern | ja |
| Neue Regeln einführen | **nein** |
| Funktioniert mit `format=gpx` | ja, geprüft |
| Funktioniert zusammen mit `nogos` | ja, geprüft |

### Weg B — Profil hochladen

```
POST https://brouter.de/brouter/profile
Content-Type: text/plain
<Profiltext>

→ { "profileid": "custom_1787044885678" }
```

Danach `profile=custom_1787044885678` wie ein normaler Profilname. Antwort trägt
`Access-Control-Allow-Origin: *`. Weil `text/plain` ein einfacher
Content-Type ist, bleibt auch der POST ein CORS-simple-request ohne Preflight.

| | |
|---|---|
| Anfragen pro Berechnung | 2 (Upload lässt sich zwischenspeichern) |
| Vorhandene Werte ändern | ja |
| Neue Regeln einführen | **ja** |
| Profil als Datei exportierbar | ja |
| Lebensdauer der ID | **unbekannt, siehe Test 5** |

`GET /brouter/profile/<id>` ist **kein** Download. Der Endpunkt antwortet mit
einer Fehlermeldung im JSON-Format. Ein hochgeladenes Profil lässt sich nicht
zurücklesen — die App muss den Text also selbst behalten.

---

## Belegte Gleichungen zwischen den Serverprofilen

Gemessen am 18.08.2026 über drei Wegpunkte im Harz. Übereinstimmung in Länge,
Kosten und Höhenmetern gleichzeitig:

| Serverprofil | ist identisch mit |
|---|---|
| `fastbike` | `fastbike.brf` unverändert (`consider_traffic = 0.1`) |
| `fastbike-lowtraffic` | `fastbike.brf` mit `consider_traffic = 1.0` |
| `fastbike-verylowtraffic` | **nicht** aus `fastbike.brf` ableitbar — eigene, ältere Datei |

Die drei `fastbike`-Profile im Auswahlmenü sind also faktisch **ein Profil mit
einem Regler**, plus ein Fremdkörper. `consider_traffic` skaliert dabei über den
dokumentierten Bereich hinaus sauber weiter:

| `consider_traffic` | Hauptstraßenanteil |
|---|---|
| 1.0 (= `lowtraffic`) | 42,5 % |
| 2.0 | 41,1 % |
| 4.0 | 36,8 % |
| 8.0 | 27,6 % |

---

## Was im Datensatz liegt

Gemessen am 18.08.2026 an vier Strecken in Niedersachsen und im Harz, zusammen
187,6 km. Anteile sind längengewichtet, nicht nach Segmentzahl.

**Wichtig zur Methode:** BRouter liefert in `messages` standardmäßig nur die
Tags, die das Profil auch **benutzt**. Wer die echte Datenlage sehen will, muss
`profile:processUnusedTags=1` mitgeben. Ohne diesen Schalter misst man den
Profilverbrauch und hält ihn für die Datenlage — ein Fehler, der hier beinahe
passiert wäre.

### Gut abgedeckt

| Tag | Abdeckung | Anmerkung |
|---|---|---|
| `surface` | 99,4 % | praktisch lückenlos |
| `estimated_traffic_class` | 49 % gesamt | aber **100 %** auf `primary`, `secondary`, `tertiary` |
| `estimated_forest_class` | 95,1 % | von BRouter berechnet, nicht aus OSM |
| `estimated_noise_class` | 55,8 % | dito |
| `estimated_river_class` | 45,5 % | dito |

Die 51 % ohne Verkehrsschätzung sind zu 40 % `path`, 28 % `track` und 19 %
`residential` — also Wege ohne nennenswerten Autoverkehr. **Das ist Absicht, kein
Datenloch.** BRouter schätzt Verkehr nur dort, wo Autos fahren.

### Die echte Lücke: Asphaltqualität

`surface=asphalt` sagt, *dass* Asphalt liegt, nicht *wie* er ist. Frisch saniert
und aufgeplatzter Flickenteppich tragen dasselbe Tag. Die Unterscheidung steckt
in `smoothness`, und die fehlt weitgehend:

| Straßenklasse | Anteil der Route | `smoothness` vorhanden |
|---|---|---|
| `primary` | 22,4 % | 38,0 % |
| `tertiary` | 18,3 % | 25,0 % |
| `secondary` | 8,3 % | 15,1 % |
| `unclassified` | 3,4 % | 0,0 % |

Ausgerechnet das Feld, das der wichtigsten Priorität des Nutzers entspricht.

### Vorhanden, aber vom Profil ignoriert

| Tag | im Datensatz | Gewicht in `fastbike.brf` |
|---|---|---|
| `maxspeed` | 51,2 % | 0 |
| `lanes` | 48,9 % | 0 |
| `lit` | 28,4 % | 0 |
| `sidewalk` | 18,9 % | 0 |
| `motor_vehicle` | 8,0 % | 0 |
| `incline` | 4,9 % | 0 |

Häufigste Werte: `maxspeed` ist zu 20,8 % Tempo 50 und zu **16,7 % Tempo 100**;
`lanes` ist zu 43,1 % zweispurig.

**`maxspeed` kann die fehlende Verkehrsschätzung nicht ersetzen.** Wo die Klasse
fehlt, fehlt zu 78,3 % auch `maxspeed`, und der Rest ist Tempo 30 und 50. Der
Wert liegt nicht in der Lückenfüllung, sondern darin, dass Tempo eine eigene
Dimension ist: Eine Tempo-100-Straße ist bei gleicher Verkehrsklasse für einen
Radfahrer deutlich unangenehmer als eine Tempo-50-Straße. Siehe Test 2.

---

## Fallstricke bei der Auswertung

**`maxspeed` kommt nur mit `processUnusedTags=1`.** BRouter liefert in
`messages` standardmässig nur die Tags, die das Profil auch benutzt. Wer eine
Auswertung auf `maxspeed`, `lanes` oder `lit` baut, bekommt ohne diesen Schalter
dauerhaft null — und zwar **ohne Fehlermeldung**. Die Auswertung sieht aus, als
funktioniere sie, und zeigt nur nie etwas an. Beim Bau der App am 18.08.2026
genau so passiert.

Für die Anzeige setzt die App den Schalter deshalb selbst. Beim GPX-Export
nicht: Dort zählt nur die Strecke, und die Antwort bleibt kleiner.

## Was in der Routenantwort steckt

Alles für eine Streckenanalyse Nötige kommt bereits mit der normalen
GeoJSON-Antwort. **Kein zweiter Dienst nötig.**

- Jede Koordinate ist ein Tripel `[lon, lat, Höhe]` → Höhenprofil ohne Zusatzabfrage
- `properties.messages` ist eine Tabelle mit einer Zeile je Wegabschnitt.
  Spalten unter anderem: `Distance`, `WayTags`, `Elevation`, `Time`, `Energy`
- `WayTags` enthält die OSM-Tags als `schlüssel=wert`, durch Leerzeichen getrennt
  → Belag, Straßenklasse und Wegequalität sind daraus direkt aggregierbar
- `properties` liefert zusätzlich `track-length`, `filtered ascend`,
  `plain-ascend`, `total-time`, `total-energy`, `cost`

Beispielauswertung einer 16,7-km-Strecke: 87,9 % Asphalt, 10,6 % wassergebundene
Decke — und 38,5 % Hauptstraße, 26,9 % Wirtschaftsweg.
