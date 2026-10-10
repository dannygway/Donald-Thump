# Daily reels

Every post is the same three beats:

| Beat | Length | What happens |
|---|---|---|
| **Hook** | 2–4s | A real clip of him saying something classic, with your caption on top. On his last frame the picture freezes, punches in 14% and the **boxing bell** rings, so the bell cuts him off. |
| **Fight** | ~7s | A white flash into a "screen recording" of the app: iPhone status bar, touch dots, jabs, hooks, a hair flip or uppercut, a charged haymaker, with his voice lines and the real sound effects. Optional tag over the first 2s ("Me:"). |
| **End card** | 2.8s | His last frame, blurred. App icon, **Your turn.**, `donaldthump.app`, "Link in bio". Double bell, then him: *"Leaving already? Quitter!"* |

About 14s in total, 1080×1920, 30fps, loudness at Instagram's −14 LUFS.

## Making one

1. Drop the clip in `reels/clips/` (mp4 or mov, any size; 16:9 is fine).
2. Copy `reels/posts/example.json` to `reels/posts/2026-10-11.json` and fill it in:

```json
{
  "clip": "../clips/windmills.mp4",
  "in": 12.4, "out": 15.9,
  "layout": "fit",
  "caption": "Him explaining windmills for the 400th time",
  "appCaption": "Me:",
  "seed": 11,
  "fightSecs": 7
}
```

3. Run `node tools/reel/make-reel.cjs reels/posts/2026-10-11.json`. It takes about 1–2 minutes.
4. Post `reels/posts/2026-10-11/reel.mp4`. `cover.jpg` is the hook frame with the caption on it, for the grid.

Notes on the fields:
- **`in` / `out`**: cut it so his last word lands right on `out`, because the bell hits on that frame. End mid-sentence for a better laugh.
- **`layout`**: `fit` shows the whole 16:9 frame over a blurred fill and suits news footage. `cover` crops to fill the screen and suits close-ups.
- **`seed`**: a different seed gives a different fight (positions, timing, which lines he says). Use a new one each day, or the grid will look like reruns.
- **`appCaption`**, **`endTitle`**, **`endSub`**, **`endVoice`**: all optional. `endVoice` takes any file from `voice/`, or `""` for silence.
- Leave `clip` out to get a "YOUR CLIP HERE" slate for previewing captions.

Requirements: ffmpeg, Node 18+, Playwright with Chromium, and network access to fonts.googleapis.com, because the captions use the app's fonts. The recorder serves the repo on `localhost:8779` by itself.

### How the fight is recorded
`tools/reel/record-app.cjs` drives the real app in headless Chromium with a frozen clock. It steps exactly 1/30s per frame, so frames never drop. It scripts pointer gestures (taps, swipes, a 1.3s hold for the haymaker) and logs every sample and voice clip the app starts, with timing, playback rate and gain. `make-reel.cjs` rebuilds the soundtrack from those same files with ffmpeg, so what you hear is what the app played, frame for frame. The mouth movement is driven from the clip audio at the fake clock time, so lip sync still holds.

## Sourcing clips (read this)

This is the part that can get the account taken down, or worse. The app is a cartoon parody. A reel that uses **real footage of a real person to promote a paid app** sits in a different legal category from the app itself.

- **Copyright in the footage.** Broadcasters (CNN, Fox, etc.) own their feeds and file takedowns. Instagram strikes add up, and three can kill the account.
  - **Safest source:** video made by the US federal government is public domain in the US. That covers the official White House channel and whitehouse.gov, plus House and Senate floor feeds. Campaign footage and network broadcasts are not.
  - The UK fair-dealing exception for parody exists, but it's narrow, and "advert for my app" pushes against it.
- **Likeness and endorsement.** Never make it look like he endorses the app. The format helps, because every caption is plainly mocking him and the end card says "Parody · not affiliated". Keep it that way. No "Trump's favourite app" style jokes.
- **Don't edit what he says.** Use a clip as he said it. No re-cutting words into new sentences and no AI voice on real footage. Captions are your commentary, not quotes he didn't say.
- **Boosting a post = political ad.** Organic posts are fine. Paying to promote any post that features a politician means Meta treats it as an "ad about social issues, elections or politics". That needs ID verification and a "Paid for by" disclaimer. Don't boost these without doing that.
- **Music:** keep the clip's own audio. If you add trending audio in the Instagram app, keep it under the bell and punches.

This isn't legal advice. If the account takes off, an hour with a media lawyer is worth it.

## Posting playbook

- **Post daily at the same time.** Early evening (6–8pm) suits "bad day, thump it out".
- **The first second is the whole game.** Pick clips where he's mid-sentence at frame one. No wind-up.
- **Captions** should be the viewer's inner voice, not a description: "Him explaining windmills for the 400th time" beats "Trump talks about windmills".
- **Post caption:** one line plus "Link in bio 🥊" and 3–5 hashtags at most.
- **Bio link:** `donaldthump.app/?ref=ig`, so Instagram traffic can be told apart later.
- **Pin your three best reels** once you know which ones they are.
- **Batch it:** write a week of post JSONs on Sunday, render them all, then schedule them in Meta Business Suite.
