import asyncio, subprocess, time, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8768', '--directory', 'lost-atlas'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block')
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        await pg.goto('http://localhost:8768/index.html'); await pg.wait_for_timeout(1200); await pg.click('[data-act="intro-go"]'); await pg.add_style_tag(content='#cardfx{display:none!important}')
        r = await pg.evaluate("(() => { const c = Data.places.filter(p => p.ref === p.id), n = c.map(p => p.num); const k = c.filter(p => p.kind === 'culture'); return [c.length, new Set(n).size, Math.min(...n), Math.max(...n), Data.places.filter(p => p.ref !== p.id).every(p => p.num === Data.P[p.ref].num), k.length, Math.max(...k.map(p => p.num))]; })()")
        print('numéros : lieux, distincts, min, max, doublons de carte alignés, culture 1-53 →', r)
        lab = await pg.evaluate("[...document.querySelectorAll('.mk b')].map(b => b.textContent)")
        print('marqueurs affichés', len(lab), 'distincts', len(set(lab)))
        await pg.screenshot(path='n1.png')
        await pg.click('#tabbar [data-v="quetes"]'); await pg.wait_for_timeout(200); print('quêtes de territoire', await pg.locator('.tq').count())
        await pg.click('.tq[data-id="t2"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='n2.png'); await pg.click('#sh-close')
        await pg.evaluate("""(() => { ['t2-x-mouassine','t2-05','t2-09','t2-10','t2-08','t2-01','t2-07'].forEach(i => Game.discover(i, 'manuel'));
          ['t2-05','t2-09'].forEach(i => Game.observeDone(Game.chKey(i,'observe'), Data.P[i].fiche.observe, 'culture', 'une hypothèse assez longue', 1, 'x')); UI.after(); })()""")
        print('avant de garder', await pg.evaluate("!!Game.S.v3.cards['c-terr-t2']"))
        await pg.evaluate("(() => { Game.S.v3.kept.push({ id: 'k1', at: Date.now(), txt: 'porte', pos: Data.P['t2-05'].pos, t: 't2' }); Game.save(); UI.after(); })()"); await pg.wait_for_timeout(300)
        print('après', await pg.evaluate("!!Game.S.v3.cards['c-terr-t2']"), 'sons', await pg.evaluate("Sound.log.slice(-2).map(e => e.name)"))
        t0 = await pg.evaluate("Game.S.v3.cards['c-terr-t2']"); await pg.evaluate("UI.after()"); print('pas de second octroi', t0 == await pg.evaluate("Game.S.v3.cards['c-terr-t2']"))
        await pg.click('.tq[data-id="t2"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='n3.png'); await pg.click('#sh-close')
        await pg.evaluate("UI.show('atlas'); UI.openTerritory('t2')"); await pg.wait_for_timeout(200); await pg.fill('.search', '12'); print('recherche par numéro', await pg.locator('.row[data-name]:visible').count()); await pg.screenshot(path='n4.png')
        await pg.click('#sheet-body [data-act="open-tq"]'); print('ouverture depuis le territoire', await pg.locator('#sheet-body .room').count())
        await b.close()
    print('ERRORS', errs)
try: asyncio.run(main())
finally: srv.terminate()
