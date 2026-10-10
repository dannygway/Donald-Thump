// Builds one Instagram reel: hook clip + caption → bell → app fight → end card.
//
//   node tools/reel/make-reel.cjs reels/posts/2026-10-11.json
//
// Post file (paths relative to the post file):
//   {
//     "clip": "clips/windmills.mp4",   // the hook. Leave out for a placeholder slate.
//     "in": 12.4, "out": 15.9,         // seconds to use from the clip (keep it under ~4s)
//     "layout": "fit",                 // "fit" = whole 16:9 frame over a blurred fill, "cover" = crop to fill
//     "caption": "Him explaining windmills for the 400th time",
//     "appCaption": "Me:",             // optional line over the first 2s of the fight
//     "seed": 7, "fightSecs": 7,       // seed changes the fight; same seed = same fight
//     "endTitle": "Your turn.", "endSub": "Free in your browser. Link in bio.",
//     "endVoice": "quit_01.mp3"        // optional voice/ clip over the end card ("" for none)
//   }
// Output lands next to the post: <name>/reel.mp4 and <name>/cover.jpg.
// Needs ffmpeg, and the app served locally (it starts `python3 -m http.server` on :8779 if nothing is there).
const fs = require('fs'), path = require('path'), cp = require('child_process'), http = require('http');
const ROOT = path.resolve(__dirname, '../..');
const postFile = path.resolve(process.argv[2] || '');
if (!fs.existsSync(postFile)) { console.error('usage: make-reel.cjs <post.json>'); process.exit(1); }
const post = JSON.parse(fs.readFileSync(postFile, 'utf8'));
const dir = path.dirname(postFile), name = path.basename(postFile, '.json');
const OUT = path.join(dir, name), WORK = path.join(OUT, 'work');
fs.mkdirSync(WORK, { recursive: true });
const W = 1080, H = 1920, FPS = 30, FREEZE = 0.35, END = 2.8;
const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];

const ff = (args, label) => {
  const r = cp.spawnSync('ffmpeg', ['-nostdin', '-hide_banner', '-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'pipe'], timeout: 600000 });
  if (r.status !== 0) { console.error(`ffmpeg failed (${label}):\n` + (r.stderr || '')); process.exit(1); }
};
const probeDur = f => +cp.execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const hasAudio = f => cp.execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', f]).toString().trim() !== '';
const node = (script, args) => { const r = cp.spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit' }); if (r.status !== 0) process.exit(1); };
const up = () => new Promise(res => http.get('http://localhost:8779/index.html', r => { r.resume(); res(r.statusCode === 200); }).on('error', () => res(false)));

(async () => {
  // 0. local server for the recorder
  let server = null;
  if (!(await up())) {
    server = cp.spawn('python3', ['-m', 'http.server', '8779'], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 30 && !(await up()); i++) await new Promise(r => setTimeout(r, 200));
  }

  // 1. overlays
  const spec = { caption: post.caption || '', appCaption: post.appCaption, endTitle: post.endTitle, endSub: post.endSub };
  fs.writeFileSync(path.join(WORK, 'spec.json'), JSON.stringify(spec));
  node('render-cards.cjs', [path.join(WORK, 'spec.json'), WORK]);

  // 2. the fight
  const secs = post.fightSecs || 7, seed = post.seed ?? Math.floor(Math.random() * 1e6);
  const rec = path.join(WORK, `fight-${seed}-${secs}`);
  if (!fs.existsSync(path.join(rec, 'audio.json'))) node('record-app.cjs', [rec, '--seed', String(seed), '--secs', String(secs)]);
  if (server) server.kill();

  // 3. hook segment
  let clip = post.clip ? path.resolve(dir, post.clip) : null, cin = post.in || 0, cout = post.out;
  if (!clip) {   // placeholder slate so the format can be previewed before a real clip is picked
    clip = path.join(WORK, 'placeholder.mp4');
    const v = path.join(ROOT, 'voice/taunt_01.mp3'), d = Math.min(4, probeDur(v) + 0.3);
    ff(['-f', 'lavfi', '-i', `color=c=0x1b2340:s=1280x720:d=${d}:r=30`, '-i', v, '-vf',
      `drawtext=text='YOUR CLIP HERE':fontcolor=white@0.85:fontsize=84:x=(w-tw)/2:y=(h-th)/2-30,drawtext=text='16\\:9 news clip, 2-4 seconds':fontcolor=white@0.5:fontsize=36:x=(w-tw)/2:y=(h)/2+60`,
      '-shortest', ...ENC, clip], 'placeholder');
    cin = 0; cout = d;
  }
  cout = cout || probeDur(clip);
  const D = +(cout - cin).toFixed(3), HD = D + FREEZE;
  const layout = post.layout || 'fit';
  const vChain = layout === 'cover'
    ? `[0:v]trim=${cin}:${cout},setpts=PTS-STARTPTS,fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1[base]`
    : `[0:v]trim=${cin}:${cout},setpts=PTS-STARTPTS,fps=${FPS},split[a][b];` +
      `[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2,eq=brightness=-0.22:saturation=0.8[bg];` +
      `[b]scale=${W}:-2,setsar=1[fg];[bg][fg]overlay=0:(H-h)/2+90,setsar=1[base]`;
  const bell = path.join(ROOT, 'sfx/bell_01.mp3');
  const clipAud = hasAudio(clip) ? `[0:a]atrim=${cin}:${cout},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st=${Math.max(0, D - 0.12)}:d=0.12,apad=whole_dur=${HD}[ca]`
    : `anullsrc=r=48000:cl=stereo,atrim=0:${HD}[ca]`;
  ff(['-i', clip, '-loop', '1', '-t', String(HD), '-i', path.join(WORK, 'caption.png'), '-i', bell, '-filter_complex',
    `${vChain};[base]tpad=stop_mode=clone:stop_duration=${FREEZE},` +
    // freeze on his last frame and punch in, like the bell just cut him off
    `zoompan=z='if(gte(in_time,${D}),1+0.14*min(1,(in_time-${D})/${FREEZE}),1)':d=1:s=${W}x${H}:fps=${FPS}:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2'[v0];` +
    `[1:v]format=rgba,fade=in:st=0.15:d=0.15:alpha=1[cap];[v0][cap]overlay=0:0:shortest=1[v];` +
    `${clipAud};[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.9,adelay=${Math.round(D * 1000)}:all=1[bl];` +
    `[ca][bl]amix=inputs=2:normalize=0:duration=first,atrim=0:${HD}[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(HD), ...ENC, path.join(WORK, 'seg1.mp4')], 'hook');

  // 4. fight segment, soundtrack rebuilt from the app's own samples
  const ev = JSON.parse(fs.readFileSync(path.join(rec, 'audio.json'), 'utf8')).events.filter(e => e.t < secs);
  const ins = [], parts = [];
  ev.forEach((e, i) => {
    ins.push('-i', path.join(ROOT, e.file));
    const dur = e.stopAt != null ? Math.max(0.05, e.stopAt - e.t) : null;
    parts.push(`[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,asetrate=${Math.round(48000 * (e.rate || 1))},aresample=48000` +
      (dur ? `,atrim=0:${dur.toFixed(3)},afade=t=out:st=${Math.max(0, dur - 0.05).toFixed(3)}:d=0.05` : '') +
      `,volume=${(e.gain || 1).toFixed(3)},adelay=${Math.max(0, Math.round(e.t * 1000))}:all=1[e${i}]`);
  });
  const mix = ev.length ? `${parts.join(';')};${ev.map((_, i) => `[e${i}]`).join('')}amix=inputs=${ev.length}:normalize=0:duration=longest,` : 'anullsrc=r=48000:cl=stereo,';
  const appCap = post.appCaption ? ['-loop', '1', '-t', String(secs), '-i', path.join(WORK, 'app-caption.png')] : [];
  const capIdx = ev.length + 1;
  const vf = `[0:v]fps=${FPS},scale=${W}:${H},setsar=1,fade=in:st=0:d=0.12:color=white` +
    (post.appCaption ? `[f];[${capIdx}:v]format=rgba,fade=out:st=1.8:d=0.25:alpha=1[ac];[f][ac]overlay=0:0:shortest=1` : '') + '[v]';
  ff(['-framerate', String(FPS), '-i', path.join(rec, 'frames/%05d.jpg'), ...ins, ...appCap, '-filter_complex',
    `${vf};${mix}apad=whole_dur=${secs},atrim=0:${secs},alimiter=limit=0.9[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(secs), ...ENC, path.join(WORK, 'seg2.mp4')], 'fight');

  // 5. end card over his last frame, blurred
  const frames = fs.readdirSync(path.join(rec, 'frames')).sort();
  const last = path.join(rec, 'frames', frames[frames.length - 1]);
  const endVoice = post.endVoice === '' ? null : path.join(ROOT, 'voice', post.endVoice || 'quit_01.mp3');
  ff(['-loop', '1', '-t', String(END), '-i', last, '-loop', '1', '-t', String(END), '-i', path.join(WORK, 'end.png'), '-i', bell,
    ...(endVoice ? ['-i', endVoice] : []), '-filter_complex',
    `[0:v]scale=${W}:${H},boxblur=30:2,eq=brightness=-0.3,setsar=1[bg];[1:v]format=rgba,fade=in:st=0:d=0.18:alpha=1[c];[bg][c]overlay=0:0,fps=${FPS}[v];` +
    `[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.8,asplit[b1][b2];[b2]adelay=260:all=1[b2d];` +
    (endVoice ? `[3:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.1,adelay=650:all=1[vo];[b1][b2d][vo]amix=inputs=3` : `[b1][b2d]amix=inputs=2`) +
    `:normalize=0:duration=longest,apad=whole_dur=${END},atrim=0:${END},afade=t=out:st=${END - 0.3}:d=0.3[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(END), ...ENC, path.join(WORK, 'seg3.mp4')], 'end card');

  // 6. stitch, then bring the whole thing to Instagram loudness (-14 LUFS)
  fs.writeFileSync(path.join(WORK, 'list.txt'), ['seg1', 'seg2', 'seg3'].map(s => `file '${s}.mp4'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(WORK, 'list.txt'), '-c', 'copy', path.join(WORK, 'joined.mp4')], 'concat');
  const final = path.join(OUT, 'reel.mp4');
  const r = cp.spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.join(WORK, 'joined.mp4'), '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', final], { timeout: 180000 });
  if (r.status !== 0) ff(['-i', path.join(WORK, 'joined.mp4'), '-c', 'copy', '-movflags', '+faststart', final], 'copy');
  // cover: the hook frame with the caption on it
  ff(['-ss', String(Math.min(1, D / 2)), '-i', path.join(WORK, 'seg1.mp4'), '-frames:v', '1', '-q:v', '2', path.join(OUT, 'cover.jpg')], 'cover');
  console.log(`\n✔ ${path.relative(ROOT, final)}  (${probeDur(final).toFixed(1)}s, seed ${seed})`);
})();
