# Donald Thump

A stress-relief toy: punch a rubbery cartoon caricature until your blood pressure comes down.

Open `index.html` in any modern browser (phone or desktop). No build step and no assets: the art is vector drawing in code and every sound is synthesised live with the Web Audio API.

## Install it like an app
Host the folder anywhere with HTTPS (GitHub Pages works). On a phone, open it and choose **Add to Home Screen**. It runs full-screen with its own icon and works offline (`manifest.webmanifest`, `sw.js`, `icons/`).

## Modes
- **Stress relief** (solo): punch until your blood pressure is back to normal.
- **Drinking game**: pass the phone, one punch each. Every few turns Thump hands out one of 10 drinking punishments in his own voice (the odds rise with every dry turn, so they land unpredictably, sometimes back to back, usually 2–12 turns apart). Some only fire when they fit: "Nice punch" needs a big hit, "both of those punches were sad" needs two weak ones in a row. 18+.

## Getting it on a phone
The link is the app: no landing page, no sign-up. After the first round the end screen offers to install:
- **Android Chrome**: one-tap "Add to home screen" (the browser's own install prompt).
- **iPhone Safari**: a two-step guide pointing at the Share button, then *Add to Home Screen*.
- **In-app browsers** (TikTok, Instagram, Facebook...): they can't install, so the card explains how to open the link in Safari/Chrome (Android gets a direct "Open in Chrome" button).
- **Desktop**: a QR code on the title screen to carry the game to a phone.
None of this shows once it's running from the home screen, or when embedded in another page.

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
- **He talks back**: recorded lines in one original character voice. Punch him mid-sentence and the line gets cut off. (A synth mumble only fills in if the clips can't load.)
- **Blood pressure meter**: your stress shown in mmHg with real AHA categories. Each punch brings it down.
- **Adaptive music**: one generative loop that moves from fast and aggressive to slow lo-fi as you calm down
- **He reacts to *that* punch**: light hits get dismissive bluster, big ones get "Okay, that one hurt". Lines come from a shuffled bag so none repeat until the set is used up. Grunts climb in pitch and volume through a flurry. Cut him off and he sometimes tries again ("As I was SAYING...").
- **Body shots**: punches that land on the suit count, rattle the tie and make him double over
- **Weapons you unlock by playing**: boxing glove, golden glove (150 lifetime thumps), rubber chicken (400), wet fish (800), each with its own sound
- **One hint at a time**: the next move you haven't tried yet. Hints stop once you've tried them all.
- **End screen**: stats, personal bests, unlock progress, an all-caps post he writes about you, and a portrait share card (1080×1350)
- **Recorded voice and sound effects**: 67 lines and 10 grunts in the ElevenLabs voice "Thumper" (`voice/`), plus 31 effect samples (`sfx/`), picked from three takes each. Synth sounds stay as a fallback. Regenerate with `tools/make-voice.mjs`.
- Separate music and sound toggles; audio pauses when the app goes to the background

## Payments (drinking-game paywall)
3 free punishments per device per night, then a card offers a one-off unlock for that phone. Two prices are split-tested (half of devices see 99p, half £1.99). With no payment links set, everything stays free.

**Setup**
1. Stripe: create a product with two one-off prices (99p and £1.99) and a **Payment Link** for each. In each link's settings choose *After payment → Don't show confirmation page → Redirect* to `https://YOUR-DOMAIN/?paid={CHECKOUT_SESSION_ID}`.
2. Paste both link URLs into `PAY.links` at the top of the script in `index.html` (keep `PAY.labels` matching the real prices).
3. Host it (either works):
   - **Railway**: deploy the repo; it runs `npm start` (`server.js`, no dependencies) which serves the game and `/api/verify`. Add variables `STRIPE_SECRET_KEY` (a *restricted* key with read access to Checkout Sessions) and optionally `PAYMENT_LINKS` (the `plink_...` ids), then attach your domain.
   - **Cloudflare Pages** (free): deploy the repo with no build step; the `functions/` folder becomes `/api/verify`. Add the same variables in the project settings.
4. Test with Stripe test-mode links and card 4242 4242 4242 4242 before switching to live links.

How it unlocks: checkout opens in a new tab carrying the device's reference (`client_reference_id`); the game polls `/api/verify` and unlocks itself, which also covers installed iPhone apps that hand payment to Safari. Returning via the redirect unlocks too. Unlocks are per device; there's no account to restore from on a new phone.

## Legal notes
Parody and satire. Donald Thump is a cartoon caricature drawn in code; no photographs, footage or recordings of any real person were used. The voice is an original character created with ElevenLabs Voice Design from a text description (not a clone), on a plan with commercial rights. Not affiliated with or endorsed by anyone. Keep it that way: no real photos or audio, no voice cloning, no factual claims about real events, no likeness merch, and no "Trump" in product names, domains or ad keywords. Get a media/IP lawyer's review before charging money.
