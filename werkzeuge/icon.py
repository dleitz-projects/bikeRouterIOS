"""Erzeugt die App-Icons in der Farbwelt der App, ohne fremde Bibliothek.

Palette aus style.css:
  --ground dunkel #0D100B, --sheet dunkel #181C15
  --signal #DC4514 (die Route), --good #3F7F58 (Start)
Gezeichnet wird 3-fach ueberabgetastet, damit die Kanten weich werden.
"""
import zlib, struct, math

S = 3                      # Ueberabtastung
GROUND = (0x18, 0x1C, 0x15)
SIGNAL = (0xDC, 0x45, 0x14)
GOOD   = (0x3F, 0x7F, 0x58)
SHEET  = (0xF7, 0xF8, 0xF3)

def misch(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def punkt_auf_strecke(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

def zeichne(groesse):
    N = groesse * S
    # Route: eine Linie mit dem Schwung einer echten Strecke, kein Zickzack.
    # Koordinaten in Anteilen der Kantenlaenge.
    pfad = [(0.20, 0.78), (0.30, 0.60), (0.45, 0.63), (0.55, 0.45),
            (0.70, 0.40), (0.78, 0.24)]
    pts = [(x * N, y * N) for x, y in pfad]
    breite = 0.085 * N            # Strichstaerke wie die Route auf der Karte
    r_punkt = 0.075 * N           # Start- und Zielpunkt
    r_ring = 0.030 * N            # heller Ring darum, wie die Marker

    bild = bytearray()
    for y in range(N):
        for x in range(N):
            px, py = x + 0.5, y + 0.5
            farbe = GROUND

            d = min(punkt_auf_strecke(px, py, pts[i][0], pts[i][1],
                                      pts[i+1][0], pts[i+1][1])
                    for i in range(len(pts) - 1))
            if d <= breite / 2:
                farbe = SIGNAL

            for mitte, grund in ((pts[0], GOOD), (pts[-1], SIGNAL)):
                dp = math.hypot(px - mitte[0], py - mitte[1])
                if dp <= r_punkt + r_ring:
                    farbe = SHEET
                if dp <= r_punkt:
                    farbe = grund

            bild += bytes(farbe)
    return bild, N

def herunterrechnen(bild, N, ziel):
    aus = bytearray()
    for y in range(ziel):
        aus.append(0)                       # PNG-Filter: keiner
        for x in range(ziel):
            r = g = b = 0
            for dy in range(S):
                for dx in range(S):
                    i = ((y * S + dy) * N + (x * S + dx)) * 3
                    r += bild[i]; g += bild[i+1]; b += bild[i+2]
            n = S * S
            aus += bytes((round(r/n), round(g/n), round(b/n)))
    return bytes(aus)

def schreibe_png(pfad, daten, groesse):
    def chunk(typ, inhalt):
        c = struct.pack('>I', len(inhalt)) + typ + inhalt
        return c + struct.pack('>I', zlib.crc32(typ + inhalt) & 0xffffffff)
    kopf = struct.pack('>IIBBBBB', groesse, groesse, 8, 2, 0, 0, 0)
    with open(pfad, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', kopf))
        f.write(chunk(b'IDAT', zlib.compress(daten, 9)))
        f.write(chunk(b'IEND', b''))

for groesse in (192, 512):
    bild, N = zeichne(groesse)
    schreibe_png('icon-%d.png' % groesse, herunterrechnen(bild, N, groesse), groesse)
    print('icon-%d.png geschrieben' % groesse)
