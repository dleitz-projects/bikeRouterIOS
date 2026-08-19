"""Faerbt die Linie im App-Icon um — mehr nicht.

Das Icon stammt aus dem ersten Entwurf und bleibt, wie es ist: Zickzack,
Hintergrund, Start- und Zielpunkt. Zwei Versuche, es neu zu zeichnen, sind
gescheitert (siehe OFFENE-PUNKTE.md, P17); nachgezeichnet wurde der Verlauf
jedes Mal schlechter als das Original.

Geaendert wird deshalb NICHTS an der Form. Nur die Linie war hellblau —
eine Farbe, die in der App nirgends vorkommt — und wird zur Signalfarbe.
Gearbeitet wird pixelweise auf der Originaldatei, damit Verlauf und
Kantenglaettung erhalten bleiben.

    Linie   #7DD3FC  →  #FF6B33
    Grund   #1B3A4B     unveraendert
    Start   #86EFAC     unveraendert
    Ziel    #FCA5A5     unveraendert

Der Kniff beim Umfaerben: Ein Pixel am Rand der Linie ist eine Mischung aus
Blau und dem, was daneben liegt — Grund, Start- oder Zielpunkt. Fuer jedes
Pixel wird deshalb geprueft, ob es sich als Mischung „Blau plus X" erklaeren
laesst; wenn ja, wird der Blauanteil durch Orange ersetzt und derselbe
Mischungsgrad beibehalten. So bleibt kein blauer Saum stehen.

    python3 werkzeuge/icon.py
"""
import os, struct, zlib

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.dirname(HIER)

BLAU   = (0x7D, 0xD3, 0xFC)
ORANGE = (0xFF, 0x6B, 0x33)
ANDERE = [(0x1B, 0x3A, 0x4B), (0x86, 0xEF, 0xAC), (0xFC, 0xA5, 0xA5)]


def png_lesen(pfad):
    d = open(pfad, 'rb').read()
    i, idat, w, h, ct = 8, b'', 0, 0, 0
    while i < len(d):
        ln = struct.unpack('>I', d[i:i+4])[0]
        typ, inhalt = d[i+4:i+8], d[i+8:i+8+ln]
        if typ == b'IHDR':
            w, h, _bd, ct = struct.unpack('>IIBB', inhalt[:10])
        elif typ == b'IDAT':
            idat += inhalt
        i += 12 + ln
    if ct != 2:
        raise SystemExit('Erwartet wird RGB ohne Alpha, gefunden Farbtyp %d' % ct)
    roh = zlib.decompress(idat)
    bpp, stride = 3, w * 3
    aus, vorige, p = bytearray(), bytearray(stride), 0
    for _y in range(h):
        f = roh[p]; p += 1
        z = bytearray(roh[p:p+stride]); p += stride
        for x in range(stride):
            a = z[x-bpp] if x >= bpp else 0
            b = vorige[x]
            c = vorige[x-bpp] if x >= bpp else 0
            if f == 1:   z[x] = (z[x] + a) & 255
            elif f == 2: z[x] = (z[x] + b) & 255
            elif f == 3: z[x] = (z[x] + (a + b) // 2) & 255
            elif f == 4:
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                z[x] = (z[x] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
        aus += z
        vorige = z
    return w, h, aus


def png_schreiben(pfad, w, h, pixel, kanaele):
    zeilen = bytearray()
    stride = w * kanaele
    for y in range(h):
        zeilen.append(0)
        zeilen += pixel[y*stride:(y+1)*stride]

    def teil(typ, inhalt):
        return (struct.pack('>I', len(inhalt)) + typ + inhalt
                + struct.pack('>I', zlib.crc32(typ + inhalt) & 0xffffffff))

    with open(pfad, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(teil(b'IHDR', struct.pack('>IIBBBBB', w, h, 8,
                                          6 if kanaele == 4 else 2, 0, 0, 0)))
        f.write(teil(b'IDAT', zlib.compress(bytes(zeilen), 9)))
        f.write(teil(b'IEND', b''))


def umfaerben(px):
    """Ersetzt den Blauanteil eines Pixels durch Orange."""
    bester, fehler_best, t_best = None, 12.0, 0.0
    for grund in ANDERE:
        # Anteil t so waehlen, dass grund + t*(BLAU-grund) dem Pixel am naechsten kommt.
        zaehler = summe = 0.0
        for k in range(3):
            d = BLAU[k] - grund[k]
            zaehler += d * (px[k] - grund[k])
            summe += d * d
        if summe == 0:
            continue
        t = max(0.0, min(1.0, zaehler / summe))
        fehler = sum(abs(grund[k] + t * (BLAU[k] - grund[k]) - px[k]) for k in range(3)) / 3.0
        if fehler < fehler_best:
            bester, fehler_best, t_best = grund, fehler, t
    if bester is None or t_best <= 0.004:
        return px
    return tuple(round(bester[k] + t_best * (ORANGE[k] - bester[k])) for k in range(3))


def datei(quelle, ziel):
    w, h, px = png_lesen(quelle)
    aus = bytearray(len(px))
    zwischenspeicher = {}
    for i in range(0, len(px), 3):
        schluessel = bytes(px[i:i+3])
        neu = zwischenspeicher.get(schluessel)
        if neu is None:
            neu = umfaerben(tuple(schluessel))
            zwischenspeicher[schluessel] = neu
        aus[i:i+3] = bytes(neu)
    png_schreiben(ziel, w, h, aus, 3)
    print('%s (%dx%d)' % (os.path.relpath(ziel, WURZEL), w, h))
    return w, h, aus


def runde_ecken(w, h, px, ziel, kante=256):
    """Verkleinert auf `kante` und rundet die Ecken — nur fuer die Startseite."""
    import math
    f = w / float(kante)
    radius = 0.22 * kante
    aus = bytearray()
    for y in range(kante):
        for x in range(kante):
            cx = min(max(x + 0.5, radius), kante - radius)
            cy = min(max(y + 0.5, radius), kante - radius)
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) > radius:
                aus += bytes((0, 0, 0, 0))
                continue
            # Mittelwert des Quellblocks, damit nichts flimmert
            x0, x1 = int(x * f), max(int(x * f) + 1, int((x + 1) * f))
            y0, y1 = int(y * f), max(int(y * f) + 1, int((y + 1) * f))
            r = g = b = n = 0
            for yy in range(y0, min(y1, h)):
                for xx in range(x0, min(x1, w)):
                    i = (yy * w + xx) * 3
                    r += px[i]; g += px[i+1]; b += px[i+2]; n += 1
            aus += bytes((round(r/n), round(g/n), round(b/n), 255))
    png_schreiben(ziel, kante, kante, aus, 4)
    print('%s (%dx%d, runde Ecken)' % (os.path.relpath(ziel, WURZEL), kante, kante))


if __name__ == '__main__':
    datei(os.path.join(HIER, 'icon-original-192.png'), os.path.join(WURZEL, 'icon-192.png'))
    w, h, px = datei(os.path.join(HIER, 'icon-original-512.png'),
                     os.path.join(WURZEL, 'icon-512.png'))
    runde_ecken(w, h, px, os.path.join(WURZEL, 'doku', 'bilder', 'icon-rund.png'))
