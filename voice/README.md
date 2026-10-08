# Recorded voice

Drop-in folder for real voice clips. When `voice/manifest.json` exists, the app plays these clips as his voice. The synthesised mumble is only a fallback for while they load or if they fail. Clips get cut off mid-word when you punch him, the same as the mumble, and his mouth moves to the audio's volume.

## Generate with ElevenLabs
1. Make or pick a voice in ElevenLabs and copy its Voice ID.
2. Run:
   ```
   ELEVENLABS_API_KEY=sk_... ELEVENLABS_VOICE_ID=... node tools/make-voice.mjs
   ```
   `node tools/make-voice.mjs --dry` lists every line and the character count first, without using any credits.
3. Commit the `voice/` folder.

Every line lives in the `LINES` block in `index.html`. Edit or add lines there, then rerun the script. It only renders files that don't exist yet.

## Which voice
Don't clone a real politician. ElevenLabs blocks the voices of major political figures, and cloning someone without consent breaks their terms. Two routes work:
- **Voice Design**: describe an original blustery-tycoon character voice in your own words, for example a loud, self-satisfied older New York businessman with a nasal rasp who leans on single words.
- **An impressionist**: hire one, then clone *their* voice with their written consent, so you can generate new lines whenever the news gives you material.

Speech to Speech gives the best comedy timing: record the lines yourself with the pauses and shouts you want, then convert them to the chosen voice.
