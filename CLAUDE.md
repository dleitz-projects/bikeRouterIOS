# Projekt: bikeRouteriOS (PWA)

App-Name: `bikeRouteriOS` (Langform, `manifest.json` → `name`, `<title>`).
Auf dem Home-Bildschirm kürzt iOS nach etwa 12 Zeichen, deshalb ist
`short_name` bewusst `bikeRouter` — kurz genug, um ungekürzt zu bleiben.

## Zweck

Eine private, installierbare Web-App (PWA) für iOS, die Radrouten über die
BRouter-Engine berechnet, sie lokal archiviert und als GPX an andere Apps
weitergibt.

Hintergrund: Die bestehenden Planer (Komoot, Strava, cycle.travel) verstecken
ihre Routing-Logik hinter undurchschaubaren Profilen. BRouter macht die Regeln
transparent, hat aber weder eine iOS-App noch eine Tourenverwaltung. Genau diese
Lücke schließt dieses Projekt.

## Begleitende Dokumente

Diese Datei enthält **Verbindliches**: Entscheidungen, Regeln, Nicht-Ziele.
Was hier steht, gilt. Die Dateien daneben halten bewusst Unverbindliches:

- **`BROUTER.md`** — wie die Routing-Engine **rechnet** und was davon
  nachgemessen ist, dazu eine Liste offener Tests. Wissen, das sich mit der
  nächsten Messung ändern darf.
- **`SERVER.md`** — wer die Server **betreibt**, was sie aushalten und wie sie
  scheitern: Instanzen, Endpunkte, Versionen, Grenzen, Ausweichwege. Die ganze
  App hängt an fremder Infrastruktur; hier steht, was darüber bekannt ist.
- **`PROFILE.md`** — welche Profile es **gibt**, was ihre Namen verschweigen und
  welche wir übernehmen, umbenennen oder selbst schreiben. Eine Frage, die auf
  einen Schlag nicht zu entscheiden ist.
- **`DARSTELLUNG.md`** — wie die Oberfläche auf **echten Geräten** wirklich
  misst: Bildschirme, Systemstreifen, gemessene Werte, die Fallen, die dabei
  schon zugeschlagen haben, und die Prüfliste für die Sichtkontrolle. Der
  Abschnitt „Gestaltung" hier sagt, wie es aussehen **soll**; dort steht, was
  das Gerät daraus macht.
- **`messungen/`** — Referenzstrecken, Messwerkzeug und Rohdaten. Wer eine Zahl
  in Frage stellt, misst dort nach statt zu diskutieren. Zusammenfassung in
  `messungen/ERKENNTNISSE.md`.
- **`IDEEN.md`** — Ideensammlung mit Status. Auch Verworfenes bleibt dort mit
  Begründung stehen.
- **`OFFENE-PUNKTE.md`** — Entscheidungen, die an bereits Gebautem hängen und
  noch nicht gefallen sind. Benennungen, Verhalten, Grenzfälle.
- **`doku/`** — Material, das nicht ausgeliefert wird. Darin die klickbaren
  UI-Entwürfe, auf die sich der Abschnitt „Gestaltung" bezieht.

Wer die Engine anfasst, liest vorher `BROUTER.md`. Vieles, was naheliegend
aussieht, ist dort bereits gemessen und teils widerlegt. Dasselbe gilt für die
Oberfläche und `DARSTELLUNG.md`: Jede Zahl darin ist an einem Gerät
nachgemessen, und mehrere davon widersprechen dem, was der Browser am
Schreibtisch anzeigt.

**Die Trennung der drei technischen Dateien in einem Satz:** `BROUTER.md`
beantwortet „wie wird gerechnet", `SERVER.md` „wer rechnet und was hält er aus",
`PROFILE.md` „womit wird gerechnet".

## Zielnutzer

Ein einzelner Nutzer, Rennrad, iPhone. Fährt geplante Start-Ziel-Strecken.
Prioritäten beim Routing: Asphaltqualität und wenig Autoverkehr. Höhenmeter und
Streckenlänge sind zweitrangig.

## Ziele

1. Karte, auf der per Tap Start-, Ziel- und Zwischenpunkte gesetzt und
   verschoben werden können
2. Routenberechnung über die BRouter-API mit wählbarem Profil
3. Route auf der Karte darstellen, mit Distanz und Höhenmetern
4. GPX-Export über das native iOS-Share-Sheet (Web Share API mit Dateien)
5. Lokales Tourenarchiv mit Name, Datum, Distanz — wiederaufrufbar und editierbar
6. Nogo-Bereiche (Kreise mit einstellbarem Radius), um Städte zu umfahren
7. Installierbar über "Zum Home-Bildschirm", mit eigenem Icon und ohne Safari-UI

## Gestaltung

Bestätigt am 18.08.2026 am klickbaren Entwurf `doku/ui-entwurf-2026-08-18.html`.
Der Entwurf ist die Momentaufnahme, die folgenden Punkte sind das Verbindliche
daraus.

**Grundform.** Karte vollflächig und randlos. Alles zur Bedienung schwebt
darüber und nimmt der Karte keinen dauerhaften Platz weg.

**Die Drei-Ecken-Regel.** Sie hat sich beim Entwerfen ergeben, nicht am
Reißbrett — gilt aber ab jetzt, weil sie die App ohne Erklärung begreifbar macht:

| Ecke | Gehört dorthin | Enthält |
|---|---|---|
| **oben links** | das Profil | aktives Profil, Wechseln, Bearbeiten, Baukasten |
| **oben rechts** | der Nutzer | Touren, Fahrer & Rad, Sicherung |
| **unten** | die Route | Kennzahlen, Berechnen, Teilen, Speichern, Analyse |

Die Trennlinie ist die Lebensdauer: Was über Routen hinweg gleich bleibt, gehört
nach oben rechts. Was nur diese eine Strecke betrifft, nach unten. Was bestimmt,
*wie* gerechnet wird, nach oben links.

**Eine neue Funktion muss in eine dieser drei Ecken passen.** Passt sie in keine,
ist im Zweifel die Funktion falsch geschnitten und nicht das Layout. Genau daran
ist aufgefallen, dass „Fahrer & Rad" nicht ins Routing-Profil gehört: Es hängt am
Nutzer, nicht an der Art der Route — auch wenn es technisch ein Parameter
derselben Profildatei ist.

Dazu kommt rechts eine senkrechte Leiste mit fünf Kartenwerkzeugen, links unten
Zoomknöpfe mit der Nennung der Datenquellen darunter, und unten ein Blatt mit
vier Zuständen (siehe unten).

**Die Pille öffnet die Auswahl, nicht den Editor.** Ein Tap zeigt das aktive
Profil mit prominentem *Bearbeiten*, darunter vier weitere und einen Verweis
*Mehr Profile* auf die vollständige Liste, getrennt nach eigenen und
mitgelieferten. Alle Profile auf einmal aufzulisten wäre unübersichtlich.

Jede Zeile sagt, woran man ist: eigenes oder mitgeliefert, welches Basisprofil
dahintersteht, und ob Bausteine im Spiel sind — denn nur die kosten eine
zusätzliche Übertragung.

**Ein mitgeliefertes Profil zu bearbeiten erzeugt eine Kopie.** Das Original
bleibt unberührt und wählbar. Sonst wäre der verifizierte Ausgangszustand nach
einer Änderung unwiederbringlich weg.

**Die fünf Kartenwerkzeuge.** Die ersten beiden sind ein Modus-Paar und
schließen sich gegenseitig aus, die übrigen lösen sofort aus:

| Werkzeug | Wirkung |
|---|---|
| Wegpunkt-Modus | Tippen auf die Karte setzt einen Wegpunkt (Standard) |
| Sperrbereich-Modus | Tippen auf die Karte legt einen Nogo-Kreis an |
| Rückgängig | nimmt den zuletzt gesetzten Punkt zurück, mindestens zwei bleiben |
| Standort | zentriert die Karte, ohne einen Punkt zu setzen |
| Kartenbild | öffnet die Auswahl der Kachelquelle |

**Zoom gehört nach links, nicht in die Leiste.** Die rechte Kante ist voll, und
Plus/Minus sind kein Kartenwerkzeug im Sinne der Leiste, sondern Bedienung der
Ansicht. Leaflets eigenes `zoomControl` bleibt abgeschaltet — es galt auf
älteren iOS-Fassungen als Ursache dafür, dass Antippen nicht ankommt.

**Das Kartenbild ändert die Route nicht.** Aufgenommen sind nur Quellen ohne
Anmeldung und ohne Vertrag: OpenStreetMap, CyclOSM (hebt Radwege hervor),
OpenTopoMap. Satellit steht grau daneben statt zu fehlen — sonst fragt man sich
in einem halben Jahr, ob es vergessen wurde. **Die Nennung folgt der Quelle:**
Wer CyclOSM anzeigt, muss CyclOSM nennen.

Jeder Tap auf ein Werkzeug blendet kurz ein, was er bewirkt hat. Ohne diese
Rückmeldung ist ein Modusumschalter auf einer Karte nicht zu erraten.

**Jedes gesetzte Element ist antippbar** und öffnet ein kleines Menü direkt am
Objekt: Wegpunkte zum Löschen, Sperrbereiche zum Löschen und Radius ändern.
Rückgängig allein genügt nicht — es löscht nur in umgekehrter Reihenfolge, wer
also den zweiten von sechs Punkten entfernen will, müsste vier gute mit
zerstören. Beim Sperrbereich ist der **Mittelpunkt** das Ziel, nicht die Fläche:
Eine antippbare Fläche würde jeden Tap auf die Karte darunter schlucken.
Vorhandene Elemente haben dabei immer Vorrang vor dem aktiven Modus.

**Jeder Parameter zeigt seinen echten BRouter-Namen.** Unter „Autoverkehr
meiden" steht klein `consider_traffic`. Das ist Absicht und folgt direkt aus dem
Zweck des Projekts: Die bestehenden Planer verstecken ihre Routing-Logik, diese
App legt sie offen.

**Wo Daten fehlen, wird kein Regler angeboten.** Für Asphaltqualität gibt es
keinen Regler, sondern eine Notiz, warum es ihn nicht gibt — das Feld
`smoothness` fehlt in den Kartendaten auf rund 70 % der Strecke. Ein Regler ohne
Datengrundlage wäre eine Lüge an der Oberfläche.

**Am 19.08.2026 gemessen belegt, und schlimmer als gedacht:** Eine Datenlücke
ist keine neutrale Leerstelle. `smoothness` fehlt vor allem auf **Hauptstraßen** —
ein Eingriff, der nur bewertet, was erfasst ist, bestraft deshalb die kleinen
getaggten Nebenwege und belohnt die ungetaggten großen. Ein Testbaustein trieb so
den Hauptstraßenanteil von 25 % auf 34 %. Siehe `BROUTER.md`, Test 8.

**Zahlen in der Oberfläche tragen ihr Datum und ihre Herkunft.** „Gemessen:
Hauptstraßenanteil 42,5 % bei 1,0" steht neben dem Regler, nicht nur in einer
Markdown-Datei — ein Wert ohne Größenordnung ist eine Zumutung. Dass diese Zahlen
aus wenigen Strecken stammen, ist bekannt und als `P14` offen: Sie sind eine
ehrliche Einschätzung, keine Zusage.

**Jede Aussage über Routenwahl braucht mindestens 100 km.** Auf kurzen Strecken
gibt es keine echten Alternativen; ein Eingriff sieht dort harmlos aus, obwohl er
es nicht ist. Genau so ist der `smoothness`-Baustein durchgerutscht — auf 43 km
sah er richtig aus, auf 156 km war er schädlich. Werkzeug und Referenzstrecken
liegen in `messungen/`.

**Was nicht die Route ändert, sagt das.** Die Werte unter „Fahrer & Rad" wirken
nur auf die geschätzte Fahrzeit. Der Reiter schreibt das hin, sonst schraubt man
dort und wundert sich, dass sich nichts bewegt.

**Zwei getrennte Werkzeuge, keine zwei Stufen.** *Profil anpassen* ist Bedienung
und ändert nur Werte — kein Upload. *Baukasten* ist Werkstatt und fügt neue
Regeln hinzu — mit Upload. Ein Profil mit Bausteinen lässt sich nicht mehr allein
über die einfachen Regler bedienen; die App muss das sagen, bevor Arbeit verloren
geht.

**Kein freier Profiltext.** Der Baukasten setzt Regeln aus vorgefertigten
Bausteinen zusammen und erzeugt den Profiltext selbst. Grund: Einen Syntaxfehler
quittiert der Server beim **Rechnen** mit `HTTP 500` und leerem Body — es gäbe
keine Fehlermeldung, die dem Nutzer sagen könnte, was falsch ist. (Beim
**Übertragen** meldet er ihn zwar im Klartext, siehe `BROUTER.md` — aber erst,
nachdem man ihn gemacht hat.)

**Die Basisprofile liegen im Repo, in `basis/`.** Entschieden am 19.08.2026:
Neue Regeln brauchen den vollständigen Profiltext, und die API gibt ihn nicht
heraus. Von den zwei möglichen Wegen — mitliefern oder zur Laufzeit von GitHub
holen — ist **mitliefern** gewählt: Eine zweite fremde Abhängigkeit im Betrieb
wäre schlechter als 34 KB im Repo. Der Preis: Die Kopien altern still. Gemildert
dadurch, dass sie **nur für Profile mit Bausteinen** benutzt werden; ohne
Bausteine rechnet der Server mit seiner eigenen, aktuellen Fassung. Begründung
und Abgleich-Weg stehen in `basis/README.md`.

**Ein Baustein greift an drei Stellen ein, nie in den Kostenausdruck selbst:**
Parameter in den globalen Abschnitt, Regel vor `assign costfactor`, ein
`add <name>` in die Kette der Strafaufschläge. Der Kostenausdruck ist mehrzeilig
und in jedem Profil anders — ein zusätzlicher Summand ist der kleinste Eingriff,
den man noch prüfen kann.

**Jeder Baustein braucht eine Kontrolle, die ihn neutral stellt.** Beim
Tempolimit-Baustein ist das `consider_speed = 0`: Damit müssen exakt die
Referenzwerte herauskommen. Ohne diese Probe ist nicht zu unterscheiden, ob ein
Baustein wirkt oder ob er nebenbei etwas anderes kaputt macht.

**Speichern, Touren und Sicherung heißen verschieden.** Drei Dinge, die im
ersten Entwurf noch fast gleich hießen und deshalb doppelt wirkten:

| Bedienelement | Ort | Wirkung |
|---|---|---|
| *Tour speichern* | Blatt unten | legt die aktuelle Route unter einem Namen ab |
| *Öffnen* | Menü → Touren | holt eine gespeicherte Tour auf die Karte zurück |
| *Sicherung* | Menü oben rechts | schreibt alles zusammen in eine Datei |
| *Wiederherstellen* | Menü → Sicherung | lädt eine Sicherungsdatei zurück |

**„Wiederherstellen" ist ausschließlich für die Sicherungsdatei reserviert.** Das
Wort bedeutet: etwas war verloren und kommt zurück — und das trifft nur dort zu,
wenn iOS den Speicher geräumt hat. Eine gespeicherte Tour war nie weg, sie wird
**geöffnet**, wie ein Dokument. Stünde „Wiederherstellen" an beiden Stellen,
wäre dieselbe Falle zurück, die schon zwischen *speichern* und *sichern* lag.

Ein weiterer Unterschied, der oft verwechselt wird: **Bearbeiten** gibt es nur
bei einem **Profil**, nicht bei einer Tour. Ein Profil ist eine Rechenvorschrift,
eine Tour ein Ergebnis. Eine Tour zu ändern heißt, sie zu öffnen und Punkte zu
verschieben — dafür braucht es keinen eigenen Knopf. Nur der Name ist separat
änderbar.

**Was eine gespeicherte Tour anzeigt.** Drei Ebenen, klar nach Herkunft getrennt:

| Ebene | Inhalt | Herkunft |
|---|---|---|
| Name | „Okertal-Runde" | **vom Nutzer**, beim Speichern vorgeschlagen, frei änderbar |
| Kennzahlen | `43,5 km · 965 hm · 3:36 h` | automatisch |
| Profil | Profilname · Basisprofil · stärkste Abweichungen | automatisch |

Der Name gehört dem Nutzer, weil das Auffälligste an einer Tour ist, **wo sie
langgeht** — und das weiß nur er. Alles Übrige entsteht von selbst.

Die Profilzeile nennt bewusst nicht nur den Profilnamen. „Harz ruhig" sagt in
einem halben Jahr nicht mehr, was daran ruhig war; erst Basisprofil und
Abweichungen machen die Tour nachvollziehbar.

**Eine Tour speichert eine Kopie der verwendeten Werte, keinen Verweis aufs
Profil.** Sonst wäre eine alte Tour rückwirkend falsch beschriftet, sobald das
Profil sich ändert — und Wiederherstellen ergäbe eine andere Route als damals.
Weicht das heutige Profil vom gespeicherten ab, sagt die Tour das und lässt die
Wahl zwischen den damaligen und den heutigen Werten.

**Eine Tour speichert die Route selbst, nicht die Frage nach ihr.** Entschieden
am 19.08.2026. Bis dahin lagen im Archiv nur die Wegpunkte; Öffnen hieß neu
rechnen. Damit hing jede gespeicherte Tour an zwei Dingen, die niemand zusagt:
dass BRouter gerade erreichbar ist, **und** dass seine Kartendaten sich nicht
bewegt haben. Der Server aktualisiert seine `.rd5`-Segmente — dieselbe Anfrage
kann später eine andere Route ergeben, ohne dass es auffiele. Man bekäme still
eine andere Tour zurück, als man abgelegt hat. Das ist kein Randfall, sondern
der Normalfall über ein Jahr.

Abgelegt wird deshalb die vollständige Punktfolge, verlustfrei kodiert: lon/lat
auf `1e-6` — genau die Auflösung, die BRouter liefert — und die Höhe auf
Viertelmeter, sein eigenes Raster. Kodiert werden die Differenzen zum Vorgänger
(Zickzack plus Fünf-Bit-Gruppen, wie bei den Google-Polylines), was bei 28 m
Punktabstand fast alles wegkürzt: **7,7 KB statt 42 KB für 43 km.** Eine ganze
Tour kostet damit rund 8 KB — bei etwa 5 MB `localStorage` hört der Speicher
auf, die Grenze zu sein.

**Nicht in den Punkten steckt die Analyse.** Belag, Straßenarten und
Tempolimits kommen aus `messages` in der GeoJSON-Antwort — allein 39 KB, und aus
Koordinaten nicht rekonstruierbar. Gespeichert wird deshalb das **fertige
Ergebnis** der Auswertung, unter 1 KB.

**Das GPX wird geschrieben, nicht geholt.** Es enthält nichts, was nicht schon
in der Antwort stand, mit der die Linie gezeichnet wurde: dieselben Punkte,
dieselben Höhen, dazu eine Kommentarzeile mit den Kennzahlen. Es ist die
**ärmere** der beiden Antworten — die `messages` kennt es gar nicht. Trotzdem
kostete Teilen bis dahin eine zweite Anfrage für Daten, die längst da waren.
Nachgeprüft am 19.08.2026 gegen drei Referenzstrecken (2, 43 und 156 km),
jeweils in beiden Formaten geholt: die erzeugte Datei ist **Byte für Byte** die
des Servers, Kopfzeile eingeschlossen. Deshalb trägt eine Route auch die acht
Kopfangaben unverändert als Zeichenketten mit — auf die Schreibweise kommt es
an, nicht auf den Wert.

Damit fragt die App den Server **nur noch mit `format=geojson`** und nur noch
beim Rechnen. Eine gespeicherte Tour öffnet und teilt sich ohne jede Anfrage —
auch bei `403 Please, retry later!` oder ohne Netz.

**Der Dateiname trägt, woran man die Datei wiedererkennt:**
`2026-08-19_Okertal-Runde_43.5km.gpx`, ohne Tourname der Profilname an dessen
Stelle. Datum zuerst, damit die Liste chronologisch fällt; die Distanz hinten,
weil sie zwei Varianten derselben Frage auseinanderhält. `Route.gpx`,
`Route-2.gpx`, `Route-3.gpx` in der Dateien-App zwingen dazu, jede zu öffnen.
Der Reiterbuchstabe kommt nicht vor — „A" ordnet innerhalb einer Sitzung, nicht
außerhalb. Ein Tourname ohne ein einziges Wort — der Vorschlag beim Speichern
ist Datum plus Distanz — wird übergangen, sonst stünde beides doppelt da.
Ortsnamen wären besser und hängen an derselben einen Entscheidung wie die
Tourennamen und die Ortssuche.

**Touren ohne Geometrie werden beim ersten Öffnen einmal nachgerechnet** und
tragen danach ihre Linie selbst. Sie zu verwerfen wäre falsch, sie ewig
nachzurechnen auch — beim zweiten Mal ergäbe es womöglich eine andere Route.

**Das Blatt hat vier Zustände, jeder mit eigenem Inhalt.** Drei Höhen mit nur
zwei Inhalten sind ein Fehler — genau daran krankte der Stand vom 18.08.2026,
wo die mittlere Raste dasselbe zeigte wie die kleine, nur höher:

| Zustand | Inhalt | wie man hinkommt |
|---|---|---|
| **leer** | nur der Knopf | Ausgangslage, bevor gerechnet wurde |
| **klein** | Kennzahlen und Bedienung; Reiter erst ab zwei Routen | Griff |
| **halb** | dazu das Höhenprofil, **Karte bleibt sichtbar** | automatisch nach jeder Berechnung |
| **voll** | die ganze Analyse | Griff |

**Die Höhen werden gemessen, nicht gesetzt.** Klein ist mit einer Route
niedriger als mit dreien; halb endet unter der Höhenprofil-Karte. Feste
Prozentwerte träfen beides nie.

**Ziehen ist der Weg, Tippen die Abkürzung.** Am Griff ziehen bewegt das Blatt
und rastet beim Loslassen an der nächstgelegenen Stufe ein; ein Tap schaltet
eine Stufe weiter. Ein Blatt, das nur auf Antippen weiterschaltet, wirkt am
Telefon kaputt.

**Stumpf ist die Karte nur im Vollbild.** Dort bleibt nur ein schmaler Streifen
Karte übrig — ein Tap darauf kann nur „gib mir die Karte zurück" heißen und
zieht das Blatt eine Stufe zu, ohne etwas zu setzen. In der halben Raste gilt
das ausdrücklich nicht: Sie ist dafür da, auf der Karte zu arbeiten und
gleichzeitig das Profil zu sehen.

**Der Streifen liegt außerhalb des Systembereichs, nicht darin.** 44 px Karte
plus `env(safe-area-inset-top)`. Der Zuschlag ist keine Kosmetik: Die Seite
läuft mit `viewport-fit=cover`, der Ursprung liegt also am obersten
Bildschirmpunkt. Ohne ihn beginnt der Streifen dort — und der Griff sitzt unter
der **Dynamic Island**, die den Tap für sich nimmt. Am 19.08.2026 am Gerät
aufgelaufen: Aus der vollen Raste kam man weder durch Ziehen noch durch Tippen
heraus. Auf Geräten ohne Insel ist der Zuschlag null.

Daraus die allgemeine Regel: **Was am oberen Rand angefasst werden muss, wird
gegen `safe-area-inset-top` gerechnet, nicht gegen die Fensterhöhe.** Der Wert
ist in JavaScript nicht direkt lesbar — die App misst ihn über einen
unsichtbaren Klotz mit genau dieser Höhe.

**Was das Fenster nicht hergibt, ist im Fenster nicht zu holen.** Am
19.08.2026 am Gerät nachgemessen: Die installierte App wurde über die volle
Bildschirmhöhe gezeichnet, Safari rechnete das Layout aber um den oberen
Systemstreifen kürzer — und schnitt am Fensterrand ab. Der Versuch, den Rahmen
über das Fenster hinaus zu ziehen, verlor deshalb die Unterkante des Blattes
und war schlimmer als der Fehler. Ein zu kleines Fenster ist an seiner
**Ursache** zu beheben (hier: die Zeile `apple-mobile-web-app-status-bar-style`),
nicht durch Übergröße im Inneren.

Drei Regeln, die für jedes Gerät gelten sollen und nicht nur für das eine, an
dem es aufgefallen ist:

- **Alle Höhen werden gegen den Rahmen (`.app`) gerechnet, nicht gegen das
  Fenster.** Heute sind beide gleich hoch. Die Zeile bleibt trotzdem stehen,
  weil der Rahmen das ist, worin die Bedienung sitzt.
- **Was über dem Blatt schwebt, wird am nutzbaren Streifen gemessen** — also
  ohne den oberen Systembereich, und mit demselben Abstand nach oben, den es
  nach unten hat. Sonst bleibt im Vollbild etwas stehen und schiebt sich unter
  die Dynamic Island oder auf die Profilpille. Jedes Element wird dabei an
  **seiner eigenen Höhe** gemessen: Eine feste Schwelle trägt den
  Systemstreifen des Geräts in sich, an dem sie ermittelt wurde.
- **Die Leinwand trägt die Farbe des Blattes, nicht die der Karte.** Was das
  System außerhalb des Fensters streicht, sitzt immer unter dem Blatt — und
  unten ist in jedem Zustand ein Blatt: Routenblatt, Menü oder Vollbild-Ebene,
  alle drei in `--sheet`. Mit `--ground` stand dort ein grauer Balken, der wie
  ein Fehler aussah. Die Karte färbt sich selbst.

Die gemessenen Zahlen, das Messverfahren und die Geräte, an denen sie geprüft
sind, stehen in `DARSTELLUNG.md` — hier nicht, weil sie sich mit jedem neuen
Gerät ändern.

**Unsichtbare Trefferflächen dürfen nur über toten Raum wachsen.** Die auf 44 px
vergrößerte Fläche des Griffs lag zunächst über der Reiterzeile — ein Tap auf
„A" traf den Griff und schaltete die Raste weiter, statt die Route zu wechseln.
Sie wächst deshalb nach oben über den Blattrand hinaus.

**Berechnete Routen bleiben liegen.** Eine neue Route ersetzt die vorige nicht,
sondern legt sich dazu: die abgelegten gestrichelt und grau, die ausgewählte
kräftig. Kennzahlen, Analyse, Teilen und Speichern beziehen sich immer auf die
**ausgewählte**. Das ist der Kern des Vergleichs — ein Profil zeigt seine
Wirkung erst im Vergleich.

| Regel | Grund |
|---|---|
| Reiter tragen nur `A`, `B`, `C` | Mit Profilname und Kilometern wird die Zeile bei drei Varianten breiter als der Bildschirm |
| Reiter erscheinen erst ab zwei Routen | Bei einer gäbe es nichts auszuwählen |
| Der Vergleich steht als **Differenz** unter den Kennzahlen | Zwei vollständige Zahlensätze nebeneinander muss man im Kopf verrechnen |
| Bezug ist die **zuletzt ausgewählte** Route | Wer von B nach C springt, will den Unterschied zu B sehen |
| Ein Profilwechsel wirft den Stapel **nicht** weg | Dasselbe mit einem anderen Profil zu rechnen ist der Zweck |
| Ein geänderter Wegpunkt wirft den **ganzen** Stapel weg | Keine der Routen passt dann noch zur Frage |
| Höchstens sechs Routen | Mehr kann man nicht nebeneinander beurteilen, und die Karte wächst zu |
| Aufräumen sitzt **unten bei der Route**, nicht in der Werkzeugleiste | Die Leiste trägt Kartenwerkzeuge, hier geht es um Rechenergebnisse |

**Das Höhenprofil lässt sich anfahren.** Ein Finger auf dem Profil setzt einen
Punkt auf die Karte, mit Kilometerstand und Höhe. Genau dafür gibt es die halbe
Raste. Die Zuordnung läuft über die **aufsummierte Distanz**, nicht über den
Index der Stützstellen: BRouter liefert dichte Punkte in Kurven und dünne auf
der Geraden.

**Die Statuszeile zeigt nur, was man nicht ohnehin sieht.** Sie steht, solange
keine Route da ist, und immer bei Fehlern oder während gerechnet wird. „Route B
berechnet." neben den Kennzahlen von Route B wäre gedoppelt. Sie bleibt aber der
einzige Ort, an dem der Zustand **stehen** bleibt — eine Einblendung ist nach
drei Sekunden weg.

**Jede ausgelöste Aktion wird kurz eingeblendet.** Modus gewechselt, Punkt
gesetzt, Profil gewählt, Tour gespeichert — eine kurze Einblendung am unteren
Rand sagt, was passiert ist. Ohne sie ist auf einer Karte nicht zu erraten, was
ein Symbol bewirkt hat.

**Einblendung und Statuszeile haben verschiedene Aufgaben.** Die Einblendung
über der Karte quittiert die **Geste** und verschwindet wieder; die Statuszeile
im Blatt trägt den **Zustand** der Route und bleibt stehen. Wandert die Quittung
in die Statuszeile, steht beides doppelt da — und die Quittung landet ausgerechnet
dort, wo man beim Tippen auf die Karte nicht hinsieht. Genau so war es am
18.08.2026 gebaut. Daraus folgt auch die Wortwahl: „Wegpunkt 3 gesetzt."
gehört in die Einblendung, „3 Punkte — bereit zum Berechnen." in die Statuszeile.

**Nach der Berechnung fährt das Blatt in die volle Raste.** Sonst bleibt die
Analyse hinter einem schmalen Griff verborgen und es sieht aus, als sei außer
der Linie nichts passiert.

**Der Griff ist anzufassen, nicht nur anzutippen.** 44 px Trefferfläche wie bei
jedem anderen Bedienelement, und Ziehen führt das Blatt der Hand nach. Ein Blatt,
das nur auf Antippen weiterschaltet, wirkt am Telefon kaputt: Man zieht, und
nichts folgt. Am 18.08.2026 war der Griff 16,5 px hoch — daran allein scheiterte
das Auf- und Zuziehen.

**In der kleinen Raste ist das Blatt starr.** Ließe sich darin scrollen, käme man
ohne die Rasten an denselben Inhalt — und die Rasten wirkten willkürlich.

**Die Nennung der Datenquellen sitzt auf der Karte, nicht im Blatt.** Ein
antippbares „©" unten links, das die volle Zeile aufklappt, dazu dieselbe Zeile
im Menü. OpenStreetMap verlangt eine sichtbare Nennung, erlaubt auf kleinen
Displays aber, sie hinter ein Zeichen zu legen. Im Blatt stand sie am 18.08.2026
direkt unter *Route berechnen*, sobald keine Analyse da war — und nahm dort den
meisten Platz ein.

**Ebenen stapeln sich nach Aufrufreihenfolge, nicht nach Position im Markup.**
Bei gleichem `z-index` gewinnt sonst das später im Dokument stehende Element —
und eine Ebene verdeckt eine andere, die eigentlich obenauf gehört. Genau das ist
am 18.08.2026 passiert: Die Profilliste lag über dem Baukasten.

**Die Karte braucht einen eigenen `z-index`.** Leaflet vergibt seinen internen
Ebenen `z-index: 400` bis `700`. Bekommt der Kartencontainer selbst keinen Wert,
bildet er keinen Stapelkontext — dann konkurrieren diese 400er direkt mit der
Bedienung darüber und verdecken sie **vollständig**. Am 18.08.2026 genau so
passiert: Die gesamte Bedienung war unsichtbar, aber weiter anklickbar, weil
Leaflets Kachelebene `pointer-events: none` trägt. Ein Fehler, den man beim
Klicken nicht bemerkt, sondern nur im Bild.

**Wo eine Klasse `display` setzt, wirkt das Attribut `hidden` nicht.** Das
Browser-Stylesheet gibt `[hidden]` nur eine schwache Regel mit; jede
Klassenregel schlägt sie. Deshalb steht im Stylesheet einmalig
`[hidden]{display:none !important;}`.

**Der Startausschnitt kommt nicht aus dem Nichts, aber auch nicht von einem
fremden Dienst.** Drei Stufen: der zuletzt betrachtete Ausschnitt, sonst die
Zeitzone des Geräts (`Intl` kennt sie ohne Netzwerkzugriff), sonst Mitteleuropa.
IP-Geolokalisierung ist ausgeschlossen — sie bräuchte einen fremden Dienst, dem
bei jedem Start die eigene Adresse mitgeteilt würde, und wäre nicht genauer.

**Der Kartenausschnitt muss die Überlagerungen kennen.** Ein gleichmäßiger Rand
bei `fitBounds` schiebt Start und Ziel unter das Blatt — man sähe seine eigene
Route nicht ganz. Oben und unten wird deshalb so viel Rand gegeben, wie
tatsächlich verdeckt ist.

**Auf einer Ebene ist immer nur ein Fenster offen.** Öffnet man ein zweites
Blatt, schließt das erste. Beide sitzen am unteren Rand; offen übereinander
ergäben sie einen Stapel, bei dem nicht mehr erkennbar ist, was wozu gehört.

**Das Routenblatt fährt zurück, wenn eine Ebene darüber aufgeht.** Es gehört zur
Grundebene und beansprucht in der vollen Raste fast den ganzen Bildschirm. Wird
darüber ein Blatt geöffnet, geht es auf die kleinste Raste — statt um denselben
Platz am unteren Rand zu streiten.

**Beide Farbschemata.** Hell und dunkel sind gleichwertig gestaltet, gesteuert
über die Einstellung des Geräts.

## Nicht-Ziele

Diese Punkte sind bewusst ausgeschlossen. Nicht implementieren, auch nicht
"schon mal vorbereiten":

- Keine Turn-by-turn-Navigation, keine Sprachansagen
- Keine Hintergrund-Standortverfolgung (auf iOS im Browser ohnehin nicht möglich)
- Kein Aufzeichnen von Fahrten, keine Statistiken, keine Trainingsauswertung
- Kein Benutzerkonto, kein Login, keine Server-seitige Datenhaltung
- Keine Komoot-/Strava-Integration (dafür gibt es keine offene Schreib-API)
- Keine Offline-Routenberechnung (BRouter ist Java, kein Port verfügbar)
- Keine Social-Features, kein Teilen von Routen mit anderen Nutzern

## Auf dem iPhone verifiziert (14.08.2026) — nicht anfassen

Diese Punkte sind am echten Gerät geprüft und funktionieren. Sie sind **kein
Umbaugebiet**, auch nicht für naheliegende Verbesserungen:

- Installation über "Zum Home-Bildschirm", Kaltstart ohne Safari-UI
- Trefferflächen der Marker (44 px) reichen in der Praxis
- Routenberechnung, Distanz- und Höhenmeterangabe
- **Der Teilen-Pfad in ganzer Länge.** Das Share-Sheet zeigt die Datei korrekt
  als "GPS Exchange Format (GPX)" mit passender Größe, der Inhalt ist gültiges
  GPX von BRouter 1.7.9, die Werte im GPX-Header stimmen mit der Anzeige
  überein. Ein Tap genügt; die befürchtete verfallende Nutzergeste tritt
  nicht ein.

  **Nachtrag 19.08.2026:** Die Datei kommt seit dem Umbau nicht mehr vom
  Server, sondern entsteht im Gerät. Am Mechanismus — Datei-Objekt,
  Nutzergeste, `navigator.share` — ändert das nichts; er wird sogar sicherer,
  weil zwischen Tap und Aufruf kein `await` mehr liegt. Byte-Gleichheit mit der
  Serverantwort ist gegen drei Strecken belegt und im Browser bis in die
  fertige `File` geprüft. **Am iPhone selbst ist der neue Weg noch nicht
  gelaufen** — bis dahin gilt der Punkt nur für den Mechanismus, nicht für die
  Herkunft der Bytes.

### Warnung: OsmAnd fehlt im Share-Sheet — das ist kein Fehler

OsmAnd registriert sich auf iOS **nicht als Share-Ziel**, sondern nur als
Dokument-Handler. Der funktionierende Weg ist "In Dateien sichern" und dann in
der Dateien-App "Öffnen mit".

Das liegt an OsmAnd, nicht an dieser App. **Am Teilen-Pfad deshalb nichts
ändern — auch nicht "verbessern".** Jeder Umbau, der OsmAnd ins Share-Sheet
holen soll, ist verlorene Zeit und gefährdet einen Pfad, der nachweislich
funktioniert.

## Technische Rahmenbedingungen

- **Vanilla JavaScript, kein Framework.** Kein React, kein Vue, kein Svelte.
- **Kein Build-Prozess.** Kein npm, kein Vite, kein Bundler. Die Dateien, die im
  Repo liegen, sind exakt die Dateien, die ausgeliefert werden.
- **Leaflet** für die Karte, per CDN eingebunden.
- **So wenige Dateien wie möglich.** Richtwert: `index.html`, `app.js`,
  `style.css`, `manifest.json`, `sw.js`. Nur aufteilen, wenn eine Datei
  unübersichtlich wird. Dazugekommen sind `params.js` (reine Datenhaltung: der
  Parameterkatalog) und `basis/` mit den unveränderten Profiltexten von
  BRouter — siehe unten beim Baukasten.
- Kartenkacheln von OpenStreetMap. Attribution korrekt einbinden.
- Zielbrowser ist **Safari auf iOS**. Layout für schmale Displays, Bedienelemente
  fingertauglich (Mindestgröße 44 px), Safe Areas beachten.
- Speicherung im `localStorage`. Beachten: iOS räumt Web-Speicher unter Umständen
  weg. Deshalb muss es eine Export-Funktion für das gesamte Archiv geben.

## BRouter-API

Ein einzelner GET-Request, keine Authentifizierung, kein API-Key:

```
https://brouter.de/brouter
  ?lonlats=<lon>,<lat>|<lon>,<lat>|...
  &profile=<profilname>
  &alternativeidx=0
  &format=geojson
```

- Koordinatenreihenfolge ist **lon,lat** (nicht lat,lon — häufige Fehlerquelle)
- `format=geojson` zum Anzeigen. `format=gpx` **benutzt die App nicht mehr** —
  das GPX entsteht aus derselben Antwort im Gerät (siehe oben, „Eine Tour
  speichert die Route selbst")
- Nogo-Bereiche über den Parameter `nogos=<lon>,<lat>,<radius_in_metern>`,
  mehrere durch `|` getrennt

### Fehlerantworten: am Body unterscheiden, nicht am Statuscode

Beobachtet am 14.08.2026. BRouter trennt seine Fehlerfälle **nicht** über den
HTTP-Status — die drei häufigen Fälle kommen alle als `400` mit einem
`text/plain`-Body. Wer nach Status verzweigt, gibt zwangsläufig falsche
Meldungen aus:

| Body | Bedeutung |
|---|---|
| `no track found at pass=0` | Ein Wegpunkt liegt zu weit von einer erfassten Straße entfernt |
| `datafile <name>.rd5 not found` | Punkt außerhalb der abgedeckten Region |
| `to-position not mapped in existing datafile` | dasselbe, andere Schreibweise — auch `from-position` |
| `operation killed by thread-priority-watchdog after N seconds` | N > 0: Server bricht ab, meist zu weite Distanz |
| `operation killed by thread-priority-watchdog after 0 seconds` | **N = 0 ist etwas anderes:** gedrosselt, nicht gerechnet |
| `Please, retry later!` (kommt als **HTTP 403**) | Mengenbegrenzung — zu viele Anfragen in kurzer Zeit |

**Die Sekundenzahl im Watchdog-Text trennt zwei Sachverhalte.** `after 0
seconds` heißt, dass der Server gar nicht erst gerechnet hat — er drosselt,
weil kurz zuvor schon eine Anfrage von derselben Adresse lief. Gemessen am
18.08.2026: dieselbe Anfrage lief zehn Sekunden später fehlerfrei durch, und
über `curl` parallel ohnehin. Wer hier „die Punkte liegen zu weit auseinander"
ausgibt, schickt den Nutzer seine Wegpunkte umbauen, obwohl nichts an ihnen
falsch ist.

**Auf Teilzeichenketten prüfen, nicht auf ganze Sätze.** Für „außerhalb der
Region" gibt es mindestens zwei Formulierungen, und sie teilen sich nur das Wort
`datafile`. Wer auf `datafile` **und** `not found` prüft, übersieht die zweite und
gibt eine nichtssagende Meldung aus. Gefunden am 18.08.2026 beim Testen.

**Die Mengenbegrenzung ist ein eigener Fall.** Gemessen am 19.08.2026: Nach rund
30 Anfragen in kurzer Folge antwortet der Server auf jede weitere mit `403` und
`Please, retry later!`; nach etwa einer Minute läuft es wieder. Das ist nicht der
Watchdog — der kommt als `400`, wenn sich zwei Anfragen überschneiden. Wer beides
zusammenwirft, schickt den Nutzer beim einen Fall warten und beim anderen seine
Wegpunkte umbauen. Wichtig für alles, was mehrere Routen auf einmal rechnen will.

Der Body kann auch leer sein — dann bleibt nur eine generische Meldung. Das
trifft auch auf **HTTP 500 mit leerem Body** zu, den es mindestens in zwei
Varianten gibt: ein ungültig geschriebener Profilparameter (siehe unten) und
eine unbekannte Profil-ID. Beide sind an der Antwort nicht auseinanderzuhalten.
Fehlerantworten tragen die CORS-Header ebenfalls, der Text ist im Browser also
lesbar.

### Profile

Standardprofil ist `fastbike-lowtraffic`. Es entspricht den Prioritäten des
Nutzers am besten: bleibt auf Asphalt, bestraft aber Haupt- und Bundesstraßen
deutlich.

Auswählbar sein sollen:

| Profil | Verhalten |
|---|---|
| `fastbike` | Asphalt, schnell, nimmt Hauptstraßen gern mit |
| `fastbike-lowtraffic` | **Standard** — wie oben, aber Hauptstraßen bestraft |
| `fastbike-verylowtraffic` | nochmal verkehrsscheuer |
| `trekking` | Allrounder, toleriert unbefestigte Wege |

Achtung, gemessen am 18.08.2026: Die drei `fastbike`-Zeilen sind **kein**
Beleg für drei verschiedene Profile. `fastbike-lowtraffic` ist nachweislich
`fastbike` mit einem anderen Wert für `consider_traffic`. Nur
`fastbike-verylowtraffic` ist tatsächlich eine eigene Datei. Siehe `BROUTER.md`,
Abschnitt „Belegte Gleichungen zwischen den Serverprofilen" — das ist für den
Entwurf des Profil-Editors wesentlich.

Der öffentliche BRouter-Server läuft auf gespendeter Infrastruktur (FOSSGIS).
Keine unnötigen Anfragen, kein automatisches Neuberechnen bei jeder
Mausbewegung — erst auf Aktion des Nutzers.

### Profilparameter direkt im Request — kein Upload nötig

Belegt am 18.08.2026, im Quellcode des Servers dokumentiert (`ServerHandler.java`).
Jeder Parameter eines Profils lässt sich im normalen GET überschreiben:

```
...&profile=fastbike&profile:consider_traffic=1.0
```

Damit bleibt die Serverlast bei **einer Anfrage pro Berechnung**. Geprüft und
funktionierend zusammen mit `format=gpx` und mit `nogos`.

Nachgewiesen: `profile=fastbike&profile:consider_traffic=1.0` liefert exakt
dasselbe Ergebnis wie das Serverprofil `fastbike-lowtraffic` — in Länge, Kosten
und Höhenmetern gleichzeitig.

**Zwingende Regel: Wahrheitswerte als `1` und `0` senden, niemals als `true`
oder `false`.**

| Schreibweise | Ergebnis |
|---|---|
| `profile:consider_town=1` / `=0` | funktioniert |
| `profile:consider_town=true` / `=false` | **HTTP 500, leerer Body** |
| `profile:unbekannterName=1` | wird still ignoriert, kein Fehler |

`true` und `false` kippen den Server mit einer Antwort, die von anderen Fehlern
nicht unterscheidbar ist — eine Falle, die ohne diese Notiz garantiert ein
zweites Mal zuschlägt. Dass unbekannte Parameternamen **still** ignoriert werden,
ist die zweite Hälfte der Falle: Ein Tippfehler im Parameternamen fällt nicht auf,
die Route wird einfach ohne ihn berechnet.

**Für die Anzeigeberechnung setzt die App `profile:processUnusedTags=1`.** Ohne
das liefert BRouter nur die Tags, die das Profil auch auswertet — `maxspeed`
gehört nicht dazu. Die Auswertung der Tempolimits bliebe dann dauerhaft leer,
ohne dass es auffiele. Der Schalter steht seit dem 19.08.2026 bei **jeder**
Anfrage — seit das GPX im Gerät entsteht, gibt es keine zweite Art von Anfrage
mehr, bei der man ihn weglassen könnte.

Was dieser Weg **nicht** kann: neue Regeln einführen. Ein `.brf`-Profil ist ein
Programm, keine Werteliste — Details in `BROUTER.md`. Wer etwa `maxspeed`
gewichten will, braucht den Upload-Weg (`POST /brouter/profile`), ebenfalls dort
beschrieben.

## Deployment

GitHub Pages, Branch `main`, Verzeichnis `/` (root). HTTPS ist über `*.github.io`
automatisch vorhanden und Voraussetzung für Service Worker und Installierbarkeit.
Das Repo muss dafür öffentlich sein.

- Repo: `github.com/dleitz-projects/bikeRouterIOS`
- Seite: `https://dleitz-projects.github.io/bikeRouterIOS/`

Die Seite liegt unter einem **Unterpfad**, nicht auf der Domain-Wurzel. Deshalb
müssen alle Pfade relativ bleiben (`./` in `manifest.json` für `start_url` und
`scope`, kein führender `/` bei Skripten, Styles, Icons und der
Service-Worker-Registrierung). Ein absoluter Pfad würde lokal funktionieren und
erst auf Pages brechen.

Nach jeder Änderung `CACHE` in `sw.js` hochzählen, sonst liefert der Service
Worker weiter die alte Version aus.

Damit ein Deployment überhaupt ankommt, gilt zusätzlich:

- Das **Navigationsdokument wird network-first** ausgeliefert, der Cache dient
  nur als Offline-Rückfall. Käme die `index.html` aus dem Cache, würde eine
  alte Version ihre eigene alte `app.js` laden, damit den alten Service Worker
  erneut registrieren — und das Update erreicht das Gerät nie.
- Registrierung mit `updateViaCache: 'none'`, damit das Worker-Skript nicht aus
  dem HTTP-Cache kommt.

Alle übrigen Dateien laufen weiter stale-while-revalidate.

**Henne-Ei beim Umstieg:** Eine Korrektur am Service Worker kann auf das
Deployment, das sie ausliefert, noch nicht wirken — in Kontrolle ist ja noch
der alte Worker mit seiner alten Logik. Ein Gerät, das die vorige Version
installiert hat, braucht deshalb einmalig **zwei Aufrufe**: der erste holt im
Hintergrund die neuen Dateien, der zweite zeigt sie. Ab dann greift
network-first und ein Deployment ist beim ersten Aufruf da. Gemessen am
15.08.2026 beim Wechsel von `routenplaner-v1` auf `bikerouterios-v2`.

## Geklärte Architekturentscheidung: CORS → Variante A

**Getestet am 14.08.2026.** `brouter.de` sendet
`Access-Control-Allow-Origin: *` — also für jede fremde Domain.

Damit gilt **Variante A: rein statische PWA mit direktem `fetch` aus dem
Browser.** Kein Proxy, kein eigener Container, kein Server-Code.

Seit dem Deployment zusätzlich in der Praxis bestätigt: Die Berechnung läuft
im Browser von `https://dleitz-projects.github.io` aus, also von einer echten
fremden Origin. Der curl-Test war damit korrekt.

Belegt für alle drei relevanten Aufrufvarianten (jeweils `HTTP 200` und
`Access-Control-Allow-Origin: *`, gesendet mit `Origin: https://example.github.io`):

- `format=geojson`
- `format=gpx`
- zusätzlich mit `nogos=<lon>,<lat>,<radius>`

Weitere Beobachtungen:

- Der Request ist ein CORS-*simple request* (GET, keine eigenen Header) — es
  gibt also keinen Preflight, der separat scheitern könnte. Deshalb beim `fetch`
  **keine eigenen Header setzen** (kein `Accept`, kein `Content-Type`), sonst
  wird daraus ein Preflight-pflichtiger Request.
- Der Content-Type der GeoJSON-Antwort ist `application/vnd.geo+json`, **nicht**
  `application/json`. `response.json()` ist das egal, aber eine Bibliothek, die
  den Content-Type auswertet, kann darüber stolpern.
- Die Antwort trägt `Content-Disposition: attachment` — für `fetch` irrelevant,
  nur beim direkten Aufruf im Browser würde die Datei heruntergeladen.
- `bikerouter.de/brouter` antwortet mit `404`; das ist ein reines Web-Frontend
  und keine API unter diesem Pfad. Als Fallback nicht nötig und nicht vorgesehen.

### Plan B, falls die CORS-Header verschwinden

`Access-Control-Allow-Origin: *` ist die freundliche Konfiguration eines
fremden, gespendeten Servers (FOSSGIS) — keine Zusage. Fällt sie weg, ist der
Ausweg der **selbstgehostete BRouter-Container**, nicht ein Proxy: Ein Proxy
würde die Last weiterhin auf die gespendete Infrastruktur legen und nur die
Browser-Regel umgehen. Der Container braucht zusätzlich die Routing-Segmente
für die befahrene Region.

Einstiegspunkt für die Recherche: `github.com/abrensch/brouter`, README,
Abschnitt Docker. Bewusst kein Image-Name, kein Tag, keine Segment-URL hier —
die ändern sich, das Repo bleibt. Dort steht die jeweils aktuelle Wahrheit.

## Offene Punkte

### Snapping der Wegpunkte auf die nächste Straße — offen, nicht bauen

Wenn ein Wegpunkt zu weit von einer erfassten Straße liegt, meldet BRouter
`no track found at pass=0`. Die App erklärt das und hebt die Punkte hervor,
verschiebt sie aber **nicht** automatisch.

Automatisches Snapping bräuchte einen **zweiten externen Dienst** (Nominatim,
Overpass oder einen Map-Matching-Dienst) — also eine neue Abhängigkeit, eine
zweite Fehlerquelle und zusätzliche Last auf fremder Infrastruktur. Das ist
eine Architekturentscheidung, die der Nutzer separat trifft. Bis dahin: nicht
implementieren, auch nicht vorbereiten.

### Dieselbe Entscheidung betrifft auch die Tourennamen

Ein Tourenname, der automatisch entsteht — „Goslar → Bad Harzburg" statt
„18.08.2026 · 43,5 km" — bräuchte **denselben zweiten Dienst**: Aus Koordinaten
Ortsnamen zu machen ist umgekehrte Geokodierung, also Nominatim oder
gleichwertig.

Seit dem 18.08.2026 kommt eine dritte Anwendung dazu: eine **Ortssuche**
(„Bad Harzburg" eintippen, Karte springt hin) ist Geokodierung in der anderen
Richtung — derselbe Dienst, dieselbe Entscheidung. Siehe `IDEEN.md`, Idee 10.

Das ist wichtig für die Bewertung: Es sind **nicht drei kleine Wünsche**, sondern
drei Anwendungen derselben einen Entscheidung. Fällt sie einmal, sind alle
möglich; fällt sie nicht, ist keine davon machbar. Wer den Aufwand abwägt,
sollte deshalb alle Seiten zusammen betrachten — und mögliche weitere
Anwendungen, die sich daraus ergeben.

Bis dahin gilt: Der Tourenname wird beim Speichern aus Datum und Distanz
vorgeschlagen und vom Nutzer geändert.

## Arbeitsweise

- In Meilensteinen arbeiten. Keine Features aus späteren Runden vorwegnehmen,
  auch wenn sie naheliegen.
- Bei Unklarheiten nachfragen statt raten.
- Nach jedem Meilenstein: kurz zusammenfassen, was funktioniert und was noch
  offen ist.
