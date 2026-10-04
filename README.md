# Donald Thump

A stress-relief toy: punch a rubbery cartoon caricature until your blood pressure comes down.

Open `index.html` in any modern browser (phone or desktop). No build step and no assets: the art is vector drawing in code and every sound is synthesised live with the Web Audio API.

## Install it like an app
Host the folder anywhere with HTTPS (GitHub Pages works). On a phone, open it and choose **Add to Home Screen**. It runs full-screen with its own icon and works offline (`manifest.webmanifest`, `sw.js`, `icons/`).

## How to play
- **Tap**: jab (left and right gloves alternate)
- **Swipe** sideways: hook
- **Swipe up**: uppercut (it can knock a tooth out)
- **Swipe down**: hammer fist
- **Hold, then release**: charged haymaker. He panics and tries to block with his tiny hands.
- Keyboard: Space jabs, the arrow keys throw hooks and uppercuts

## What's in it
- **Soft-body face**: the whole head is drawn through a 13×15 spring lattice, so hits dent, smear and wobble it
- **Combover physics**: the hair is hinged. Hit it hard enough and it lifts like a car bonnet to show the bald dome underneath
- **Persistent damage**: bruises, black eyes, a swelling red nose, fat lip, forehead lump, wiped-off fake tan, lost tooth, and bandages after he recovers from a daze
- **He talks back**: parody lines in a synthesised mumble voice (or the device's text-to-speech). Punch him mid-sentence and the line gets cut off.
- **Blood pressure meter**: your stress shown in mmHg with real AHA categories. Each punch brings it down.
- **Adaptive music**: one generative loop that moves from fast and aggressive to slow lo-fi as you calm down
- **Body shots**: punches that land on the suit count, rattle the tie and make him double over
- **Weapons you unlock by playing**: boxing glove, golden glove (150 lifetime thumps), rubber chicken (400), wet fish (800), each with its own sound
- **One hint at a time**: the next move you haven't tried yet. Hints stop once you've tried them all.
- **End screen**: stats, personal bests, unlock progress, an all-caps post he writes about you, and a portrait share card (1080×1350)
- **Recorded voice, ready to drop in**: see `voice/README.md` and `tools/make-voice.mjs` (ElevenLabs)
- Separate music and sound toggles; audio pauses when the app goes to the background

Satire. He's a cartoon. Nobody real gets hurt.
