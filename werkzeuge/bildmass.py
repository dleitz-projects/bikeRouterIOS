#!/usr/bin/env python3
"""Misst einen Geraete-Screenshot aus, statt ihn zu beurteilen.

Ein Screenshot vom iPhone ist der einzige ehrliche Zeuge dafuer, was die App
auf dem Geraet wirklich tut — der Browser am Schreibtisch kennt weder Notch
noch Home-Indikator. Nur nuetzt der Blick allein wenig: „unten ist ein grauer
Balken" fuehrt zu Vermutungen, „der Balken ist 187 Bildpunkte hoch und traegt
exakt --ground" fuehrt zur Ursache. Genau dafuer ist dieses Werkzeug da.

    python3 werkzeuge/bildmass.py spalte bild.png [x]
    python3 werkzeuge/bildmass.py zeile  bild.png [y]
    python3 werkzeuge/bildmass.py punkt  bild.png x y

`spalte` und `zeile` geben jeden Farbwechsel entlang der Linie aus, jeweils mit
Bildpunkt, umgerechnetem CSS-Pixel und — wo sie passt — dem Namen aus der
Palette in `style.css`. Die Koordinaten sind Bildpunkte des Screenshots; ohne
Angabe laeuft die Linie durch die Mitte.

Der Massstab kommt aus `--dpr` (Vorgabe 3). Er ist nachpruefbar, statt geglaubt
zu werden: `zeile` durch die Zoomknoepfe gelegt muss 36 CSS-Pixel breite weisse
Flaechen ergeben, denn genau so breit sind sie im Stylesheet. Stimmt das nicht,
stimmt der Massstab nicht — und keine der uebrigen Zahlen taugt etwas.

    python3 werkzeuge/bildmass.py zeile bild.png 2211 --dpr 3

Der Umweg ueber BMP ist derselbe wie in `unkenntlich.py`: iPhone-Screenshots
kommen mit 16 Bit pro Kanal, `sips` liegt auf jedem Mac bereit.

Wozu die Zahlen gehoeren und was aus ihnen schon gefolgt ist: `DARSTELLUNG.md`.
"""
import os
import re
import subprocess
import sys
import tempfile

from unkenntlich import bmp_lesen, nach_bmp

HIER = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.join(os.path.dirname(HIER), 'style.css')


def palette():
    """Liest die Farbnamen aus style.css — hell und dunkel getrennt.

    Selbst gelesen und nicht abgeschrieben: Eine Kopie der Farbwerte hier
    waere nach der ersten Aenderung am Stylesheet falsch, ohne dass es
    auffiele. Der Name ist die Auskunft, auf die es ankommt ('--sheet'
    statt '#F7F8F3').
    """
    try:
        text = open(STYLE, encoding='utf-8').read()
    except OSError:
        return {}
    dunkel = text.find('prefers-color-scheme:dark')
    namen = {}
    for treffer in re.finditer(r'(--[a-z-]+)\s*:\s*#([0-9A-Fa-f]{6})', text):
        rgb = tuple(int(treffer.group(2)[i:i + 2], 16) for i in (0, 2, 4))
        schema = 'dunkel' if dunkel != -1 and treffer.start() > dunkel else 'hell'
        namen.setdefault(rgb, '%s (%s)' % (treffer.group(1), schema))
    return namen


def name_zu(rgb, namen):
    if rgb in namen:
        return namen[rgb]
    # Kanten sind weichgezeichnet; ein Farbwert daneben ist noch derselbe Ton.
    for ref, name in namen.items():
        if all(abs(a - b) <= 2 for a, b in zip(rgb, ref)):
            return name + ' ~'
    return ''


class Bild:
    def __init__(self, pfad):
        tmp = tempfile.mkdtemp()
        bmp = os.path.join(tmp, 'a.bmp')
        nach_bmp(pfad, bmp)
        (self.d, self.start, self.w, self.h,
         self.kan, self.stride, self.aufwaerts) = bmp_lesen(bmp)

    def px(self, x, y):
        zeile = (self.h - 1 - y) if self.aufwaerts else y
        i = self.start + zeile * self.stride + x * self.kan
        return (self.d[i + 2], self.d[i + 1], self.d[i])  # BMP liegt als BGR


def wechsel(bild, punkte, dpr, namen, achse):
    vorher = None
    anfang = 0
    for nr, (x, y) in enumerate(punkte):
        farbe = bild.px(x, y)
        if vorher is None:
            vorher, anfang = farbe, nr
            continue
        if any(abs(a - b) > 2 for a, b in zip(farbe, vorher)):
            zeige(anfang, nr - 1, vorher, dpr, namen, achse)
            vorher, anfang = farbe, nr
    if vorher is not None:
        zeige(anfang, len(punkte) - 1, vorher, dpr, namen, achse)


def zeige(von, bis, farbe, dpr, namen, achse):
    print('%s %5d–%-5d  %6.1f–%-6.1f css  %3d px  #%02X%02X%02X  %s' % (
        achse, von, bis, von / dpr, bis / dpr, bis - von + 1,
        farbe[0], farbe[1], farbe[2], name_zu(farbe, namen)))


def main():
    args, dpr, rest = [], 3.0, list(sys.argv[1:])
    while rest:
        a = rest.pop(0)
        if a.startswith('--dpr'):
            # Beide Schreibweisen, und der Wert wird verbraucht: Bliebe er
            # stehen, laese ihn die Auswertung unten als Koordinate.
            dpr = float(a.split('=', 1)[1] if '=' in a else rest.pop(0))
        else:
            args.append(a)
    if len(args) < 2:
        raise SystemExit(__doc__)
    was, pfad = args[0], args[1]
    bild = Bild(pfad)
    namen = palette()
    print('%s: %d × %d Bildpunkte, bei dpr %g also %g × %g CSS-Pixel'
          % (os.path.basename(pfad), bild.w, bild.h, dpr, bild.w / dpr, bild.h / dpr))

    if was == 'spalte':
        x = int(args[2]) if len(args) > 2 else bild.w // 2
        print('Spalte x=%d (%.1f css), von oben nach unten:' % (x, x / dpr))
        wechsel(bild, [(x, y) for y in range(bild.h)], dpr, namen, 'y')
    elif was == 'zeile':
        y = int(args[2]) if len(args) > 2 else bild.h // 2
        print('Zeile y=%d (%.1f css), von links nach rechts:' % (y, y / dpr))
        wechsel(bild, [(x, y) for x in range(bild.w)], dpr, namen, 'x')
    elif was == 'punkt':
        x, y = int(args[2]), int(args[3])
        f = bild.px(x, y)
        print('x=%d y=%d  #%02X%02X%02X  %s' % (x, y, f[0], f[1], f[2], name_zu(f, namen)))
    else:
        raise SystemExit(__doc__)


if __name__ == '__main__':
    main()
