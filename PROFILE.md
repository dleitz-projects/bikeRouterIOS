# Profile

Welche Routing-Profile die App anbietet, woher sie kommen und welche wir
langfristig übernehmen, umbenennen oder selbst schreiben.

Das ist bewusst eine eigene Datei und keine Liste in der `CLAUDE.md`: Die Frage
ist **nicht entschieden** und wird es auf einen Schlag auch nicht. Sie hängt an
Messungen, an der Serverwahl (`SERVER.md`) und daran, wie sich die Profile im
Fahren bewähren.

| Datei | Inhalt |
|---|---|
| `BROUTER.md` | wie ein Profil **funktioniert** — Sprache, Parameter, Kostenmodell |
| `SERVER.md` | welcher **Server** welche Profile ausliefert |
| `PROFILE.md` | welche Profile es **gibt** und welche wir davon wollen |

---

## Der Bestand auf brouter.de

Gemessen am 19.08.2026: Jeder der 64 Profilnamen aus der Konfiguration von
bikerouter.de wurde einzeln mit einer kurzen Anfrage gegen brouter.de geprüft.
**29 antworten mit `HTTP 200`.** Alle übrigen mit `500` und leerem Body.

Groß- und Kleinschreibung zählt: `MTB` scheitert, `mtb` läuft.

### Fürs Rennrad — die engere Wahl

| Serverprofil | Vorschlag Anzeigename | Was es tut |
|---|---|---|
| `fastbike-lowtraffic` | Wenig Verkehr | **Standard.** Asphalt, schnell, Hauptstraßen kosten mehr |
| `fastbike` | Zügig | wie oben ohne Verkehrsabschlag — nimmt Bundesstraßen gern |
| `fastbike-verylowtraffic` | Sehr wenig Verkehr | eigene, ältere Datei von Ess Bee; meidet zusätzlich Tempo > 50 und Lkw-Strecken |
| `fastbike-asia-pacific` | Zügig (Asien/Pazifik) | erlaubt Autobahnen — in Europa unbrauchbar |

### Tourenrad

| Serverprofil | Vorschlag Anzeigename | Was es tut |
|---|---|---|
| `trekking` | Trekking | Allrounder, toleriert unbefestigte Wege |
| `safety` | Trekking, Hauptstraßen meiden | `trekking` + `avoid_unsafe` |
| `trekking-steep` | Trekking, Steigungen egal | `consider_elevation = false` |
| `trekking-ignore-cr` | Trekking ohne Radrouten-Bonus | `ignore_cycleroutes = true` |
| `trekking-noferries` | Trekking ohne Fähren | `allow_ferries = false` |
| `trekking-nosteps` | Trekking ohne Treppen | `allow_steps = false` |

### Gelände

| Serverprofil | Vorschlag Anzeigename | Was es tut |
|---|---|---|
| `quaelnix-gravel` | Gravel | Fassung 21.06.2025 |
| `gravel` | Gravel (ältere Fassung) | Fassung 28.04.2024, **derselbe Autor** |
| `mtb` | Mountainbike | nimmt Pfade und groben Untergrund bewusst mit |

### Liegerad und Velomobil

`vm-forum-liegerad-schnell`, `vm-forum-velomobil-schnell` — aus dem
Velomobilforum, andere Steigungs- und Breitenbewertung.

### Nicht fürs Rad

`hiking-beta`, `hiking-mountain`, `skating`, `moped`, `car-eco`, `car-fast`,
`car-vario`, `car-vario-nocost`.

### Sonderzwecke

`shortest` (misst nur Länge), `all` (jeder Weg gleich teuer — zeigt, was
überhaupt verbunden ist), `softaccess` (Hilfsprofil der Engine),
`dummy` (leer), `rail` (folgt Bahnstrecken), `river` (folgt Wasserläufen).

---

## Was die Namen verschweigen

Gelesen aus den Profiltexten (`https://prod.bikerouter.de/profiles/<name>.brf`),
Stand 19.08.2026. **Gelesen, nicht nachgerechnet** — siehe offener Test unten.

| Profil | Was der Name nahelegt | Was tatsächlich drinsteht |
|---|---|---|
| `safety` | ein Sicherheitskonzept | ein einziger Schalter, `avoid_unsafe = true` |
| `trekking-steep` | sucht Steigungen | **ignoriert** sie: `consider_elevation = false` |
| `trekking-ignore-cr` | unverständlich | `cr` = cycleroutes: kein Bonus für ausgeschilderte Radrouten |
| `car-fast` | ein eigenes Fahrprofil | identisch mit `car-eco` bis auf `vmax` 160 statt 90 |
| `gravel` / `quaelnix-gravel` | zwei Profile | zwei **Stände desselben Profils** desselben Autors |
| `fastbike-verylowtraffic` | die dritte Stufe von `fastbike` | eine eigenständige, ältere Datei anderer Herkunft |

Dazu ein Befund, der die ganze Trekking-Familie betrifft: Die fünf Varianten
stammen von einem **älteren** `trekking`-Stand als das heutige `trekking`. Ihnen
fehlen `consider_noise`, `consider_river`, `consider_forest` und
`consider_town`. Sie sind also nicht „trekking plus Schalter", sondern
„altes trekking plus Schalter".

**Daraus folgt die Anzeigeregel, die im Entwurf vom 19.08.2026 steckt:** Jede
Zeile zeigt drei Dinge — verständlicher Name, echter Serverbezeichner, eine
Zeile was er bewirkt. Ein Profilname allein ist keine Information.

---

## Was auf brouter.de fehlt

35 der 64 Namen sind dort unbekannt, darunter die gesamte Sammlung von Poutnik
(`Trekking-dry`, `Trekking-Fast`, `Trekking-MTB-*`, `MTB`, `MTB-light` …), dazu
`m11n-gravel`, `cxb-gravel`, `mtb-zossebart`, `randonneur`,
`velomobil-touristic`, `ffmbb-long-distance-cycling`, `reroute-zossebart`,
`Fastbike-lowtraffic-tertiaries`, `Trekking-tracks`.

Sie liegen nur auf dem Server von bikerouter.de. Drei Wege, sie zu bekommen:

| Weg | Was er kostet |
|---|---|
| **Server wechseln** (bikerouter.de/brouter-engine) | dort ältere Engine, fremde Last, andere Ausfallwahrscheinlichkeit — siehe `SERVER.md` |
| **Profiltext hochladen** (`POST /brouter/profile`) | eine zusätzliche Übertragung je Profil, dazu die offene Frage, ob Uploads verfallen |
| **Selbst schreiben** | volle Kontrolle, aber `.brf` ist ein Programm, kein Formular — siehe `BROUTER.md` |

---

## Die eigentliche Frage: übernehmen oder selbst schreiben?

Noch nicht entschieden. Was dafür spricht, es bei den mitgelieferten zu belassen:
Sie sind erprobt, kosten nichts und laufen mit **einer** Anfrage. Was dagegen
spricht: Keines davon trifft die Prioritäten dieses Nutzers genau — Asphalt und
wenig Autoverkehr, Höhenmeter zweitrangig.

Ein sinnvoller Mittelweg zeichnet sich ab und wird im Betrieb geprüft:

1. **`fastbike-lowtraffic` als Grundlage behalten** — nachgemessen ist es
   `fastbike` mit `consider_traffic`, also ein Regler, kein fremdes Programm.
2. **Abweichungen als Parameter mitschicken** statt neue Profile anzulegen.
   Kostet keine zusätzliche Anfrage.
3. **Nur dort selbst schreiben, wo Parameter nicht reichen** — etwa
   `maxspeed` als eigene Kostendimension, siehe `IDEEN.md`, Idee 1.

### Offener Punkt: Änderungen vermüllen den Bestand

Beim Bearbeiten entsteht mit jeder Änderung ein neuer Stand. Zwei Anforderungen
stoßen dabei zusammen:

- **Nachvollziehbarkeit.** Zu jeder gespeicherten Tour müssen die damals
  benutzten Werte vorliegen, sonst ergibt „noch einmal berechnen" eine andere
  Route. Die `CLAUDE.md` löst das bereits für die Tour: Sie speichert eine
  **Kopie der Werte**, keinen Verweis aufs Profil.
- **Ordnung.** Würde jede Änderung ein neues Profil anlegen, stünden nach einem
  Monat dreißig „Harz ruhig 7" in der Liste. Und beim Upload-Weg entstünde
  derselbe Müll zusätzlich auf fremder Infrastruktur.

Die Kopie in der Tour löst die erste Hälfte. Offen bleibt:

1. Braucht ein **Profil** selbst eine Versionsgeschichte, oder genügt der
   jeweils letzte Stand plus die Kopien in den Touren?
2. Wenn eine alte Tour Werte enthält, die es im heutigen Profil nicht mehr gibt
   — wie kommt man von der Tour zurück zu einem benutzbaren Profil? Ein
   „Werte dieser Tour als neues Profil sichern" wäre die naheliegende Antwort.
3. Beim Upload-Weg: Muss die App hochgeladene Profile selbst aufräumen, oder
   verfallen sie von allein? Das entscheidet der laufende Test in `BROUTER.md`.

---

## Offene Tests

1. **Die Gleichungen nachrechnen.** Die Tabelle „Was die Namen verschweigen"
   ist aus Profiltexten **von bikerouter.de** gelesen. Ob die Dateien auf
   brouter.de identisch sind, ist ungeprüft. Sauberer Beleg wäre je Paar eine
   Berechnung über dieselben Wegpunkte und der Vergleich von Länge, Kosten und
   Höhenmetern — so wie am 18.08.2026 für die `fastbike`-Reihe gemacht.
2. **Was taugt `mtb` auf brouter.de?** Auf bikerouter.de ist `mtb` ein anderes
   Profil als `MTB`. Welches der Server ausliefert, ist ungeprüft.
3. **Lohnen die Sonderzweck-Profile?** `all` könnte als Diagnose dienen: Wenn
   `all` eine Route findet und das Fahrprofil nicht, liegt es am Profil und
   nicht an fehlenden Daten. Das wäre eine echte Hilfe bei „keine Route
   gefunden" — aber es kostet eine zweite Anfrage.
