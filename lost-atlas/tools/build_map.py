#!/usr/bin/env python3
"""Fond de carte embarqué : convertit tools/osm_raw.json (extrait OpenStreetMap, © contributeurs OSM, ODbL)
en data/basemap.js, un fichier compact dessiné par js/basemap.js. Aucune rue n'est inventée : tout vient de l'extrait.
Pour rafraîchir l'extrait : voir README (« Mettre à jour le fond de carte »)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'tools', 'osm_raw.json'), encoding='utf-8'))
MAJOR = {'motorway', 'trunk', 'primary', 'secondary', 'primary_link', 'secondary_link', 'trunk_link'}
MID = {'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'busway'}
ALLEY = {'pedestrian', 'service', 'footway', 'path', 'steps', 'track', 'cycleway', 'corridor'}
roads, areas = [], []
def enc(flat):                      # deltas en 1e-5 degré
    out = [flat[0], flat[1]]
    for i in range(2, len(flat), 2): out += [flat[i] - flat[i-2], flat[i+1] - flat[i-1]]
    return out
for kind, name, flat in d['ways']:
    if len(flat) < 4: continue
    name = (name or '').split('\n')[0].strip()
    lat = name.split(' ')                                  # garde la partie en alphabet latin du nom
    name = ' '.join(w for w in lat if not any('֐' <= c <= 'ࣿ' or 'ⴰ' <= c <= '⵿' for c in w)).strip()
    k = kind.split(':')
    if k[0] == 'h':
        hw = k[1]
        if hw == 'construction': continue
        cls = 0 if hw in MAJOR else 1 if hw in MID else 2
        roads.append([cls + (4 if len(k) > 2 else 0), name or 0, enc(flat)])
    else:
        t = k[1]
        if t == 'waterway': continue
        code = {'green': 0, 'water': 1, 'cemetery': 2, 'square': 3, 'building': 4, 'worship': 5, 'wall': 6}[t]
        areas.append([code, name or 0, enc(flat)])
roads.sort(key=lambda r: -(r[0] & 3))
out = {'attribution': '© contributeurs OpenStreetMap (ODbL)', 'extract': '2026-11-16', 'bbox': [31.605, -8.030, 31.650, -7.970], 'roads': roads, 'areas': areas}
js = 'window.ATLAS_BASEMAP=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'data', 'basemap.js'), 'w', encoding='utf-8').write(js)
print('basemap.js : %d voies (%d nommées), %d surfaces, %d Ko' % (len(roads), sum(1 for r in roads if r[1]), len(areas), len(js.encode()) // 1024))
