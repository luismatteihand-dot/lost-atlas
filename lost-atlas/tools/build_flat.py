#!/usr/bin/env python3
"""Fabrique la version à publier depuis un iPhone : six fichiers, aucun dossier.
   index.html contient tout (styles, scripts, données, carte) ; restent à côté le service worker,
   le manifest et trois icônes. Les sources modulaires ne sont pas modifiées.
   Usage : python3 tools/build_flat.py  ->  ../lost-atlas-publier/"""
import re, os, json, shutil, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(ROOT), 'lost-atlas-publier')
rd = lambda p: open(os.path.join(ROOT, p), encoding='utf8').read()
html = rd('index.html')
def css(m): return '<style>\n' + rd(m.group(1)) + '\n</style>'
def js(m):
    src = rd(m.group(1)).replace('</script', '<\\/script')
    return '<script>\n' + src + '\n</script>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
html = html.replace('<script src="vendor/leaflet.js"></script>', '<script>window.ATLAS_FLAT = true;</script>\n<script src="vendor/leaflet.js"></script>')
html = re.sub(r'<script src="([^"]+)"></script>', js, html)
html = html.replace('assets/icon-', 'icon-')
assert 'src="' not in html.split('<body>')[0] and '<script src=' not in html, 'ressource externe restante'
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(html)
man = json.loads(rd('manifest.json'))
for i in man['icons']: i['src'] = i['src'].replace('assets/', '')
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
for n in ('icon-180.png', 'icon-192.png', 'icon-512.png'): shutil.copy(os.path.join(ROOT, 'assets', n), os.path.join(OUT, n))
ver = 'lost-atlas-flat-' + hashlib.sha1(html.encode()).hexdigest()[:10]      # change à chaque contenu : le cache se renouvelle seul
sw = rd('service-worker.js')
sw = re.sub(r"const VERSION = '[^']+';", "const VERSION = '%s';" % ver, sw)
sw = re.sub(r"const SHELL = \[[\s\S]*?\];", "const SHELL = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];", sw)
open(os.path.join(OUT, 'service-worker.js'), 'w', encoding='utf8').write(sw)
print('version à publier :', OUT)
for n in sorted(os.listdir(OUT)): print('  %-20s %7.0f Ko' % (n, os.path.getsize(os.path.join(OUT, n)) / 1024))
