import asyncio, subprocess, time, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8771', '--directory', 'lost-atlas'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = 'http://localhost:8771/index.html'
R = []
def ok(name, cond, extra=''):
    R.append((name, bool(cond))); print(('OK   ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra != '' else ''))
def off(ll, m): return (ll[0] + m / 111320.0, ll[1])
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        async def fresh(geo):
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block', geolocation={'latitude': geo[0], 'longitude': geo[1], 'accuracy': 10}, permissions=['geolocation'])
            pg = await ctx.new_page()
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'tile.openstreetmap' not in m.text and 'ERR_' not in m.text else None)
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
            await pg.goto(URL); await pg.wait_for_timeout(1200); await pg.click('[data-act="intro-go"]'); await pg.wait_for_timeout(300)
            await pg.add_style_tag(content='#cardfx{display:none!important}')
            return ctx, pg
        sim = lambda pg, ll, acc=10, raw=False: pg.evaluate(f"AtlasMap.simulate({ll[0]}, {ll[1]}, {acc}, {'true' if raw else 'false'})")
        names = lambda pg: pg.evaluate("Sound.log.map(e => e.name)")
        far = (31.6500, -7.9600)
        ctx, pg = await fresh(far)
        KID = await pg.evaluate("(() => { const T = Explore.targets(); const t = T.find(a => a.kind === 'important' && !T.some(b => b !== a && Game.dist(a.ll, b.ll) < 260)) || T.find(a => a.kind === 'lieu' && !T.some(b => b !== a && Game.dist(a.ll, b.ll) < 200)); return t && [t.ref, t.kind, t.far]; })()"); print('lieu isolé :', KID); KID, KK, KF = KID
        K = await pg.evaluate(f"Game.pos('{KID}').ll"); P = await pg.evaluate("Game.pos('t1-x-place').ll")
        # --- moteur générique ---
        t = await pg.evaluate("Explore.targets().map(t => t.kind)")
        ok('moteur générique : chaque cible déclare id, catégorie, position, rayons, priorité', await pg.evaluate("Explore.targets().every(t => t.id && t.kind && t.ll && t.prio > 0 && (t.far > 0 || t.near > 0))") and len(t) > 40, len(t))
        ok('catégories présentes : lieux, lieux importants, secrets, donjons', all(k in t for k in ('lieu', 'important', 'secret', 'aventure')), sorted(set(t)))
        await pg.evaluate("Explore.register(() => [{ id: 'x:test', kind: 'lieu', ll: [31.7, -7.9] }])")
        ok('un nouveau type de contenu se branche sans toucher au moteur', await pg.evaluate("Explore.targets().some(t => t.id === 'x:test' && t.far === 75 && t.near === 30)"))
        ok('pas de doublon : une seule cible par identifiant', await pg.evaluate("(() => { const i = Explore.targets().map(t => t.id); return new Set(i).size === i.length; })()"))
        # --- deux temps sur un lieu important ---
        await pg.click('#xpill'); await pg.click('[data-act="x-toggle"]'); await pg.wait_for_timeout(1200); await pg.click('#sh-close')
        await pg.evaluate('Explore.cfg.minGap = 0')
        await sim(pg, off(K, 300)); ok('300 m : silence', await names(pg) == [])
        await sim(pg, off(K, KF - 15)); n1 = await names(pg)
        ok('à l\'approche d\'un lieu : premier signal, « quelque chose approche »', n1 == [KK], n1)
        await sim(pg, off(K, KF - 20)); await sim(pg, off(K, KF - 30)); ok('on continue d\'approcher : pas de répétition', await names(pg) == n1, await names(pg))
        await sim(pg, off(K, 25)); n2 = await names(pg)
        ok('25 m : second signal, différent, « tout près »', n2 == [KK, 'proche'], n2)
        ok('le message du second temps invite à regarder', 'près' in (await pg.locator('.toast').last.inner_text()).lower(), await pg.locator('.toast').last.inner_text())
        for m in (28, 34, 27, 36, 29): await sim(pg, off(K, m))
        ok('GPS qui oscille autour de 30 m : aucun signal en double (hystérésis)', await names(pg) == n2, await names(pg))
        ok('rien n\'est révélé sans le joueur', await pg.evaluate(f"Game.status('{KID}')") != 'discovered' and await pg.locator('#radar.here').count() == 1)
        await sim(pg, off(K, 25), 150); ok('position imprécise (± 150 m) : aucun signal, état « imprécis »', await names(pg) == n2 and await pg.evaluate('Explore.state()') == 'weak')
        await pg.evaluate("document.querySelector('#radar').click()"); await sim(pg, off(K, 20)); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('#radar').click()"); await pg.click('[data-act="here"]'); await pg.wait_for_timeout(400)
        ok('révélation par le joueur : lieu découvert, carte gagnée', await pg.evaluate(f"Game.pget('{KID}').how") == 'gps' and 'decouverte' in await names(pg), await names(pg))
        await pg.evaluate("UI.closeSheet ? UI.closeSheet() : document.querySelector('#sh-close').click()"); await pg.wait_for_timeout(200)
        before = len(await names(pg)); await sim(pg, off(K, 300)); await sim(pg, off(K, 30))
        ok('lieu déjà découvert : plus aucun signal pour lui', KK not in (await names(pg))[before:] and 'proche' not in (await names(pg))[before:], (await names(pg))[before:])
        # --- positions aberrantes ---
        await sim(pg, off(K, 30), 10, True); r0 = await pg.evaluate('AtlasMap.rejected()'); f0 = await pg.evaluate('AtlasMap.fix().ll[0]')
        await sim(pg, off(K, 900), 10, True)
        ok('saut de 870 m en une seconde : position ignorée', await pg.evaluate('AtlasMap.rejected()') == r0 + 1 and abs(await pg.evaluate('AtlasMap.fix().ll[0]') - f0) < 1e-7)
        await sim(pg, off(K, 36), 10, True); ok('position cohérente suivante : acceptée', abs(await pg.evaluate('AtlasMap.fix().ll[0]') - off(K, 36)[0]) < 1e-7)
        for _ in range(4): await sim(pg, off(K, 900), 10, True)
        ok('le saut se confirme (quatre positions) : on finit par le croire, jamais de blocage', abs(await pg.evaluate('AtlasMap.fix().ll[0]') - off(K, 900)[0]) < 1e-7, await pg.evaluate('AtlasMap.rejected()'))
        await ctx.close()
        # --- quêtes : signal, suivi, mécaniques ---
        ctx, pg = await fresh(far)
        await pg.click('#tabbar [data-v="quetes"]'); await pg.wait_for_timeout(300)
        ok('catalogue par mécanique, sans onglets ni formulaire', await pg.locator('.qsec').count() >= 6 and await pg.locator('[data-act="quest-tab"]').count() == 0, await pg.locator('.qsec').count())
        ok('chaque quête a une mécanique et un niveau d\'engagement', await pg.evaluate("Data.quests.every(q => q.mech && [1, 2, 3].includes(q.lvl))"), await pg.evaluate("Data.quests.length"))
        await pg.screenshot(path='v5-quetes.png', full_page=False)
        await pg.click('[data-act="open-quest"][data-id="q-x-places"]'); await pg.wait_for_timeout(300)
        ok('fiche de quête : aucun champ à remplir', await pg.locator('#sheet input[type=text], #sheet textarea').count() == 0)
        ok('sans GPS : la fiche ne prétend aucune distance', await pg.locator('.qcompass.off').count() == 1 or await pg.locator('.qcompass').count() == 0)
        await pg.screenshot(path='v5-quete.png')
        await pg.click('[data-act="quest-follow"]'); await pg.wait_for_timeout(200)
        ok('quête suivie : enregistrée', await pg.evaluate("!!Game.S.v3.follow['q-x-places']"))
        await pg.click('#sh-close'); await pg.click('#tabbar [data-v="atlas"]')
        ok('ses lieux deviennent des cibles « quête »', await pg.evaluate("Explore.targets().filter(t => t.kind === 'quete').map(t => t.ref).sort().join()") == 't1-x-place,t2-09', await pg.evaluate("Explore.targets().filter(t => t.kind === 'quete').map(t => t.ref)"))
        await pg.click('#xpill'); await pg.click('[data-act="x-toggle"]'); await pg.wait_for_timeout(1200); await pg.click('#sh-close'); await pg.evaluate('Explore.cfg.minGap = 0')
        await sim(pg, off(P, 60)); n = await names(pg)
        ok('60 m d\'un lieu de quête suivie : signal propre aux quêtes', 'quete' in n, n)
        await pg.click('.toast >> nth=-1'); await pg.wait_for_timeout(300)
        ok('toucher le signal ouvre la quête', await pg.locator('#sheet .qhead').count() == 1)
        ok('avec GPS : distance et direction, pas d\'itinéraire', await pg.locator('.qcompass:not(.off)').count() == 1 and 'vol' in (await pg.locator('.qcompass').inner_text()).lower(), await pg.locator('.qcompass').first.inner_text())
        await pg.click('#sh-close'); await sim(pg, off(P, 10)); await pg.wait_for_timeout(200)
        for _ in range(5):   # plusieurs lieux se chevauchent sur la place : le joueur les révèle un à un
            if await pg.evaluate("Game.disc('t1-x-place')") or await pg.locator('#radar.here').count() == 0: break
            await pg.evaluate("document.querySelector('#radar').click()"); await pg.click('[data-act="here"]'); await pg.wait_for_timeout(300); await pg.click('#sh-close'); await sim(pg, off(P, 10)); await pg.wait_for_timeout(150)
        print('  trouvés :', await pg.evaluate("Data.places.filter(p => Game.disc(p.id)).map(p => p.id)"), await pg.locator('#radar').inner_text())
        ok('premier lieu trouvé : la quête avance sans rien valider', await pg.evaluate("Game.questStatus(Data.Q['q-x-places'])") == 'active' and await pg.evaluate("Game.stepDone(Data.Q['q-x-places'], 0)"))
        # mécaniques : collection, photo, garder
        await pg.evaluate("['t4-x-agnaou', 't5-01'].forEach(i => Game.discover(i, 'manuel')); UI.after()")
        ok('collection : 2 portes sur 3, quête en cours', await pg.evaluate("Game.questStatus(Data.Q['q-x-portes'])") == 'active')
        await pg.evaluate("Game.discover('t3-x-debbagh', 'manuel'); UI.after()"); await pg.wait_for_timeout(300)
        ok('collection : 3 portes, quête accomplie et carte spéciale gagnée', await pg.evaluate("Game.questStatus(Data.Q['q-x-portes'])") == 'done' and await pg.evaluate("!!Game.S.v3.cards['c-q-portes']"), await pg.evaluate("Object.keys(Game.S.v3.cards)"))
        ok('quête « garder » : non accomplie à vide', await pg.evaluate("Game.questStatus(Data.Q['q-x-garde'])") != 'done')
        ok('quête photo : non accomplie à vide', await pg.evaluate("Game.questStatus(Data.Q['q-x-yeux'])") != 'done')
        # épreuves sans formulaire
        await pg.evaluate("Game.discover('t3-01', 'manuel'); UI.after(); Views.actions['open-place'] ? 0 : 0"); await pg.evaluate("UI.openPlace ? UI.openPlace('t3-01') : document.querySelector('[data-act=\"open-place\"][data-id=\"t3-01\"]')")
        await pg.wait_for_timeout(300)
        if await pg.locator('[data-act="obs-go"]').count() == 0:
            await pg.evaluate("(Views.actions['open-place'] || (() => 0))({ dataset: { id: 't3-01' } })"); await pg.wait_for_timeout(300)
        ok('observation : une question et un seul geste', await pg.locator('[data-act="obs-go"]').count() >= 1 and await pg.locator('#sheet textarea[id^="hyp-"]').count() == 0, await pg.locator('[data-act="obs-go"]').count())
        if await pg.locator('[data-act="obs-go"]').count():
            await pg.locator('[data-act="obs-go"]').first.click(); await pg.wait_for_timeout(300)
            ok('après le regard : la révélation, et l\'approfondissement reste facultatif', await pg.locator('.reveal-txt').count() >= 1 and await pg.locator('details.deeper').count() >= 1 and await pg.locator('details.deeper[open]').count() == 0)
            await pg.screenshot(path='v5-lieu.png')
        # sauvegarde
        await pg.reload(); await pg.wait_for_timeout(1200)
        ok('après rechargement : quêtes, suivi et cartes conservés', await pg.evaluate("Game.questStatus(Data.Q['q-x-portes'])") == 'done' and await pg.evaluate("!!Game.S.v3.follow['q-x-places'] && !!Game.S.v3.cards['c-q-portes']"))
        # ancienne sauvegarde v4.2
        await pg.evaluate("""(() => { const s = JSON.parse(localStorage.getItem('lostAtlas.save.v1')); delete s.v3.follow; s.settings.explore && delete s.settings.explore.cats.quete; localStorage.setItem('lostAtlas.save.v1', JSON.stringify(s)); })()""")
        await pg.reload(); await pg.wait_for_timeout(1200)
        ok('sauvegarde v4.2 (sans suivi ni catégorie quête) : reprise sans perte', await pg.evaluate("Game.status('t3-x-debbagh')") in ('discovered', 'mastered') and await pg.evaluate("Explore.targets().length") > 40)
        for v in ('quetes', 'collection', 'carnet', 'profil'):
            await pg.click(f'#tabbar [data-v="{v}"]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'v5-{v}.png')
            ok(f'{v} : pas de débordement horizontal', await pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        await pg.click('#tabbar [data-v="atlas"]'); await pg.wait_for_timeout(500); await pg.screenshot(path='v5-carte.png')
        await ctx.close(); await b.close()
    ok('aucune erreur JavaScript', not errs, errs[:3])
    print(f"\n{sum(1 for r in R if r[1])} / {len(R)} tests réussis")
try: asyncio.run(main())
finally: srv.terminate()
