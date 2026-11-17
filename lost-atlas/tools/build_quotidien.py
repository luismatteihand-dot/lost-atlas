"""Lieux du quotidien : extraits de tools/osm_raw.json (OpenStreetMap, © contributeurs OSM, licence ODbL).
Aucun lieu, aucune coordonnée, aucune description n'est inventé : nom, position et type viennent tels quels d'OSM.
Chaque lieu reçoit un identifiant stable (empreinte du nom, du type et de la position), une famille de jeu,
un territoire (polygone du jeu, sinon le plus proche, marqué « en bordure »), une source et un niveau de fiabilité.
Les doublons des lieux déjà présents dans l'atlas sont fusionnés : le lieu de l'atlas garde son identifiant (sauvegardes)
et l'entrée OSM n'est pas recréée ; la correspondance est notée dans data/quotidien.js (champ `dup`).
Pour ajouter des lieux plus tard : compléter tools/quotidien_extra.json (même format) puis relancer ce script."""
import json, os, re, hashlib, math, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(ROOT, 'tools', 'osm_raw.json'), encoding='utf-8'))['pois']
extra_p = os.path.join(ROOT, 'tools', 'quotidien_extra.json')
extra = json.load(open(extra_p, encoding='utf-8')) if os.path.exists(extra_p) else []
T = json.load(open(os.path.join(ROOT, 'data', 'territories.json'), encoding='utf-8')); T = T if isinstance(T, list) else T['territories']
P = json.load(open(os.path.join(ROOT, 'data', 'places.json'), encoding='utf-8')); P = P if isinstance(P, list) else P['places']

FAM = [  # (famille, libellé, règle)
  ('cafe', 'Café, salon de thé', lambda k, v: (k, v) in [('amenity', 'cafe'), ('amenity', 'internet_cafe')] and v != 'internet_cafe'),
  ('resto', 'Restaurant, petite table', lambda k, v: k == 'amenity' and v in ('restaurant', 'fast_food', 'food_court')),
  ('pain', 'Boulangerie, pâtisserie', lambda k, v: k == 'shop' and v in ('bakery', 'pastry', 'confectionery')),
  ('epicerie', 'Épicerie, marché', lambda k, v: (k == 'shop' and v in ('convenience', 'supermarket', 'greengrocer', 'butcher', 'spices', 'deli', 'dairy', 'herbalist')) or (k == 'amenity' and v == 'marketplace')),
  ('artisan', 'Atelier, artisanat, souk', lambda k, v: k == 'craft' or (k == 'shop' and v in ('craft', 'handicraft', 'carpet', 'leather', 'antiques', 'pottery', 'jewelry', 'bag', 'fabric', 'tailor', 'second_hand', 'frame', 'musical_instrument'))),
  ('boutique', 'Boutique', lambda k, v: k == 'shop' and v in ('clothes', 'gift', 'shoes', 'cosmetics', 'perfumery', 'tea', 'interior_decoration', 'houseware', 'variety_store', 'boutique', 'fashion', 'mall', 'yes', 'department_store', 'furniture', 'florist')),
  ('livre', 'Librairie', lambda k, v: k == 'shop' and v in ('books', 'stationery')),
  ('culture', 'Musée, galerie', lambda k, v: (k == 'tourism' and v in ('museum', 'gallery')) or (k == 'shop' and v == 'art') or (k == 'amenity' and v in ('arts_centre', 'theatre', 'cinema', 'library', 'community_centre'))),
  ('vert', 'Jardin, parc, place', lambda k, v: (k == 'leisure' and v in ('park', 'garden', 'playground')) or (k == 'place' and v == 'square')),
  ('repere', 'Porte, monument, curiosité', lambda k, v: (k == 'historic') or (k == 'tourism' and v in ('attraction', 'viewpoint', 'artwork')) or (k == 'amenity' and v == 'fountain')),
  ('hammam', 'Hammam', lambda k, v: k == 'amenity' and v == 'public_bath'),
  ('culte', 'Lieu de culte', lambda k, v: k == 'amenity' and v == 'place_of_worship'),
  ('utile', 'Pratique : santé, poste, aide', lambda k, v: k == 'amenity' and v in ('pharmacy', 'hospital', 'clinic', 'doctors', 'police', 'post_office', 'toilets', 'drinking_water', 'bus_station', 'taxi')),
]
LABEL = {f: l for f, l, _ in FAM}

def inside(pt, poly):
    x, y = pt[1], pt[0]; c = False; j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi, xj, yj = poly[i][1], poly[i][0], poly[j][1], poly[j][0]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi: c = not c
        j = i
    return c
def dist(a, b):
    R = 6371000; la1, la2 = math.radians(a[0]), math.radians(b[0]); dl = math.radians(b[1] - a[1]); dp = la2 - la1
    h = math.sin(dp / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(dl / 2) ** 2; return 2 * R * math.asin(math.sqrt(h))
def seg_dist(p, poly):
    return min(dist(p, poly[i]) for i in range(len(poly)))  # approximation par les sommets, suffisante pour l'étiquette « en bordure »
def norm(s):
    s = unicodedata.normalize('NFD', s.lower()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return set(w for w in re.findall(r'[a-z]{4,}', s) if w not in ('riad', 'dar', 'cafe', 'restaurant', 'musee', 'palais', 'place', 'souk', 'maison', 'marrakech', 'jardin', 'hotel', 'boutique', 'galerie',
        'food', 'mosquee', 'pharmacie', 'snack', 'house', 'home', 'chez', 'medina', 'terrasse', 'house', 'shop', 'store', 'art', 'arts', 'atelier', 'bijoux', 'kasbah', 'bab', 'medersa', 'youssef', 'majorelle', 'souvenirs', 'traditional', 'tradititonal'))

atlas = [p for p in P if p.get('pos')]
out, dups, seen = [], [], set()
for e in raw + extra:
    name, lat, lng, tag = e[0], e[1], e[2], e[3]
    if not name or '=' not in tag: continue
    if name.strip().lower() in ('medina', 'marrakech', 'souqs', 'tower', 'medina marrakech مدينة مراكش'): continue   # noms génériques, pas des lieux
    k, v = tag.split('=', 1)
    fam = next((f for f, _, rule in FAM if rule(k, v)), None)
    if not fam: continue
    ll = [round(lat, 6), round(lng, 6)]
    # fusion avec l'atlas : même nom (mot distinctif commun) à moins de 80 m, ou tout lieu de l'atlas à moins de 12 m
    hit = None
    for a in atlas:
        d = dist(ll, a['pos'])
        cult = a.get('cat') in ('inc', 'voir', 'extra')
        if cult != (fam in ('repere', 'culture', 'vert', 'culte', 'hammam')): continue   # un café ne fusionne jamais avec un monument
        na, nb = norm(name), norm(a['name'])
        if d < 80 and na and nb and (na == nb or (min(len(na), len(nb)) >= 2 and (na <= nb or nb <= na))): hit = a; break   # mêmes mots distinctifs
        # une porte, une tombe ou une curiosité OSM collée à un lieu culturel de l'atlas est ce lieu (noms souvent en arabe)
        if fam == 'repere' and d < 35 and a.get('cat') in ('inc', 'voir', 'extra'): hit = a; break
    if hit: dups.append([name, hit['id']]); continue
    key = (name.strip().lower(), fam, round(lat, 4), round(lng, 4))
    if key in seen: continue
    seen.add(key)
    tid, edge = None, False
    for t in T:
        if inside(ll, t['polygon']): tid = t['id']; break
    if not tid:
        best = min(T, key=lambda t: seg_dist(ll, t['polygon'])); tid, edge = best['id'], True
        if seg_dist(ll, best['polygon']) > 900: continue   # trop loin de toute zone de jeu
    oid = 'o-' + hashlib.sha1(f"{name}|{tag}|{lat:.5f}|{lng:.5f}".encode()).hexdigest()[:8]
    out.append({'id': oid, 'name': name.strip(), 'f': fam, 'tag': tag, 'll': ll, 't': tid, 'edge': edge, 'src': 'OpenStreetMap' if len(e) < 6 else e[5], 'q': 'osm'})
out.sort(key=lambda o: (o['t'], o['f'], o['name']))
js = ('/* Lieux du quotidien — générés par tools/build_quotidien.py depuis OpenStreetMap (© contributeurs OSM, ODbL).\n'
      '   q:"osm" = position et existence telles que déclarées dans OSM, non vérifiées sur place. Aucune description n\'est inventée. */\n'
      'window.ATLAS_QUOTIDIEN = ' + json.dumps({'families': [[f, LABEL[f]] for f, _, _ in FAM], 'places': out, 'dup': dups}, ensure_ascii=False, separators=(',', ':')) + ';\n')
open(os.path.join(ROOT, 'data', 'quotidien.js'), 'w', encoding='utf-8').write(js)
from collections import Counter
print(len(out), 'lieux ;', len(dups), 'fusionnés avec l\'atlas ;', Counter(o['f'] for o in out).most_common(), Counter(o['t'] for o in out), 'en bordure', sum(o['edge'] for o in out), 'Ko', len(js) // 1024)
