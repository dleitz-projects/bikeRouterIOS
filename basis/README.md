# basis/

Die unveränderten Profiltexte von BRouter, wie sie das Original-Repo
ausliefert: `github.com/abrensch/brouter`, Verzeichnis `misc/profiles2`,
MIT-Lizenz. Geholt am 19.08.2026.

## Warum sie hier liegen

Der Baukasten fügt einem Profil **neue Regeln** hinzu. Dafür braucht er den
vollständigen Profiltext, denn `POST /brouter/profile` erwartet eine komplette
`.brf`-Datei und kein Änderungsfragment. Und die API gibt diesen Text nicht
heraus: `GET /brouter/profile/<id>` ist kein Download, sondern liefert eine
Fehlermeldung als JSON.

Es blieben zwei Wege (siehe `OFFENE-PUNKTE.md`, P8): mitliefern oder zur
Laufzeit von GitHub holen. Entschieden ist **mitliefern** — eine zweite fremde
Abhängigkeit im Betrieb wäre schlechter als 34 KB im Repo, und sie widerspräche
der Linie „keine unnötigen fremden Dienste".

## Der Preis, den das hat

Diese Kopien **altern still**. Ändert Arndt Brenschede seine Profile, merkt es
hier niemand — die App rechnet dann mit einem Stand, den der Server so nicht
mehr kennt. Zwei Dinge halten den Schaden klein:

1. Die Dateien werden **nur für Profile mit Bausteinen** hochgeladen. Ohne
   Bausteine rechnet der Server mit seiner eigenen, aktuellen Fassung.
2. Beim Abgleich hilft ein Blick auf die Herkunft:
   `https://raw.githubusercontent.com/abrensch/brouter/master/misc/profiles2/fastbike.brf`

Bewusst kein Automatismus: Ein Abgleich, der im Hintergrund läuft, wäre genau
die fremde Abhängigkeit, die wir vermeiden wollten.
