# Darstellung auf echten Geräten

`CLAUDE.md`, Abschnitt „Gestaltung", sagt, wie die Oberfläche aussehen **soll**.
Diese Datei sagt, was das Gerät daraus **macht**. Beides auseinanderzuhalten ist
kein Ordnungsfimmel: Fast jeder Darstellungsfehler in diesem Projekt entstand
daran, dass eine Zahl im Browser am Schreibtisch stimmte und auf dem iPhone
nicht — Notch, Dynamic Island, Home-Indikator und die installierte App als
eigener Betriebszustand kommen dort schlicht nicht vor.

Langfristiges Ziel ist, dass die App auf **jedem** Bildschirm sitzt. Der Weg
dahin ist nicht, für jedes Gerät eine Ausnahme zu schreiben, sondern jede
Größe zu **messen**, statt sie zu setzen. Wo hier trotzdem konkrete Zahlen
stehen, sind sie Belege — keine Konstanten im Code.

**Stand: 19.08.2026. Geprüft ist genau ein Gerät.** Alles, was darüber
hinausgeht, ist unten als offen ausgewiesen.

## Das Verfahren

Der einzige ehrliche Zeuge ist ein Screenshot vom Gerät. Der Blick darauf
genügt aber nicht: „unten ist ein grauer Balken" führt zu Vermutungen, „der
Balken ist 186 Bildpunkte hoch und trägt exakt `--ground`" führt zur Ursache.

```
python3 werkzeuge/bildmass.py spalte bild.png [x]     # Farbwechsel von oben nach unten
python3 werkzeuge/bildmass.py zeile  bild.png [y]     # Farbwechsel von links nach rechts
python3 werkzeuge/bildmass.py punkt  bild.png x y     # ein einzelner Farbwert
```

Ausgegeben werden Bildpunkt, umgerechnetes CSS-Pixel, Höhe des Bandes und der
Name der Farbe aus `style.css`. Drei Dinge machen das Werkzeug brauchbar:

**Erst den Maßstab prüfen, dann alles andere.** Der Umrechnungsfaktor (`--dpr`,
Vorgabe 3) ist eine Annahme, und eine falsche Annahme macht jede folgende Zahl
wertlos. Er ist aber nachprüfbar: Eine Zeile durch die Zoomknöpfe gelegt muss
die linke Kante bei **13,0** CSS-Pixeln finden, denn im Stylesheet steht
`left:13px`.

```
$ python3 werkzeuge/bildmass.py zeile bild.png 1990
x    39–41       13.0–13.7   css    3 px  #E4E6DA  --line-soft (hell)
x    42–92       14.0–30.7   css   51 px  #FFFFFF  --raised (hell)
```

**Die Farbe verrät die Schicht.** `--ground` ist die Karte, `--sheet` ist ein
Blatt, `--raised` ein Bedienelement. Ein Streifen in `--ground` an einer
Stelle, an der ein Blatt sein müsste, benennt den Fehler bereits.

**Kein Auge im Spiel.** Wer misst statt zu schätzen, bekommt 62 statt „ungefähr
50 bis 70" — und 62 war die Zahl, an der die Ursache hing.

## Geräte

| Gerät | Bildschirm | dpr | Systemstreifen oben | unten | geprüft |
|---|---|---|---|---|---|
| iPhone 16 Pro Max, installiert | 440 × 956 | 3 | 62 px | 34 px | 19.08.2026 |
| iPhone 16 Pro Max, Safari-Tab | 440 × 956 | 3 | — | — | offen |
| kleinere iPhones (ohne Insel) | — | — | — | — | offen |
| iPad | — | — | — | — | offen |
| Schreibtisch-Browser | beliebig | 1–2 | 0 | 0 | laufend |

Kommt ein Gerät dazu: einen Screenshot in jedem der vier Blattzustände machen,
mit `bildmass.py` die Ränder nachmessen und die Zeile hier ergänzen — auch wenn
alles passt. Ein leerer Eintrag heißt „nie angesehen", nicht „in Ordnung".

## Gemessen am 19.08.2026 (iPhone 16 Pro Max, installierte App)

| Größe | Wert | woher |
|---|---|---|
| Bildschirm | 440 × 956 CSS-Pixel | Screenshot 1320 × 2868 bei dpr 3 |
| `env(safe-area-inset-top)` | 62 px | Oberkante der Profilpille bei 74 px, abzüglich der 12 px Innenabstand aus `.chrome` |
| `env(safe-area-inset-bottom)` | 34 px | Innenabstand unter dem Rechnen-Knopf |
| Fensterhöhe | 894 px | Unterkante des Blattes, das mit `bottom:0` sitzt |
| Ursprung der Seite | 0 | oberste Bildpunktzeile trägt Kartenfarbe, nicht Systemfarbe |
| Blatt, leerer Zustand | 117 px | gemessen, nicht gesetzt |

Daraus die eine Zahl, um die es geht: **956 − 894 = 62 = der obere
Systemstreifen.** Die App wird über die volle Bildschirmhöhe gezeichnet und
beginnt am obersten Punkt, das Layout rechnet aber ohne den oberen Streifen.
Unten fehlt deshalb genau so viel, wie oben zusätzlich da ist.

**Gemessen ist das. Die Erklärung ist eine Vermutung:** `viewport-fit=cover`
zusammen mit `apple-mobile-web-app-status-bar-style: black-translucent`. Dass
`env(safe-area-inset-top)` überhaupt 62 meldet, belegt, dass `cover` wirkt —
ohne `cover` wäre der Wert null. Mehr ist nicht belegt.

Die Vermutung wird seit dem 19.08.2026, 17:20 Uhr, geprüft: `black-translucent`
ist gestrichen. Der Preis wäre womöglich die randlose Karte am oberen Rand
gewesen — dass er zu hoch sei, war eine Fehleinschätzung. Die 62 px waren
ohnehin nicht nutzbar, und der Versuch, sie von innen zu füllen, hat mehr
kaputt gemacht als der Fehler selbst (Falle 8).

## Die Fallen

Jede davon ist am Gerät aufgelaufen, keine im Browser aufgefallen. In
Klammern, was allgemein daraus folgt.

**1. Die Bedienung war unsichtbar, aber anklickbar** (18.08.). Leaflet vergibt
seinen Ebenen intern `z-index` 400 bis 700. Ohne eigenen `z-index` bildet der
Kartencontainer keinen Stapelkontext, und diese 400er konkurrieren direkt mit
der Bedienung darüber. Anklickbar blieb sie, weil Leaflets Kachelebene
`pointer-events:none` trägt. *(Ein Fehler, den man beim Klicken nicht bemerkt,
sondern nur im Bild — das ist genau die Sorte, für die es die Sichtkontrolle
gibt.)*

**2. `hidden` wirkte nicht** (18.08.). Das Browser-Stylesheet gibt `[hidden]`
nur eine schwache Regel; jede Klassenregel mit `display` schlägt sie. Seitdem
steht einmalig `[hidden]{display:none !important;}` im Stylesheet.

**3. Eine Ebene lag über der falschen** (18.08.). Bei gleichem `z-index`
gewinnt das später im Dokument stehende Element. Ebenen bekommen ihren Wert
deshalb beim Öffnen, aufsteigend.

**4. Das Blatt ließ sich nicht aufziehen** (18.08.). Der Griff war 16,5 px
hoch. *(Trefferflächen sind 44 px, ohne Ausnahme — auch bei etwas, das kein
Knopf ist.)*

**5. Ein Tap auf „A" schaltete die Raste weiter** (18.08.). Die auf 44 px
vergrößerte Fläche des Griffs lag über der Reiterzeile. *(Unsichtbare
Trefferflächen dürfen nur über toten Raum wachsen — hier nach oben aus dem
Blatt heraus statt nach unten hinein.)*

**6. Aus der vollen Raste kam man nicht heraus** (19.08.). Der Kartenstreifen
über dem Blatt war 44 px hoch, begann aber am obersten Bildschirmpunkt — der
Griff saß damit unter der Dynamic Island, die den Tap für sich nimmt. Der
Streifen ist seitdem 44 px **plus** `safe-area-inset-top`. *(Was am oberen Rand
angefasst werden muss, wird gegen den Systemstreifen gerechnet, nicht gegen die
Fensterhöhe. Auf Geräten ohne Insel ist der Zuschlag null, dort ändert sich
nichts — so muss jede Geräteanpassung aussehen.)*

**7. Ein leerer Streifen im Blatt, unter dem Rechnen-Knopf** (19.08., ~51 px).
`padding-bottom: calc(env(safe-area-inset-bottom) + 17px)` — auf einem Gerät
mit Home-Indikator meldet `env()` bereits 34 px, die 17 kamen obendrauf. Jetzt
`max(env(safe-area-inset-bottom), 17px)`. *(Der eine Abstand ersetzt den
anderen, sie addieren sich nicht. Es gibt keinen Fall, in dem beide zusammen
nötig wären.)*

**8. Ein grauer Streifen unter dem Blatt** (19.08., 62 px). Nicht derselbe
Fehler wie 7, obwohl er an derselben Stelle aussieht: Der Streifen liegt
**außerhalb** des Blattes und trägt `--ground` statt `--sheet`. Ursache ist die
Differenz zwischen Bildschirm und Fenster, siehe oben.

**Erster Versuch, und er ging schief.** Der Rahmen (`.app`) wurde um die
gemessene Differenz über das Fenster hinaus gezogen — in der Annahme, iOS
zeichne dort Inhalt, weil es dort schon die Hintergrundfarbe malt. Am Gerät
nachgemessen: **tut es nicht.** Safari schneidet am Fensterrand ab. Der
Streifen blieb, und nun lag die Unterkante des Blattes darin: Analysekarten
angeschnitten, das ganze Blatt 62 px zu tief. Belegt an neun Screenshots vom
19.08.2026, 17:09 — in jedem endet der Inhalt bei **893,7** und darunter steht
Leinwand:

```
y  2624–2626    874.7–875.3  css    3 px  #E3E6DA  --line-soft (hell)
y  2627–2681    875.7–893.7  css   55 px  #FFFFFF  --raised (hell)
y  2682–2867    894.0–955.7  css  186 px  #F7F8F3  --sheet (hell)
```

*(Die Regel daraus: Ein zu kleines Fenster ist an seiner Ursache zu beheben,
nicht durch Übergröße im Inneren. Und: Dass das System eine Fläche **färbt**,
heißt nicht, dass die Seite darauf **zeichnen** darf.)*

**Was geblieben ist:** die Leinwand in `--sheet` statt `--ground`. Was das
System außerhalb des Fensters streicht, sitzt immer unter einem Blatt —
Routenblatt, Menü oder Vollbild-Ebene, alle drei in derselben Farbe. Der
Streifen ist damit nicht mehr von der Unterkante des Blattes zu unterscheiden,
auch wenn er weiterhin da ist.

**Was danach kam:** `apple-mobile-web-app-status-bar-style: black-translucent`
ist gestrichen. Das ist der Griff an die Ursache statt an die Wirkung.
`viewport-fit=cover` bleibt. Am Gerät noch nicht bestätigt — siehe „Offen".

**9. Das „©" schob sich im Vollbild auf die Profilpille** (19.08.). Alles, was
über dem Blatt schwebt — Werkzeugleiste, Zoom, Nennung der Datenquellen —,
verschwindet, sobald der Streifen Karte zu schmal wird. Die Schwelle rechnete
aber gegen den **ganzen** Streifen statt gegen den nutzbaren und kam damit auf
genau 92, während sie erst unter 92 abschnitt. Ein Gleichstand auf die Stelle,
den es auf einem Gerät mit anderem Systemstreifen nie gegeben hätte.

Neu gilt: gemessen wird gegen den Streifen **ohne** den oberen Systembereich,
jedes Element an **seiner eigenen Höhe**, und es braucht nach oben dieselbe
Luft, die es nach unten hat. Damit fällt der Vollbild-Fall von selbst richtig
heraus — der Streifen ist 44 px, das kleinste Element 30 px, und 30 + 14 + 14
passt nicht hinein. Auf jedem Gerät, ohne eine einzige Gerätezahl im Code.
*(Feste Schwellen tragen den Systemstreifen des Geräts in sich, an dem sie
ermittelt wurden.)*

**Was die neun gemeinsam haben:** Keine war ein Schönheitsfehler. Acht von
neun machten etwas unbedienbar oder ließen die App kaputt aussehen, und keine
einzige zeigte sich im Browser am Schreibtisch.

## Prüfliste für die Sichtkontrolle

Nach jedem Deployment am Gerät durchgehen. Reihenfolge ist Absicht: Was oben
steht, hat schon einmal alles darunter verdeckt.

1. **Zweimal aufrufen**, wenn sich der Service Worker geändert hat. Der erste
   Aufruf holt, der zweite zeigt — siehe `CLAUDE.md`, Abschnitt Deployment.
2. **Ist die Bedienung überhaupt da?** Pille oben links, Menü oben rechts,
   fünf Werkzeuge rechts, Zoom und „©" links unten.
3. **Oberer Rand:** Pille und Menü stehen unter der Insel, nicht darin. Trägt
   die oberste Bildpunktzeile Kartenfarbe oder Systemfarbe? Das ist seit dem
   Streichen von `black-translucent` die entscheidende Beobachtung — sie sagt,
   welcher der beiden Ausgänge eingetreten ist (siehe „Offen").
4. **Unterer Rand:** kein andersfarbiger Streifen unter dem Blatt, in keinem
   der vier Zustände. Im Zweifel `bildmass.py spalte` darauf ansetzen — 62 px
   sieht man, 6 px nicht.
5. **Der Griff:** ziehen und tippen, aus jeder Raste heraus und besonders aus
   der vollen zurück.
6. **Die Reiter A/B/C** (ab zwei Routen): antippbar, ohne dass die Raste
   springt.
7. **Nichts abgeschnitten:** Höhenprofil, Analysekarten, letzte Zeile im Menü,
   Knöpfe in den Dialogen.
8. **Hell und dunkel**, über die Systemeinstellung umgeschaltet.
9. **Der Teilen-Pfad** bis in die Dateien-App — der Punkt, der laut
   `CLAUDE.md` verifiziert ist und es bleiben soll.

Ein Screenshot in der **vollen Raste** zeigt am meisten auf einmal: oberer
Streifen, unterer Rand, Analyse und Farbschema in einem Bild.

## Offen

- **Alle Geräte außer einem.** Vor allem eines ohne Dynamic Island: Dort ist
  `safe-area-inset-top` klein oder null, und mehrere Rechnungen oben hängen
  daran. Erwartet wird, dass sich nichts ändert; nachgesehen hat es niemand.
- **Querformat.** Das Manifest steht auf `portrait`, iOS hält sich bei
  Home-Bildschirm-Apps aber nicht zwingend daran. Im Querformat wechselt der
  Systemstreifen die Seite — die Korrektur wird bei jedem `resize` neu
  gemessen, geprüft ist das nicht.
- **iPad und Schreibtisch.** Die Oberfläche ist für schmale Displays entworfen.
  Was auf 1000 px Breite daraus wird, ist eine offene Gestaltungsfrage, kein
  Fehler.
- **Trägt das Streichen von `black-translucent`?** Der offene Punkt seit
  17:20 Uhr. Zwei Ausgänge, beide besser als der Zustand davor:
  *Fenster wird 956* — randlose Karte bleibt, 62 px gewonnen, nichts weiter zu
  tun. *Fenster bleibt 894, rückt aber unter die Statusleiste* — alles ist
  sichtbar und nichts abgeschnitten, dafür beginnt die Karte unter der
  Statusleiste statt am Bildschirmrand, und `safe-area-inset-top` meldet null.
  Am Bild zu unterscheiden: Trägt die oberste Bildpunktzeile Kartenfarbe oder
  Systemfarbe?
- **Womöglich einmal neu zum Home-Bildschirm hinzufügen.** iOS liest die
  `apple-mobile-web-app-*`-Zeilen unter Umständen beim **Anlegen** des Symbols
  und nicht bei jedem Start. Ändert sich nach zwei Aufrufen nichts, ist das
  der erste Verdacht — Symbol löschen, Seite in Safari öffnen, neu hinzufügen.

**Beantwortet am 19.08.2026:** *Zeichnet iOS unterhalb des Fensters?* **Nein.**
Die Hintergrundfarbe malt es dort, Inhalt schneidet es am Fensterrand ab. Siehe
Falle 8.
