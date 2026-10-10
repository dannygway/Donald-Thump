// Renders the reel's text overlays as transparent 1080x1920 PNGs in the app's own fonts.
//   node tools/reel/render-cards.cjs <spec.json> <outDir>
// spec: { caption, appCaption?, endTitle?, endSub?, iconPath? }
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const [specFile, out] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = 'data:image/png;base64,' + fs.readFileSync(spec.iconPath || path.join(__dirname, '../../icons/icon-512.png')).toString('base64');

const base = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@600&display=block" rel="stylesheet">
<style>html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}
*{box-sizing:border-box}
.cap{position:absolute;left:70px;right:70px;display:flex;justify-content:center}
.cap span{display:inline;font:400 64px/1.52 "Bowlby One",Impact,sans-serif;color:#0a1128;background:#fbf3e4;padding:4px 22px 9px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone;border-radius:14px;text-align:center}
.cap p{margin:0;text-align:center;transform:rotate(-1.5deg)}
.small span{font-size:58px;background:#0a1128;color:#fbf3e4;box-shadow:0 0 0 4px #f5c044}
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding-bottom:120px}
.end img{width:300px;height:300px;border-radius:66px;box-shadow:0 18px 0 rgba(0,0,0,.35)}
.end h1{margin:0;font:400 120px/.92 "Bowlby One",Impact,sans-serif;color:#fbf3e4;text-align:center;text-shadow:0 8px 0 #d9283f,0 16px 0 #6d0c1c;transform:rotate(-2deg)}
.end .url{font:700 64px/1 "Barlow Condensed",sans-serif;letter-spacing:.04em;color:#0a1128;background:#f5c044;padding:16px 38px 18px;border-radius:999px;box-shadow:0 9px 0 #b8860b}
.end .sub{font:600 38px/1.2 "Barlow",sans-serif;color:#cdd6ee;text-align:center}
.end .par{position:absolute;bottom:430px;font:700 28px/1 "Barlow Condensed",sans-serif;letter-spacing:.14em;color:rgba(205,214,238,.6);text-transform:uppercase}
</style></head><body>`;

const cards = {
  'caption.png': `<div class="cap" style="top:330px"><p><span>${esc(spec.caption)}</span></p></div>`,
  'end.png': `<div class="end"><img src="${icon}"><h1>${esc(spec.endTitle || 'Your turn.')}</h1><div class="url">donaldthump.app</div>
     <div class="sub">${esc(spec.endSub || 'Free in your browser. Link in bio.')}</div><div class="par">Parody · not affiliated with anyone</div></div>`,
};
if (spec.appCaption) cards['app-caption.png'] = `<div class="cap small" style="top:445px"><p><span>${esc(spec.appCaption)}</span></p></div>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const px = process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : [];
  const b = await chromium.launch({ executablePath: exe, args: px });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 }, ignoreHTTPSErrors: true })).newPage();
  for (const [name, html] of Object.entries(cards)) {
    // fonts.ready can resolve before the webfont request even starts; ask for each face explicitly,
    // and retry a couple of times because the font CDN occasionally stalls
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await p.setContent(base + html + '</body></html>', { waitUntil: 'networkidle', timeout: 30000 });
        ok = await p.evaluate(async () => {
          const faces = ['400 64px "Bowlby One"', '700 64px "Barlow Condensed"', '600 38px "Barlow"'];
          await Promise.all(faces.map(f => document.fonts.load(f)));
          return faces.every(f => document.fonts.check(f));
        });
      } catch (e) { console.error(`card ${name}: attempt ${attempt + 1} failed (${e.message.split('\n')[0]})`); }
    }
    if (!ok) { console.error('webfonts failed to load (needs network access to fonts.googleapis.com)'); process.exit(1); }
    await p.screenshot({ path: path.join(out, name), omitBackground: true });
  }
  await b.close();
  console.log('cards:', Object.keys(cards).join(', '));
})();
