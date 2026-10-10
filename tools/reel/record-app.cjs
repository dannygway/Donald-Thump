// Records a scripted Donald Thump fight as a frame-perfect "screen recording".
//
//   node tools/reel/record-app.cjs <outDir> [--seed 7] [--secs 8] [--url http://localhost:8779/index.html]
//
// Writes <outDir>/frames/%05d.jpg (1080x1920, 30fps) and <outDir>/audio.json — every sample and
// voice clip the app started, with its time, playback rate and gain, so make-reel can rebuild the
// soundtrack exactly (headless Chrome can't capture Web Audio).
// The page clock is faked, so frames never drop no matter how slow the machine is.
const path = require('path'), fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const args = process.argv.slice(2);
const out = args[0]; if (!out) { console.error('usage: record-app.cjs <outDir> [--seed n] [--secs n] [--url u]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const SEED = +opt('seed', Date.now() % 1e6), SECS = +opt('secs', 8), URL = opt('url', 'http://localhost:8779/index.html');
const FPS = 30, STEP = 1000 / FPS;
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());

// Fight choreography. Positions are in face space (0,0 ≈ nose; y down; head spans about ±300).
// Times are seconds from the bell. Each seed nudges positions and timings so no two reels match.
function choreo(rnd) {
  const j = (v, a) => v + (rnd() - 0.5) * 2 * a;
  const seq = [];
  let t = 0.5;
  const jab = () => { seq.push({ t, type: 'tap', at: [j(0, 90), j(-10, 70)] }); t += j(0.32, 0.08); };
  const hook = dir => { seq.push({ t, type: 'swipe', from: [dir * 300, j(20, 60)], to: [-dir * 160, j(10, 40)], dur: 0.12 }); t += j(0.55, 0.1); };
  const upper = () => { seq.push({ t, type: 'swipe', from: [j(0, 40), 330], to: [j(0, 30), 0], dur: 0.12 }); t += 0.6; };
  const hair = () => { seq.push({ t, type: 'swipe', from: [-260, -300], to: [260, -330], dur: 0.16 }); t += 0.8; };
  const hay = () => { seq.push({ t, type: 'hold', at: [j(40, 30), j(0, 30)], dur: 1.3 }); t += 2.1; };
  jab(); jab(); jab(); hook(1); jab(); jab();
  rnd() < 0.5 ? hair() : upper();
  hook(-1); jab(); jab(); hook(1);
  hay(); jab(); jab(); hook(-1);
  return seq.filter(a => a.t < SECS - 0.4);
}

(async () => {
  fs.mkdirSync(path.join(out, 'frames'), { recursive: true });
  // fonts come from Google; route them through the environment's proxy (if any) but keep localhost direct
  const px = process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=<-loopback>;localhost;127.0.0.1'] : [];
  const b = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required', ...px] });
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: false, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.clock.install({ time: new Date('2026-01-20T12:00:00') });
  await page.addInitScript(seed => {
    // seeded randomness so a seed always gives the same fight
    let s = seed >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // Web Audio runs on the real clock; make it read the fake one and log what plays
    Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { get() { return performance.now() / 1000; } });
    window.__aud = []; window.__rec0 = null;
    const urlOf = new WeakMap(), fileOf = new WeakMap();
    const f0 = window.fetch;
    window.fetch = (u, o) => f0(u, o).then(r => { const ab = r.arrayBuffer.bind(r); r.arrayBuffer = () => ab().then(a => { urlOf.set(a, String(u)); return a; }); return r; });
    const dec = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function (a, ok, bad) {
      const u = urlOf.get(a);
      const p = dec.call(this, a).then(buf => { if (u) fileOf.set(buf, u); ok && ok(buf); return buf; }, e => { bad && bad(e); throw e; });
      return p;
    };
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (d, ...r) { (this.__outs || (this.__outs = [])).push(d); return conn.call(this, d, ...r); };
    const gainTo = (n, depth) => { if (!n || depth > 6) return 1; if (n instanceof AudioDestinationNode) return 1;
      const outs = (n.__outs || []).filter(o => !(o instanceof AnalyserNode)); const g = n.gain ? n.gain.value : 1;
      return outs.length ? g * Math.max(...outs.map(o => gainTo(o, depth + 1))) : 0; };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, ...r) {
      const f = this.buffer && fileOf.get(this.buffer);
      if (f && window.__rec0 !== null) {
        const tNow = performance.now(), at = Math.max(tNow, (when || 0) * 1000);
        const rec = { t: (at - window.__rec0) / 1000, file: f.replace(/^.*\/(sfx|voice)\//, '$1/'), rate: this.playbackRate.value, gain: +gainTo(this, 0).toFixed(3) };
        window.__aud.push(rec);
        const stop = this.stop.bind(this); this.stop = (w) => { rec.stopAt = (performance.now() - window.__rec0) / 1000; try { stop(w); } catch (e) {} };
      }
      return start.call(this, when, ...r);
    };
    // the mouth follows an analyser on the live audio; feed it from the clip buffer at fake time instead
    const voices = [];
    const st2 = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, ...r) { if (this.buffer && fileOf.get(this.buffer) && /\/voice\//.test(fileOf.get(this.buffer))) voices.push({ buf: this.buffer, t0: Math.max(performance.now() / 1000, when || 0) }); return st2.call(this, when, ...r); };
    AnalyserNode.prototype.getByteTimeDomainData = function (arr) {
      const now = performance.now() / 1000; let v = null;
      for (const x of voices) { const k = Math.floor((now - x.t0) * x.buf.sampleRate); if (k >= 0 && k < x.buf.length) v = { x, k }; }
      if (!v) { arr.fill(128); return; }
      const d = v.x.buf.getChannelData(0);
      for (let i = 0; i < arr.length; i++) arr[i] = 128 + Math.max(-127, Math.min(127, (d[v.k + i] || 0) * 127));
    };
    // "show touches" dots, like an iOS screen recording, plus a status bar
    addEventListener('DOMContentLoaded', () => {
      const css = document.createElement('style');
      css.textContent = `#__sb{position:fixed;left:0;right:0;top:0;height:44px;z-index:99;display:flex;justify-content:space-between;align-items:center;padding:4px 28px 0 34px;font:600 15px/1 -apple-system,"Barlow",system-ui,sans-serif;color:#fff;pointer-events:none}
        #__sb i{display:inline-block;width:24px;height:11px;border:1.5px solid rgba(255,255,255,.55);border-radius:3.5px;position:relative;margin-left:6px;vertical-align:-1px}
        #__sb i:after{content:'';position:absolute;inset:1.5px;right:5px;background:#fff;border-radius:1.5px}
        .__t{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(255,255,255,.42);border:1.5px solid rgba(255,255,255,.7);z-index:98;pointer-events:none;transition:opacity .18s,transform .18s}
        .__t.up{opacity:0;transform:scale(1.5)}`;
      document.head.appendChild(css);
      const sb = document.createElement('div'); sb.id = '__sb'; sb.innerHTML = '<span>9:41</span><span>●●● <i></i></span>'; document.body.appendChild(sb);
      let dot = null;
      addEventListener('pointerdown', e => { dot = document.createElement('div'); dot.className = '__t'; dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; document.body.appendChild(dot); }, true);
      addEventListener('pointermove', e => { if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; } }, true);
      addEventListener('pointerup', () => { if (!dot) return; const d = dot; dot = null; d.classList.add('up'); setTimeout(() => d.remove(), 250); }, true);
    });
  }, SEED);

  const resp = await page.goto(URL);
  if (!resp || !resp.ok()) throw new Error(`could not load ${URL} (${resp && resp.status()})`);
  await page.clock.runFor(1500);
  await page.evaluate(() => document.fonts.ready);
  // let samples and clips decode (real time), then ring the bell in rage mode
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const r = [...document.querySelectorAll('#moods button')].pop(); r && r.click(); });
  // freeze the page clock: from here time only moves when we step it
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 50);
  await page.evaluate(() => { document.documentElement.style.setProperty('--st', '40px'); document.getElementById('hint').style.display = 'none'; window.__recW = performance.now(); document.getElementById('goBtn').click(); });
  for (let i = 0; i < 20; i++) { await page.clock.runFor(STEP); await page.waitForTimeout(30); }   // clips load on real-time promises

  let r = 0x9E3779B9 ^ SEED; const rnd = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return ((r >>> 0) % 1e6) / 1e6; };
  const acts = choreo(rnd);
  const toScr = ([x, y]) => page.evaluate(([x, y]) => toScreen(x, y), [x, y]);
  await page.evaluate(() => { window.__rec0 = window.__recW; });
  const warm = await page.evaluate(() => (performance.now() - window.__recW) / 1000);
  let active = null, frame = 0;
  const total = Math.round(SECS * FPS);
  for (; frame < total; frame++) {
    const t = frame / FPS;
    while (acts.length && acts[0].t <= t && !active) {
      const a = acts.shift();
      const [x0, y0] = await toScr(a.type === 'swipe' ? a.from : a.at);
      await page.mouse.move(x0, y0); await page.mouse.down();
      if (a.type === 'tap') { await page.clock.runFor(60); await page.mouse.up(); }
      else active = { a, t0: t, to: a.type === 'swipe' ? await toScr(a.to) : [x0, y0], from: [x0, y0] };
    }
    if (active) {
      const k = Math.min(1, (t - active.t0) / active.a.dur);
      if (active.a.type === 'swipe') await page.mouse.move(active.from[0] + (active.to[0] - active.from[0]) * k, active.from[1] + (active.to[1] - active.from[1]) * k);
      if (k >= 1) { await page.mouse.up(); active = null; }
    }
    await page.clock.runFor(STEP);
    await page.waitForTimeout(4);   // let decoded-audio promises settle so voice lines start on time
    await page.screenshot({ path: path.join(out, 'frames', String(frame).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    if (frame % 60 === 0) process.stdout.write(`frame ${frame}/${total}\r`);
  }
  // the clip starts after the warm-up frames; shift sounds to match and drop any from before it
  const aud = (await page.evaluate(() => window.__aud)).map(e => ({ ...e, t: +(e.t - warm).toFixed(4), stopAt: e.stopAt != null ? +(e.stopAt - warm).toFixed(4) : undefined })).filter(e => e.t >= -0.05);
  fs.writeFileSync(path.join(out, 'audio.json'), JSON.stringify({ fps: FPS, secs: SECS, seed: SEED, events: aud }, null, 1));
  console.log(`\nrecorded ${frame} frames, ${aud.length} sounds (seed ${SEED})`);
  await b.close();
})();
