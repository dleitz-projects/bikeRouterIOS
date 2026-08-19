#!/usr/bin/env python3
"""Macht Bereiche in einem Screenshot unkenntlich — durch starkes Verpixeln.

Warum verpixeln und nicht schwaerzen: Der Screenshot soll weiter zeigen, DASS
dort eine Kontaktzeile steht, nur nicht mehr WER. Ein schwarzer Kasten sieht aus
wie ein Fehler, ein verpixelter Bereich wie das, was er ist.

Warum der Umweg ueber BMP: iPhone-Screenshots kommen mit 16 Bit pro Kanal, und
ein selbstgeschriebener PNG-Dekoder muesste dafuer Filterung, Bit-Tiefe und
Farbprofile beherrschen. `sips` liegt auf jedem Mac bereit und wandelt
verlustfrei nach BMP — ein Format, das aus einem Kopf und rohen Bytes besteht.

    python3 werkzeuge/unkenntlich.py quelle.png ziel.png x0,y0,x1,y1 [...]

Die Bereiche stehen in Anteilen der Bildkante (0 bis 1), damit sie unabhaengig
von der Aufloesung des Geraets sind.
"""
import os, struct, subprocess, sys, tempfile


def nach_bmp(quelle, ziel):
    subprocess.run(['sips', '-s', 'format', 'bmp', quelle, '--out', ziel],
                   check=True, capture_output=True)


def nach_png(quelle, ziel):
    subprocess.run(['sips', '-s', 'format', 'png', quelle, '--out', ziel],
                   check=True, capture_output=True)


def bmp_lesen(pfad):
    d = bytearray(open(pfad, 'rb').read())
    start = struct.unpack('<I', d[10:14])[0]
    w, h = struct.unpack('<ii', d[18:26])
    bits = struct.unpack('<H', d[28:30])[0]
    if bits not in (24, 32):
        raise SystemExit('Erwartet werden 24 oder 32 Bit, gefunden %d' % bits)
    kan = bits // 8
    stride = ((w * kan + 3) // 4) * 4
    return d, start, w, abs(h), kan, stride, h > 0


def verpixeln(d, start, w, h, kan, stride, aufwaerts, x0, y0, x1, y1, block):
    def zeile(y):
        # BMP speichert von unten nach oben, wenn die Hoehe positiv ist.
        return start + (h - 1 - y if aufwaerts else y) * stride

    for by in range(y0, y1, block):
        for bx in range(x0, x1, block):
            summe = [0] * kan
            n = 0
            for y in range(by, min(by + block, y1)):
                z = zeile(y)
                for x in range(bx, min(bx + block, x1)):
                    i = z + x * kan
                    for k in range(kan):
                        summe[k] += d[i + k]
                    n += 1
            if not n:
                continue
            mittel = bytes(round(v / n) for v in summe)
            for y in range(by, min(by + block, y1)):
                z = zeile(y)
                for x in range(bx, min(bx + block, x1)):
                    i = z + x * kan
                    d[i:i + kan] = mittel


def main():
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    quelle, ziel, bereiche = sys.argv[1], sys.argv[2], sys.argv[3:]
    tmp = tempfile.mkdtemp()
    roh, bearbeitet = os.path.join(tmp, 'a.bmp'), os.path.join(tmp, 'b.bmp')
    nach_bmp(quelle, roh)
    d, start, w, h, kan, stride, aufwaerts = bmp_lesen(roh)
    for b in bereiche:
        a, c, e, f = (float(v) for v in b.split(','))
        verpixeln(d, start, w, h, kan, stride, aufwaerts,
                  max(0, int(a * w)), max(0, int(c * h)),
                  min(w, int(e * w)), min(h, int(f * h)),
                  max(6, int(w / 45)))
    open(bearbeitet, 'wb').write(d)
    nach_png(bearbeitet, ziel)
    print('%s (%d Bereiche unkenntlich)' % (ziel, len(bereiche)))


if __name__ == '__main__':
    main()
