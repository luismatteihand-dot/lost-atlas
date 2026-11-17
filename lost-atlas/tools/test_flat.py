import asyncio, subprocess, time, sys
from playwright.async_api import async_playwright
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8769', '--directory', 'lost-atlas-publier'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
async def main():
    errs, reqs = [], []
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, geolocation={'latitude': 31.62944, 'longitude': -7.98944, 'accuracy': 12}, permissions=['geolocation'])
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('request', lambda r: reqs.append(r.url.split('8769/')[-1]) if 'localhost' in r.url else None)
        await pg.goto('http://localhost:8769/'); await pg.wait_for_timeout(2500)
        print('fichiers demandés :', sorted(set(reqs)))
        await pg.click('[data-act="intro-go"]'); await pg.wait_for_timeout(300)
        print('lieux', await pg.evaluate('Data.places.length'), 'marqueurs', await pg.locator('.mk').count())
        print('service worker', await pg.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)"))
        await pg.click('#fab-gps'); await pg.wait_for_timeout(1500); print('GPS', await pg.evaluate('Explore.state()'), 'point bleu', await pg.locator('.me').count())
        await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(2000)
        print('hors ligne après rechargement : lieux', await pg.evaluate('typeof Data !== "undefined" && Data.places.length'))
        await b.close()
    print('ERREURS', errs)
try: asyncio.run(main())
finally: srv.terminate()
