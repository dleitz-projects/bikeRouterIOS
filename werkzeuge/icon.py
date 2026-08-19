"""Erzeugt die App-Icons, ohne fremde Bibliothek.

Die FORM stammt aus dem ersten Entwurf und bleibt: ein kraeftiger Zickzack
zwischen zwei Punkten. Sie ist auf 60 px Kantenlaenge noch erkennbar, und
darauf kommt es bei einem Icon an.

Getauscht wurden nur die FARBEN. Das alte Icon teilte mit der App keine
einzige — Petrolblau, Hellblau und Pastelltoene kommen in `style.css` nirgends
vor. Hier stehen jetzt die Werte der dunklen Palette:

    Grund   --sheet   #181C15
    Linie   --signal  #FF6B33   die Route, und die Farbe der ganzen App
    Start   --good    #5FB07E   wie der Startmarker auf der Karte
    Ziel    --ink     #E9EDE1   hell, damit er sich von der Linie abhebt

Erzeugt werden drei Dateien:

    icon-192.png, icon-512.png   vollflaechig quadratisch. iOS legt seine
                                 eigene Maske darueber; ein Icon mit eigenen
                                 runden Ecken bekaeme dort einen doppelten Rand.
    doku/bilder/icon-rund.png    mit runden Ecken und Transparenz, nur fuer die
                                 Startseite im Web — dort maskiert niemand.
"""
import zlib, struct, math

S = 3                        # Ueberabtastung gegen harte Kanten
GRUND  = (0x18, 0x1C, 0x15)
LINIE  = (0xFF, 0x6B, 0x33)
START  = (0x5F, 0xB0, 0x7E)
ZIEL   = (0xE9, 0xED, 0xE1)

# Zickzack wie im ersten Entwurf: unten links los, zweimal die Richtung
# wechseln, oben rechts ankommen.
PFAD = [(0.22, 0.80), (0.40, 0.47), (0.52, 0.62), (0.78, 0.22)]

def abstand(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def zeichne(n, rund):
    pts = [(x * n, y * n) for x, y in PFAD]
    halbe = 0.058 * n          # halbe Strichstaerke
    r_end = 0.088 * n          # Radius der beiden Endpunkte
    radius = 0.22 * n          # Eckenradius, nur wenn `rund`
    roh = bytearray()
    for y in range(n):
        for x in range(n):
            px, py = x + 0.5, y + 0.5
            if rund:
                # Ausserhalb der abgerundeten Flaeche bleibt es durchsichtig.
                cx = min(max(px, radius), n - radius)
                cy = min(max(py, radius), n - radius)
                if math.hypot(px - cx, py - cy) > radius:
                    roh += bytes((0, 0, 0, 0))
                    continue
            farbe = GRUND
            d = min(abstand(px, py, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1])
                    for i in range(len(pts) - 1))
            if d <= halbe:
                farbe = LINIE
            for mitte, ton in ((pts[0], START), (pts[-1], ZIEL)):
                if math.hypot(px - mitte[0], py - mitte[1]) <= r_end:
                    farbe = ton
            roh += bytes(farbe + ((255,) if rund else ()))
    return roh

def verkleinern(roh, n, ziel, kanaele):
    aus = bytearray()
    for y in range(ziel):
        aus.append(0)                     # PNG-Filter: keiner
        for x in range(ziel):
            summe = [0] * kanaele
            for dy in range(S):
                for dx in range(S):
                    i = ((y * S + dy) * n + (x * S + dx)) * kanaele
                    for k in range(kanaele):
                        summe[k] += roh[i + k]
            aus += bytes(round(v / (S * S)) for v in summe)
    return bytes(aus)

def schreibe(pfad, daten, groesse, kanaele):
    def teil(typ, inhalt):
        return (struct.pack('>I', len(inhalt)) + typ + inhalt
                + struct.pack('>I', zlib.crc32(typ + inhalt) & 0xffffffff))
    farbtyp = 6 if kanaele == 4 else 2
    with open(pfad, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(teil(b'IHDR', struct.pack('>IIBBBBB', groesse, groesse, 8, farbtyp, 0, 0, 0)))
        f.write(teil(b'IDAT', zlib.compress(daten, 9)))
        f.write(teil(b'IEND', b''))

def bauen(pfad, groesse, rund):
    kanaele = 4 if rund else 3
    roh = zeichne(groesse * S, rund)
    schreibe(pfad, verkleinern(roh, groesse * S, groesse, kanaele), groesse, kanaele)
    print(pfad + ' geschrieben')

if __name__ == '__main__':
    bauen('icon-192.png', 192, False)
    bauen('icon-512.png', 512, False)
    bauen('doku/bilder/icon-rund.png', 256, True)
