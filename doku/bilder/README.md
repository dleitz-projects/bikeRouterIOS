# Bilder für die Startseite

Alle Bilder in `README.md` sind **echte iPhone-Screenshots**, aufgenommen am
19.08.2026. Die Platzhalter aus der ersten Runde sind ersetzt und gelöscht.

| Datei | Zeigt |
|---|---|
| `01-safari-oeffnen` | Die App in Safari, Adressleiste sichtbar |
| `02-teilen-symbol` | Safari-Menü mit dem Eintrag *Teilen* |
| `03-zum-homebildschirm` | Das Teilen-Menü, gescrollt bis *Zum Home-Bildschirm* |
| `04-hinzufuegen` | Der Dialog mit Name und URL, oben rechts *Hinzufügen* |
| `05-homebildschirm` | Der Home-Bildschirm mit dem neuen Icon |
| `06-erste-route` | Eine berechnete Route, Blatt in der kleinen Raste |
| `07-hoehenprofil` | Dieselbe Route mit aufgezogenem Höhenprofil |
| `08-analyse` | Bodenbeschaffenheit und Straßenarten |
| `09-teilen` | Das Teilen-Menü der App |
| `icon-rund` | Das App-Icon mit runden Ecken — kein Screenshot |

## Was unkenntlich gemacht wurde

In `03-zum-homebildschirm` und `09-teilen` stand die **Kontaktzeile von
AirDrop** — vier Namen samt Profilfotos erkennbarer Personen. Sie ist verpixelt.

**Verpixelt statt geschwärzt**, weil der Screenshot weiter zeigen soll, *dass*
dort eine Kontaktzeile steht — nur nicht mehr *wer*. Ein schwarzer Balken sähe
aus wie ein Fehler im Bild.

Gemacht mit `werkzeuge/unkenntlich.py`; die Bereiche stehen dort als Anteile der
Bildkante, sind also unabhängig von der Auflösung des Geräts.

**Vor jedem neuen Screenshot prüfen:** AirDrop-Kontakte, Namen in gespeicherten
Touren, WLAN-Namen, und ob die gezeigte Route Rückschlüsse auf die eigene
Adresse zulässt. Die hier gezeigten Strecken beginnen bewusst nicht an einer
Haustür.

## Wenn Bilder ersetzt werden

Screenshot am iPhone machen, unter demselben Namen als `.png` ablegen, bei
Bedarf durch `unkenntlich.py` schicken, dann verkleinern:

```sh
sips -Z 1000 doku/bilder/06-erste-route.png
```

1000 px Höhe reichen für die Startseite und halten die Datei bei einigen hundert
Kilobyte. Die Originale mit 2868 px brauchen das Repo nicht.
