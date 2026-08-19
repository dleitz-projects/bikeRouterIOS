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

## Das Gerät sagt seine Maße selbst

Aus einem Screenshot lässt sich alles zurückrechnen, aber nur mit dem Bild in
der Hand — und manches gar nicht: Ob `navigator.standalone` gilt, was
`screen.height` meldet, ob eine JS-Messung überhaupt gegriffen hat. Genau daran
ist am 19.08.2026 eine Korrektur still gescheitert.

Deshalb steht im **Menü unter der Nennung der Datenquellen** eine Zeile mit den
Maßen des Geräts:

```
Fenster 440×894 · Bildschirm 440×956 · fehlt 62 · System oben 62, unten 34 · dpr 3 · installiert
```

Gerechnet wird mit diesen Zahlen nicht — sie sind Beleg, kein Bedienelement.
Für ein neues Gerät ist die Zeile der erste Griff: ein Screenshot des Menüs
füllt die Gerätetabelle oben, ohne dass jemand Pixel zählt.

## Screenshots benennen

Der Ordner `Screenshot/` liegt nicht im Repo (`.gitignore`), die Namen dienen
nur der Zuordnung. **Der Originalname bleibt vorn** — er hält die Reihenfolge,
in der das Gerät die Bilder abgelegt hat. Dahinter kommt, was sich am Bild
**messen** lässt:

```
IMG_4723_varA_kopf62_unten893.PNG
IMG_4703_varB_kopf75_unten938.PNG
```

| Teil | Bedeutung | woran erkannt |
|---|---|---|
| `varA` / `varB` | mit oder ohne `black-translucent` | oberste Bildpunktzeile: Karte oder Systemfarbe |
| `kopf62` | Oberkante der Profilpille in CSS-Pixeln | trennt die Stände: 75 = vor der Kopfzeilen-Korrektur, 62 = danach |
| `unten893` | wo der Inhalt endet | die Zahl, um die es den ganzen 19.08. ging |

Alle drei sind mit `bildmass.py` reproduzierbar und **keine Vermutung** — kein
Versionsstand aus dem Gedächtnis, keine Zuordnung nach Uhrzeit. Wo eine
Vollbild-Ebene offen ist, sieht die oberste Zeile aus wie Variante B; solche
Bilder tragen `varA-ebene-offen`.

Wer will, hängt hinten noch den Befund an: `…_unten894_knopf-zu-tief.PNG`.

## Geräte

| Gerät | Bildschirm | dpr | Fenster | `inset-top` | `inset-bottom` | geprüft |
|---|---|---|---|---|---|---|
| iPhone 16 Pro Max, installiert | 440 × 956 | 3 | 894 ab y=62 | 0 | 34 px | 19.08.2026 |
| iPhone 16 Pro Max, Safari-Tab | 440 × 956 | 3 | — | — | — | offen |
| kleinere iPhones (ohne Insel) | — | — | — | — | — | offen |
| iPad | — | — | — | — | — | offen |
| Schreibtisch-Browser | beliebig | 1–2 | = Fenster | 0 | 0 | laufend |

Kommt ein Gerät dazu: einen Screenshot in jedem der vier Blattzustände machen,
mit `bildmass.py` die Ränder nachmessen und die Zeile hier ergänzen — auch wenn
alles passt. Ein leerer Eintrag heißt „nie angesehen", nicht „in Ordnung".

## Die 62 px: gemessen, verstanden, entschieden (19.08.2026)

Die Zahl, um die sich der ganze Nachmittag drehte, ist der obere
Systemstreifen des Geräts: **62 px.** Das iPhone hat 956 px, die Seite bekam
894. Der Unterschied zwischen den beiden Zuständen ist nicht, *wieviel* die
Seite bekommt — es sind beide Male 894 —, sondern **wo die 62 px liegen**.

| | mit `black-translucent` | ohne (jetzt) |
|---|---|---|
| Fenster | 894 px, **ab y = 0** | 894 px, **ab y = 62** |
| oberste Bildpunktzeile | Karte, randlos | Statusleiste in `theme-color` |
| `env(safe-area-inset-top)` | 62 px | **0** |
| unterer Rand | 62 px unerreichbar | Seite reicht bis 955,7 |
| davon für Inhalt nutzbar | 832 px | **894 px** |

**Entschieden ist die linke Spalte:** Die Karte reicht bis zur obersten
Bildpunktzeile, der Streifen liegt unten unter dem Blatt und trägt dessen Farbe.
Bezahlt wird das mit 62 px weniger Platz für Inhalt. Die rechte Spalte hätte
den Platz, dafür läge oben ein Streifen über der Karte — beides ist am Gerät
gesehen, und die Wahl fiel auf die Karte.

Was in der linken Spalte trotzdem nicht sein muss, ist der **doppelte** Rand:
Der unerreichbare Streifen leistet dasselbe wie der Innenabstand für den
Home-Indikator, und der Systemstreifen oben dasselbe wie der Innenabstand der
Kopfzeile. Beides wird jetzt abgezogen statt addiert (Falle 12), womit oben wie
unten genau 62 px stehen.

Die weiteren gemessenen Werte:

| Größe | Wert | woher |
|---|---|---|
| Bildschirm | 440 × 956 CSS-Pixel | Screenshot 1320 × 2868 bei dpr 3 |
| `env(safe-area-inset-bottom)` | 34 px | Innenabstand unter dem Rechnen-Knopf |
| Blatt, leerer Zustand | 117 px | gemessen, nicht gesetzt |
| Statusleiste | 62 px, `theme-color` | Uhrzeit steht auf der Fläche, Screenshot 17:56 |

**Der Preis, den es tatsächlich kostet:** Die Karte reicht nicht mehr bis zur
obersten Bildpunktzeile. Der Zuschlag `+ env(safe-area-inset-top)` an den
Stellen, die am oberen Rand angefasst werden, meldet auf diesem Gerät jetzt
null — die Regel bleibt trotzdem stehen, denn auf einem Gerät oder in einem
Modus, wo der Wert nicht null ist, ist sie weiterhin nötig.

## Variante B in einer Zeile

Beide Varianten unterscheiden sich in genau einer Zeile in `index.html`:

```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

| | Variante A (Zeile gesetzt) | Variante B (Zeile fehlt) |
|---|---|---|
| Karte oben | randlos bis zur obersten Bildpunktzeile | beginnt unter der Statusleiste |
| oberste Zeile | Karte | Statusleiste in `theme-color` |
| `env(safe-area-inset-top)` | 62 px | 0 |
| unterer Rand | 62 px unerreichbar, in Blattfarbe | Inhalt reicht bis 955,7 |
| Platz für Inhalt | 832 px | 894 px |

**Mehr ist nicht zu tun.** Alle Abstände rechnen gegen
`env(safe-area-inset-top)`; in Variante B meldet der null, und damit werden
alle Abzüge von selbst zu Nullen. Deshalb gibt es auch keinen zweiten Zweig im
Repo — eine Kopie, die gepflegt werden müsste, wäre teurer als der Wechsel.
Variante A ist als Tag `variante-a` gesichert (Stand v24, am Gerät geprüft).

**Nach jedem Wechsel muss das Home-Bildschirm-Symbol gelöscht und neu angelegt
werden.** iOS liest diese Zeile beim Anlegen des Symbols, nicht bei jedem
Start.

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
Routenblatt, Menü oder Vollbild-Ebene, alle drei in derselben Farbe.

**Zweiter Versuch, und er ging auch schief.** Nicht mehr ein
`position:fixed`-Rahmen, sondern ein **Dokument** in Bildschirmhöhe mit absolut
positioniertem Inhalt darin — im normalen Fluss, nicht am Rechenbereich
hängend. Am Gerät am 19.08.2026 abends geprüft: Der Streifen bleibt. Safari
schneidet auch so am Fensterrand ab.

**Damit ist die Frage endgültig beantwortet: Der sichtbare Bereich IST das
Fenster.** Dass das System darunter noch die Hintergrundfarbe malt, heißt nur,
dass es die Leinwand weiterführt — nicht, dass die Seite dort zeichnen darf.
Die 62 px sind nicht zu holen, sie sind nur zu verschieben.

**Entschieden: `black-translucent` bleibt.** Die Karte reicht bis zur obersten
Bildpunktzeile, die 62 px liegen unten unter dem Blatt und tragen dessen Farbe.
Der Preis sind 62 px weniger Platz für Inhalt. Die Gegenprobe — Zeile raus,
Streifen wandert nach oben über die Karte — ist eine Zeile weit entfernt und
in beiden Zuständen am Gerät gesehen.

**Im Querformat gibt es das Problem nicht:** Dort ist der obere Systemstreifen
null, Fenster und Bildschirm sind gleich hoch.

**Wichtig dabei:** Die Zeile wirkte erst, nachdem das Symbol vom
Home-Bildschirm **gelöscht und neu angelegt** war. Zwei Deployments und
mehrere Kaltstarts änderten gar nichts — iOS liest die
`apple-mobile-web-app-*`-Zeilen beim **Anlegen** des Symbols und nicht bei
jedem Start. Sie stecken im Symbol, nicht in der Seite; kein
Service-Worker-Update der Welt erreicht sie. *(Erkennungszeichen: Die Seite
verhält sich weiter nach einer Einstellung, die im ausgelieferten HTML gar
nicht mehr steht.)*

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

**10. Ein grauer Balken über der Karte** (19.08.). Die Folge von Falle 8: Ohne
`black-translucent` beginnt die Seite unter der Statusleiste, und iOS streicht
deren Grund mit der **`theme-color`**. Die stand auf `--ground`, der Farbe der
Karte — also lag ein 62 px hoher Streifen Kartenfarbe **über** der Karte, ohne
Karte darin. Jetzt `--sheet`, wie jede andere randlose Fläche der App auch.

*(Die Regel: `theme-color` ist keine Dekoration und keine Markenfarbe, sondern
der Grund einer Fläche, die das System für uns malt. Sie muss deshalb eine
Flächenfarbe der App sein — und mit dem Farbschema wechseln, sonst leuchtet
nachts ein heller Balken über der dunklen Karte.)*

**11. Die Profilpille ragte im Vollbild 12 px ins Blatt** (19.08.). Der
Kartenstreifen über dem Blatt war 44 px hoch und lag korrekt unter dem
Systemstreifen — nur braucht die Kopfzeile 56 px (12 Innenabstand + 44 Knopf).
Die Pille wurde also unten angeschnitten, und der Menüknopf gleich mit.

Der Fehler steckte schon vorher drin, mit `black-translucent` genauso: Beide
Werte verschieben sich gemeinsam um den Systemstreifen, die Differenz von 12 px
bleibt. Aufgefallen ist er erst, als der Streifen nicht mehr 106 px hoch war,
sondern 44 — vorher hatte die Pille genug Karte um sich herum, um nicht wie ein
Fehler auszusehen.

**Gemessen statt geschätzt** (IMG_4709, volle Raste):

```
Pille oben       75,0 css      Kopfzeile: 12 + 44 = 56 px ab Seitenanfang
Blatt oben      107,0 css      Streifen:  44 px ab Seitenanfang
                               → 12 px Überlappung
```

*(Die Regel: Was am oberen Rand Platz braucht, wird gegen das gemessen, was
dort tatsächlich im Weg ist — die Kopfzeile, nicht der Systemstreifen. Sie
enthält ihn ohnehin. Ein gemessener Wert statt zweier gerechneter.)*

**12. Der Rechnen-Knopf stand 96 px über dem Bildschirmrand** (19.08.). Unter
dem Fenster liegen 62 px, die die Seite nicht bespielen kann — und darüber legte
das Blatt noch einmal 34 px Innenabstand für den Home-Indikator. Beides leistet
dasselbe, beides zusammen ist doppelt. Dieselbe Rechnung oben: 62 px
Systemstreifen **plus** 12 px Innenabstand der Kopfzeile.

Jetzt wird abgezogen statt addiert — und zwar in reinem CSS:

```css
padding-bottom: max(0px, calc(max(env(safe-area-inset-bottom), 17px)
                              - env(safe-area-inset-top)));
```

**Warum ausgerechnet der obere Wert unten abgezogen wird:** weil er dieselbe
Zahl ist. 956 − 894 = 62 = `env(safe-area-inset-top)`. Was das System oben
nimmt, fehlt der Seite unten. Wo es oben nichts nimmt — im Browser, im
Querformat, ohne `black-translucent` — ist der Abzug null, und genau dort gibt
es auch unten keinen Streifen.

**Der erste Anlauf ging über JavaScript** (`screen.height` minus Fensterhöhe,
als CSS-Variable) und ergab am Gerät **0**, obwohl der Streifen sichtbar da war.
Woran es lag, war aus dem Screenshot nicht zu erkennen — siehe „Das Gerät sagt
seine Maße selbst". Die Lehre: Was in CSS bleiben kann, bleibt in CSS. Eine
`env()`-Rechnung hat keine Ladereihenfolge, keine Browserweiche und kein
Zeitfenster, in dem sie noch nicht gilt.

*(Die Regel, zum dritten Mal in derselben Datei: Ein Systemstreifen ist ein
Rand, kein Zuschlag zu einem Rand. `max()`, nie Addition — oben wie unten.)*

**13. Drei Zustände, drei verschiedene Abstände — und keiner war der Rand**
(19.08.). Am Gerät gemessen, in Bildpunkten vom unteren Bildschirmrand:

| Zustand | Unterkante des Inhalts | erwartet |
|---|---|---|
| leer, kein Route | 214 | 187 |
| eine Route, kleine Raste | 294 | 187 |
| halbe Raste, Höhenprofil | 187 | 187 |

Die dritte Zeile stimmt, weil das Blatt dort eine feste Höhe hat und der Inhalt
darin scrollt. Die beiden anderen messen ihre Höhe am Inhalt — über
`scrollHeight`. Und ob **der untere Innenabstand in `scrollHeight` mitzählt,
ist von Browser zu Browser verschieden.** Auf dem iPhone fehlte er im leeren
Zustand: Das Blatt war um genau diesen Betrag zu kurz und schnitt sich selbst
ab. Sichtbar war das als *zu kleiner* Abstand unter dem Knopf — also als
Randproblem, was es nicht war.

Gemessen wird jetzt die Unterkante des letzten sichtbaren Kindes plus der
Innenabstand aus dem Stylesheet. Ein Wert, den niemand interpretiert.

*(`scrollHeight` hatte schon eine Falle: Er meldet mindestens die Fensterhöhe,
weshalb das Blatt zum Messen auf null gefaltet wird. Zwei Tücken in einer
Eigenschaft sind eine zu viel — deshalb ist sie hier ganz raus.)*

**14. Nach dem Vollbild lag der Knopf halb unter dem Blattrand** (19.08.).
Folgefehler von Falle 13: Die neue Messung nimmt die Unterkante des letzten
sichtbaren Kindes — und die verschiebt sich mit dem **Scrollstand**. Wer im
Vollbild die Analyse nach unten geschoben hatte und dann auf die Karte tippte,
bekam ein Blatt, das um genau diesen Betrag zu kurz war.

Gemessen wird jetzt bei Scrollstand null, danach wird er zurückgesetzt.
*(Am Schreibtisch nicht nachstellbar — im unsichtbaren Testfenster bleibt
`scrollTop` auf null. Die Korrektur ist dort folgenlos und hier belegt durch
die Situation, in der sie auftrat.)*

**Was die vierzehn gemeinsam haben:** Keine war ein Schönheitsfehler. Dreizehn von
vierzehn machten etwas unbedienbar oder ließen die App kaputt aussehen, und keine
einzige zeigte sich im Browser am Schreibtisch.

## Prüfliste für die Sichtkontrolle

Nach jedem Deployment am Gerät durchgehen. Reihenfolge ist Absicht: Was oben
steht, hat schon einmal alles darunter verdeckt.

1. **Zweimal aufrufen**, wenn sich der Service Worker geändert hat. Der erste
   Aufruf holt, der zweite zeigt — siehe `CLAUDE.md`, Abschnitt Deployment.
   **Wurde eine `apple-mobile-web-app-*`-Zeile geändert, reicht das nicht:**
   Die steckt im Home-Bildschirm-Symbol, nicht in der Seite. Symbol löschen,
   in Safari öffnen, neu hinzufügen.
2. **Ist die Bedienung überhaupt da?** Pille oben links, Menü oben rechts,
   fünf Werkzeuge rechts, Zoom und „©" links unten.
3. **Oberer Rand:** Die oberste Bildpunktzeile trägt die Statusleiste in
   `theme-color`, darunter beginnt die Karte. Ändert sich das — Kartenfarbe
   ganz oben —, ist das Gerät oder der Modus ein anderer als der gemessene,
   und `env(safe-area-inset-top)` ist wieder ungleich null.
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
- **Die Farbe der Statusleiste** spielt jetzt keine Rolle mehr, solange
  `black-translucent` bleibt: Es gibt oben keine Statusleistenfläche, die Karte
  läuft dahinter weiter.
- **Die Farbe der Statusleiste kommt womöglich ebenfalls aus dem Symbol.**
  Am 19.08.2026, 19:35 stand sie weiter auf `--ground`, obwohl die Seite seit
  18:20 `--sheet` ausliefert. Zwei Erklärungen, beide nicht ausgeschlossen: Die
  App hatte die neue Fassung noch nicht (der Service Worker braucht zwei
  Aufrufe), oder iOS nimmt die Farbe aus den Angaben, die beim **Anlegen** des
  Symbols gespeichert wurden — dann wäre `theme_color` aus dem Manifest die
  Quelle und nicht die Zeile im HTML. Deshalb steht jetzt auch
  `background_color` auf demselben Wert: Welche der beiden Angaben iOS auch
  nimmt, sie stimmen überein. Bleibt die Leiste nach zwei Aufrufen `--ground`,
  hilft nur das Neuanlegen des Symbols.
- **Ob die Statusleiste hell richtig ist**, entscheidet sich am Bild. Ein
  Streifen ist sie in jedem Fall — verschwinden kann er nur wieder unter der
  Karte, und das kostet den unteren Rand.

**Beantwortet am 19.08.2026:**

- *Zeichnet iOS unterhalb des Fensters?* **Nein.** Die Hintergrundfarbe malt es
  dort, Inhalt schneidet es am Fensterrand ab (Falle 8).
- *Trägt das Streichen von `black-translucent`?* **Ja** — aber erst, nachdem das
  Symbol vom Home-Bildschirm neu angelegt wurde. Eingetreten ist der zweite der
  beiden erwarteten Ausgänge: Fenster bleibt 894 px, rückt unter die
  Statusleiste, `safe-area-inset-top` meldet null.
