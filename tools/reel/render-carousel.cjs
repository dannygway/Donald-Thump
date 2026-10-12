// Renders an Instagram carousel (1080x1350 JPGs) of the drinking game's punishment cards, styled like the app.
//   node tools/reel/render-carousel.cjs <carousel.json> <outDir>
// carousel.json: { "cover": "Which one are you getting tonight?", "cards": [ { "text": "...", "rarity": "common|rare|legendary" } ],
//                  "cta": "Comment the number you got.", "sub": "Free to start. 18+. Water counts." }
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const [specFile, out] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ff = (family, weight, file) => `@font-face{font-family:"${family}";font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(__dirname, 'fonts', file)).toString('base64')}) format("woff2")}`;
const fonts = ff('Bowlby One', 400, 'BowlbyOne-400.woff2') + ff('Barlow', 600, 'Barlow-600.woff2') + ff('Barlow Condensed', 700, 'BarlowCondensed-700.woff2');
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../../icons/icon-512.png')).toString('base64');
const RAR = { common: ['COMMON', '#9fb0d6', '#16244a'], rare: ['RARE', '#f5c044', '#0a1128'], legendary: ['LEGENDARY', '#d9283f', '#fbf3e4'] };

const page = body => `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
html,body{margin:0;width:1080px;height:1350px;overflow:hidden}
body{background:radial-gradient(ellipse at 50% 38%,#24376e 0%,#0e1736 55%,#080d20 100%);color:#fbf3e4;font-family:"Barlow",sans-serif;position:relative}
body:before{content:'';position:absolute;left:50%;top:44%;width:900px;height:900px;margin:-450px 0 0 -450px;border-radius:50%;border:3px solid rgba(201,141,22,.22);box-shadow:inset 0 0 0 40px rgba(201,141,22,.05)}
.num{position:absolute;top:60px;left:70px;font:400 44px/1 "Bowlby One";color:rgba(251,243,228,.35)}
.tag{position:absolute;top:66px;right:70px;font:700 30px/1 "Barlow Condensed";letter-spacing:.2em;color:rgba(159,176,214,.7)}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:46px;padding:0 90px}
.rar{font:700 34px/1 "Barlow Condensed";letter-spacing:.24em;padding:14px 28px 13px;border-radius:999px}
.leg{box-shadow:0 0 0 6px rgba(217,40,63,.25),0 0 60px rgba(217,40,63,.55)}
.card{width:860px;background:#fbf3e4;color:#0a1128;border-radius:44px;overflow:hidden;box-shadow:0 22px 0 rgba(0,0,0,.35);transform:rotate(-2deg)}
.band{background:#d9283f;color:#fbf3e4;padding:28px 44px 25px;display:flex;justify-content:space-between;align-items:baseline}
.band b{font:400 40px/1 "Bowlby One";letter-spacing:.06em}.band span{font:700 28px/1 "Barlow Condensed";letter-spacing:.14em}
.body{padding:48px 44px 50px}.body h2{margin:0;font:400 74px/1.06 "Bowlby One";text-wrap:balance}
h1{margin:0;font:400 104px/.98 "Bowlby One";text-align:center;text-shadow:0 8px 0 #d9283f,0 16px 0 #6d0c1c;transform:rotate(-2deg);text-wrap:balance}
.sw{font:700 40px/1 "Barlow Condensed";letter-spacing:.2em;color:#f5c044}
img{width:250px;height:250px;border-radius:56px;box-shadow:0 14px 0 rgba(0,0,0,.35)}
.url{font:700 58px/1 "Barlow Condensed";letter-spacing:.04em;color:#0a1128;background:#f5c044;padding:16px 38px 18px;border-radius:999px;box-shadow:0 9px 0 #c98d16}
.sub{font:600 36px/1.25 "Barlow";color:#cdd6ee;text-align:center}
.par{position:absolute;bottom:56px;left:0;right:0;text-align:center;font:700 24px/1 "Barlow Condensed";letter-spacing:.16em;color:rgba(205,214,238,.5)}
</style></head><body>${body}<div class="par">PARODY · 18+ · NOT AFFILIATED WITH ANYONE</div></body></html>`;

const slides = [];
slides.push(page(`<div class="wrap"><img src="${icon}"><h1>${esc(spec.cover)}</h1><div class="sw">SWIPE →</div></div>`));
spec.cards.forEach((c, i) => {
  const [label, bg, fg] = RAR[c.rarity] || RAR.common;
  slides.push(page(`<div class="num">${i + 1}</div><div class="tag">THE DRINKING GAME</div><div class="wrap">
    <div class="rar ${c.rarity === 'legendary' ? 'leg' : ''}" style="background:${bg};color:${fg}">${label}</div>
    <div class="card"><div class="band"><b>THUMP SAYS</b><span>CARD ${i + 1}/${spec.cards.length}</span></div><div class="body"><h2>${esc(c.text)}</h2></div></div></div>`));
});
slides.push(page(`<div class="wrap"><h1>${esc(spec.cta)}</h1><img src="${icon}"><div class="url">donaldthump.app</div><div class="sub">${esc(spec.sub || 'Free to start. 18+. Water counts.')}</div></div>`));

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: exe });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 } })).newPage();
  for (const [i, html] of slides.entries()) {
    await p.setContent(html);
    const ok = await p.evaluate(async () => { await document.fonts.ready; return ['Bowlby One', 'Barlow', 'Barlow Condensed'].every(fam => [...document.fonts].some(f => f.family.replace(/"/g, '') === fam && f.status === 'loaded')); });
    if (!ok) { console.error('fonts failed to load'); process.exit(1); }
    await p.screenshot({ path: path.join(out, String(i + 1).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 93 });
  }
  await b.close();
  console.log(`${slides.length} slides → ${out}`);
})();
