#!/usr/bin/env python3
"""Regroupe les JSON de /data dans data/bundle.js (secours quand fetch est impossible : ouverture directe du fichier, etc.).
À relancer après toute modification des contenus :  python3 tools/build_bundle.py
Vérifie au passage que toutes les références croisées existent."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ['territories', 'places', 'fiches', 'codex', 'quests', 'artifacts', 'progression']
d = {f: json.load(open(os.path.join(ROOT, 'data', f + '.json'), encoding='utf-8')) for f in FILES}
P = {p['id'] for p in d['places']}; C = {e['id'] for e in d['codex']['entries']}; Q = {q['id'] for q in d['quests']}
A = {a['id'] for a in d['artifacts']}; CH = {c['id'] for c in d['codex']['chains']}; T = {t['id'] for t in d['territories']}; SRC = set(d['codex']['sources'])
errs = []
def chk(ok, msg):
    if not ok: errs.append(msg)
def cond(c, where):
    if not isinstance(c, dict): return chk(False, where + ': condition invalide')
    for k in ('all', 'any'):
        for x in c.get(k, []): cond(x, where)
    for k, S in (('place', P), ('mastered', P), ('quest', Q), ('chain', CH), ('codex', C), ('territory', T)):
        if k in c: chk(c[k] in S, '%s: %s inconnu : %s' % (where, k, c[k]))
for pid in d['fiches']: chk(pid in P, 'fiche sans lieu : ' + pid)
for p in d['places']: chk(p['t'] in T, 'territoire inconnu : ' + p['id'])
for e in d['codex']['entries']:
    cond(e['unlock'], e['id'])
    for l in e.get('links', []): chk(l in C, e['id'] + ' : lien inconnu ' + l)
    for p in e.get('places', []): chk(p in P, e['id'] + ' : lieu inconnu ' + p)
    for s in e.get('sources', []): chk(s in SRC, e['id'] + ' : source inconnue ' + s)
    for b in e['body']: chk(b['k'] in d['codex']['kinds'], e['id'] + ' : marque inconnue ' + b['k'])
for c in d['codex']['chains']:
    for n in c['nodes']: chk(n in C, c['id'] + ' : maillon inconnu ' + n)
for q in d['quests']:
    if 'requires' in q: cond(q['requires'], q['id'])
    if q['reward'].get('artifact'): chk(q['reward']['artifact'] in A, q['id'] + ' : artefact inconnu')
    chk(len(q['hints']) == 3, q['id'] + ' : il faut 3 indices')
    for s in q['steps']:
        for p in ([s['place']] if 'place' in s else []) + s.get('places', []): chk(p in P, q['id'] + ' : lieu inconnu ' + p)
        chk(s['type'] in ('visit','anyvisit','place-observe','place-enigma','challenge','collect','photo','keep','echo'), q['id'] + ' : type d\'étape inconnu ' + s['type'])
        if s['type'] == 'place-observe': chk('observe' in d['fiches'].get(s['place'], {}), q['id'] + ' : pas d\'observation sur ' + s['place'])
for a in d['artifacts']: cond(a['unlock'], a['id'])
for k in ('titles', 'badges'):
    for x in d['progression'][k]: cond(x['unlock'], x['id'])
for pid, f in d['fiches'].items():
    if 'enigma' in f: chk(len(f['enigma']['hints']) == 3, pid + ' : il faut 3 indices')
if errs:
    print('\n'.join(errs)); sys.exit(1)
open(os.path.join(ROOT, 'data', 'bundle.js'), 'w', encoding='utf-8').write('window.ATLAS_DATA=' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('bundle.js écrit —', len(d['places']), 'lieux,', len(C), 'savoirs,', len(Q), 'quêtes,', len(A), 'artefacts, références OK')
