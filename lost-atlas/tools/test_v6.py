import asyncio, subprocess, time, sys, json
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8799', '--directory', 'lost-atlas'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
URL = 'http://localhost:8799/index.html'; R = []
def ok(name, cond, extra=''):
    R.append(bool(cond)); print(('OK   ' if cond else 'FAIL ') + name + (' — ' + str(extra) if extra != '' else ''))
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        async def fresh(geo=(31.65, -7.96)):
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block', geolocation={'latitude': geo[0], 'longitude': geo[1], 'accuracy': 10}, permissions=['geolocation'])
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'tile.openstreetmap' not in m.text and 'ERR_' not in m.text and 'boom' not in m.text else None)
            await pg.goto(URL); await pg.wait_for_timeout(1300); await pg.click('[data-act="intro-go"]'); await pg.wait_for_timeout(300)
            await pg.add_style_tag(content='#cardfx{display:none!important}')
            return ctx, pg
        ctx, pg = await fresh()
        # --- lieux muets et brume ---
        await pg.evaluate("AtlasMap.leaflet().setView([31.6258, -7.9891], 17)"); await pg.wait_for_timeout(400)
        tips = await pg.evaluate("document.querySelectorAll('.lbl.leaflet-tooltip').length")
        ok('lieux muets : aucun nom affiché pour un lieu jamais trouvé', tips == 0, tips)
        ok('brume : les six territoires sont « terra incognita » au départ', await pg.locator('.zone-lbl.fog').count() == 6)
        await pg.screenshot(path='v6-brume.png')
        await pg.evaluate("Game.discover('t2-x-mouassine', 'manuel'); UI.after()"); await pg.wait_for_timeout(300)
        ok('un lieu trouvé : son nom apparaît, la brume se lève sur son territoire', await pg.evaluate("document.querySelectorAll('.lbl.leaflet-tooltip').length") >= 1 and await pg.locator('.zone-lbl.fog').count() == 5)
        # --- la piste ---
        await pg.evaluate("UI.openPlace('t2-x-mouassine')"); await pg.wait_for_timeout(300)
        lead = await pg.evaluate("Trace.nextLead('t2-x-mouassine')")
        txt = await pg.locator('.lead').inner_text()
        ok('après une découverte : une piste vers la page blanche la plus proche', lead and not await pg.evaluate(f"Game.disc('{lead['id']}')") and 'vers' in txt, txt.replace('\n', ' '))
        ok('la piste donne une direction, jamais le nom ni la position exacte', await pg.evaluate(f"Data.P['{lead['id']}'].name") not in txt and 'environ' in txt or 'moins de' in txt)
        await pg.click('[data-act="lead-follow"]'); await pg.wait_for_timeout(600)
        ok('« Suivre la piste » : une flèche à l\'encre sur la carte, depuis le lieu trouvé', await pg.locator('.lead-tip').count() == 1 and await pg.evaluate("UI.view") == 'atlas')
        await pg.screenshot(path='v6-piste.png')
        # --- le tracé ---
        start = [31.6240, -7.9890]
        n0 = await pg.evaluate("V3.st().trail.length")
        for i in range(12):
            await pg.evaluate(f"AtlasMap.simulate({start[0] + i * 0.00027}, {start[1]}, 10)")   # ~30 m par pas
        await pg.wait_for_timeout(300)
        n1 = await pg.evaluate("V3.st().trail.length")
        ok('tracé : un point tous les ~30 m de marche', n1 - n0 == 12, n1 - n0)
        await pg.evaluate(f"AtlasMap.simulate({start[0] + 11 * 0.00027 + 0.00005}, {start[1]}, 10)")
        ok('tracé : un pas de 5 m n\'ajoute rien', await pg.evaluate("V3.st().trail.length") == n1)
        await pg.evaluate(f"AtlasMap.simulate({start[0] + 0.0040}, {start[1]}, 80)")
        ok('tracé : une position imprécise (± 80 m) n\'est jamais tracée', await pg.evaluate("V3.st().trail.length") == n1)
        ok('premier pas dans un territoire : noté, brume levée, rang « Passant »', await pg.evaluate("Trace.walked('t1')") and await pg.evaluate("Quotidien.terrStats('t1').rank") == 'Passant' and await pg.locator('.zone-lbl.fog').count() == 4)
        dist = await pg.evaluate("Trace.distance()")
        ok('distance relevée cohérente (~330 m)', 280 < dist < 380, round(dist))
        ok('le tracé est dessiné sur la carte (canvas)', await pg.evaluate("!!document.querySelector('.leaflet-overlay-pane canvas')"))
        await pg.evaluate("AtlasMap.leaflet().setView([31.6255, -7.9890], 17)"); await pg.wait_for_timeout(400); await pg.screenshot(path='v6-trace.png')
        await pg.evaluate("document.querySelector('#tabbar [data-v=profil]').click()"); await pg.wait_for_timeout(300)
        ok('Héros : kilomètres à pied relevés par le GPS', 'à pied' in (await pg.locator('.stats').inner_text()).lower())
        await pg.evaluate("document.querySelector('#tabbar [data-v=atlas]').click()")
        # --- performance de la carte ---
        r = await pg.evaluate("""(() => { const n0 = AtlasMap.rebuilds(); let t = performance.now(); for (let i = 0; i < 30; i++) UI.after(); const idle = (performance.now() - t) / 30;
          t = performance.now(); for (let i = 0; i < 10; i++) AtlasMap.refresh(true); const full = (performance.now() - t) / 10; return { rebuilt: AtlasMap.rebuilds() - n0 - 10, idle, full }; })()""")
        ok('carte : 30 gestes sans changement → aucune reconstruction des marqueurs', r['rebuilt'] == 0, r)
        ok('carte : un geste sans changement coûte nettement moins qu\'une reconstruction', r['idle'] < r['full'] * 0.6, f"{r['idle']:.1f} ms contre {r['full']:.1f} ms")
        # --- robustesse ---
        await pg.evaluate("Views.actions['boom'] = () => { throw new Error('boom test'); }; const b = document.createElement('button'); b.dataset.act = 'boom'; b.id = 'boom'; b.textContent = 'x'; document.body.appendChild(b);")
        await pg.evaluate("document.getElementById('boom').click()"); await pg.wait_for_timeout(200)
        ok('un geste qui plante : message calme, l\'erreur est notée', 'pas abouti' in await pg.locator('.toast').last.inner_text() and await pg.evaluate("Diag.errors().length") >= 1)
        await pg.click('#fab-layers'); await pg.wait_for_timeout(200)
        ok('…et le jeu continue de répondre', await pg.locator('#sheet [data-act="trail-layer"]').count() == 1)
        await pg.click('[data-act="trail-layer"]'); await pg.wait_for_timeout(200)
        ok('calque « Mon tracé » masquable', await pg.evaluate("Game.S.settings.layers.trail === false"))
        await ctx.close()
        # --- migration d'une ancienne sauvegarde ---
        ctx, pg = await fresh()
        old = json.loads(open('lost-atlas-sauvegarde-complete.json', encoding='utf8').read()); old['v'] = 1; old['v3'].pop('trail', None); old['v3'].pop('walked', None)
        await pg.evaluate("s => { localStorage.clear(); localStorage.setItem('lostAtlas.save.v1', s); }", json.dumps(old)); await pg.reload(); await pg.wait_for_timeout(1500)
        m = await pg.evaluate("({ v: Game.S.v, bk: !!localStorage.getItem('lostAtlas.save.v1.avant-v2'), q: Data.quests.filter(q => Game.questStatus(q) === 'done').length, cards: Object.keys(V3.st().cards).length, trail: Array.isArray(V3.st().trail) })")
        ok('migration v1 → v2 : copie de secours, quêtes et cartes intactes', m['v'] == 2 and m['bk'] and m['q'] == 49 and m['cards'] >= 20 and m['trail'], m)
        ok('partie terminée : la brume est levée partout (lieux découverts)', await pg.locator('.zone-lbl.fog').count() == 0)
        await pg.reload(); await pg.wait_for_timeout(1300)
        ok('la copie de secours n\'est faite qu\'une fois', await pg.evaluate("JSON.parse(localStorage.getItem('lostAtlas.save.v1.avant-v2')).v") == 1)
        await ctx.close(); await b.close()
    ok('aucune erreur JavaScript', not errs, errs[:4])
    print(f"\n{sum(R)} / {len(R)} tests réussis")
try: asyncio.run(main())
finally: srv.terminate()
