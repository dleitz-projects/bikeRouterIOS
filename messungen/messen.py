#!/usr/bin/env python3
"""Eine Messreihe gegen brouter.de fahren und als TSV ablegen.

Warum es dieses Skript gibt: Messungen, die nur als Tabelle in einer
Markdown-Datei stehen, lassen sich nicht wiederholen. Wer in einem halben Jahr
prüfen will, ob ein Ergebnis noch gilt, braucht die Methode und nicht nur die
Zahl. Deshalb liegen Strecken, Aufruf und Auswertung hier zusammen.

    python3 messungen/messen.py --profil trekking --werte 0,1,2.5 \
        --parameter consider_speed --strecke harz-lang --notiz "Test 2 Nachlauf"

Ohne --parameter wird das Profil einfach nur gemessen (Referenzlauf).

WICHTIG — Mengenbegrenzung: brouter.de weist nach etwa 30 Anfragen in kurzer
Folge jede weitere mit HTTP 403 ab (siehe SERVER.md). Deshalb wartet das Skript
zwischen zwei Anfragen. Nicht kleiner stellen.
"""

import argparse, json, os, sys, time, urllib.parse, urllib.request
from datetime import date

HIER = os.path.dirname(os.path.abspath(__file__))
BROUTER = 'https://brouter.de/brouter'
PAUSE = 8          # Sekunden zwischen zwei Anfragen
SCHNELL = {'70', '80', '90', '100', '110', '120', '130'}
HAUPT = {'motorway', 'trunk', 'primary', 'secondary',
         'motorway_link', 'trunk_link', 'primary_link', 'secondary_link'}
RAU = {'bad', 'very_bad', 'horrible', 'very_horrible', 'impassable'}
FEST = {'asphalt', 'concrete', 'paved', 'paving_stones', 'sett',
        'cobblestone', 'unhewn_cobblestone', 'compacted'}


def strecken():
    with open(os.path.join(HIER, 'strecken.json'), encoding='utf-8') as f:
        return {s['id']: s for s in json.load(f)['strecken']}


def hole(profil, lonlats, extra):
    q = {'lonlats': lonlats, 'profile': profil, 'alternativeidx': '0',
         'format': 'geojson', 'profile:processUnusedTags': '1'}
    q.update(extra)
    url = BROUTER + '?' + urllib.parse.urlencode(q)
    with urllib.request.urlopen(url, timeout=120) as r:
        return json.loads(r.read().decode('utf-8'))


def auswerten(daten):
    f = daten['features'][0]
    p = f['properties']
    kopf = p['messages'][0]
    iD, iT = kopf.index('Distance'), kopf.index('WayTags')
    gesamt = schnell = haupt = rau = fest = ohne_smooth = 0
    for zeile in p['messages'][1:]:
        try:
            d = int(zeile[iD])
        except (ValueError, IndexError):
            continue
        tags = dict(kv.split('=', 1) for kv in zeile[iT].split(' ') if '=' in kv)
        gesamt += d
        if tags.get('maxspeed') in SCHNELL:
            schnell += d
        if tags.get('highway') in HAUPT:
            haupt += d
        sm = tags.get('smoothness')
        if sm in RAU:
            rau += d
        if not sm:
            ohne_smooth += d
        if tags.get('surface') in FEST:
            fest += d
    if not gesamt:
        gesamt = 1
    return {
        'km': round(int(p['track-length']) / 1000.0, 2),
        'hm': int(p['filtered ascend']),
        'min': round(int(p['total-time']) / 60.0),
        'kosten': int(p['cost']),
        'tempo70': round(100.0 * schnell / gesamt, 2),
        'haupt': round(100.0 * haupt / gesamt, 2),
        'rau': round(100.0 * rau / gesamt, 2),
        'befestigt': round(100.0 * fest / gesamt, 2),
        'ohne_smoothness': round(100.0 * ohne_smooth / gesamt, 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--profil', required=True, help='Serverprofil oder custom_<id>')
    ap.add_argument('--strecke', default='harz-lang', help='id aus strecken.json')
    ap.add_argument('--parameter', help='Name des zu variierenden Parameters')
    ap.add_argument('--werte', default='', help='Komma-getrennt, z. B. 0,1,2.5')
    ap.add_argument('--fest', default='', help='weitere Parameter, k=v,k=v')
    ap.add_argument('--notiz', default='', help='wofür die Messung war')
    a = ap.parse_args()

    alle = strecken()
    if a.strecke not in alle:
        sys.exit('Unbekannte Strecke. Vorhanden: ' + ', '.join(alle))
    s = alle[a.strecke]

    fest = {}
    for teil in filter(None, a.fest.split(',')):
        k, v = teil.split('=', 1)
        fest['profile:' + k] = v

    werte = [w.strip() for w in a.werte.split(',') if w.strip()] or [None]
    spalten = ['wert', 'km', 'hm', 'min', 'kosten', 'tempo70', 'haupt',
               'rau', 'befestigt', 'ohne_smoothness']
    zeilen = []

    for i, w in enumerate(werte):
        if i:
            time.sleep(PAUSE)
        extra = dict(fest)
        if a.parameter and w is not None:
            extra['profile:' + a.parameter] = w
        try:
            e = auswerten(hole(a.profil, s['lonlats'], extra))
        except Exception as err:                      # noqa: BLE001
            sys.exit('Abbruch bei Wert %s: %s' % (w, err))
        e['wert'] = w if w is not None else '—'
        zeilen.append(e)
        print('  '.join('%s=%s' % (k, e[k]) for k in spalten))

    name = '%s_%s_%s.tsv' % (date.today().isoformat(), a.strecke,
                             (a.parameter or a.profil).replace(':', '-'))
    ziel = os.path.join(HIER, 'ergebnisse', name)
    with open(ziel, 'w', encoding='utf-8') as f:
        f.write('# %s\n' % (a.notiz or 'ohne Notiz'))
        f.write('# Profil: %s | Strecke: %s (%s, %d km) | %s\n'
                % (a.profil, s['id'], s['name'], s['km'], date.today().isoformat()))
        if fest:
            f.write('# feste Parameter: %s\n' % a.fest)
        f.write('\t'.join(spalten) + '\n')
        for z in zeilen:
            f.write('\t'.join(str(z[k]) for k in spalten) + '\n')
    print('\n-> %s' % ziel)


if __name__ == '__main__':
    main()
