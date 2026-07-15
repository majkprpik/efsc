#!/usr/bin/env python3
"""
make-narration.py — generates the English voice-over for the in-app walkthroughs
(Kokoro TTS) and writes public/narration/<tour>/<seg>.wav plus a matching
<seg>.json with per-word timing.

Kokoro's KPipeline returns token start/end timestamps for free, so the karaoke
captions in lib/demo-scenarios/*.ts need no separate forced-alignment step.

SETUP (once):
    brew install espeak-ng
    python3.11 -m venv .tts-venv
    .tts-venv/bin/pip install kokoro soundfile numpy
    # model weights (~350MB) download from HuggingFace on first run

USAGE:
    .tts-venv/bin/python scripts/make-narration.py            # all segments
    .tts-venv/bin/python scripts/make-narration.py seg2       # just one

Voice: af_heart (warm female narrator). Output: 24kHz WAV.

The segments map to the walkthrough steps in lib/demo-scenarios/welcome.ts.
Re-generating changes segment durations, so re-check the sleep() constants there
against the printed lengths below.

Keep the text plain-spoken: spell out names, avoid characters TTS mangles, and
write foreign words phonetically (Croatian ones especially — the pipeline is
running an English G2P model).
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOUR = "welcome"
OUT = os.path.join(ROOT, "public", "narration", TOUR)
VOICE = "af_heart"
SAMPLE_RATE = 24000

# id -> English narration text (written for pronunciation)
NARRATION = {
    "seg1":
        "This is Orbit, the hub our team uses to run European Union and public "
        "funding tenders. The dashboard opens on the numbers that matter: how "
        "many clients are active, how many projects are running, and how many "
        "leads are still being followed up. The last counter is the one people "
        "watch. It turns red when a deadline falls inside the next seven days.",
    "seg2":
        "Tenders live on their own page. Filtering down to the active ones "
        "leaves only what can still be applied for, and opening a tender shows "
        "the terms in one line: the body awarding the money, the total amount, "
        "and how much of it the client has to co-finance themselves. Below that "
        "is the date everything else hangs on, the application deadline.",
    "seg3":
        "When a tender is won, it becomes a project. Each project tracks its own "
        "progress, its own deadline, and a checklist of the documents the client "
        "still owes. And every project keeps a link back to the tender it came "
        "from, so the paperwork, the money, and the deadline are never more than "
        "one click apart.",
}


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    pipe = KPipeline(lang_code="a")

    ids = [only] if only else list(NARRATION.keys())
    for sid in ids:
        text = NARRATION.get(sid)
        if not text:
            print(f"  skipping '{sid}' (no text)")
            continue

        chunks = []
        words = []      # [{ word, start, end }] — absolute times (s)
        offset = 0.0    # accumulated across chunks; Kokoro times are per-chunk
        for result in pipe(text, voice=VOICE, speed=1.0):
            audio = result.output.audio if hasattr(result.output, "audio") else result.audio
            audio = np.asarray(audio)
            for tok in (result.tokens or []):
                if tok.start_ts is None or not tok.text.strip():
                    continue
                end_ts = tok.end_ts if tok.end_ts is not None else tok.start_ts
                words.append({
                    "word": tok.text,
                    "start": round(offset + float(tok.start_ts), 3),
                    "end": round(offset + float(end_ts), 3),
                })
            chunks.append(audio)
            offset += len(audio) / SAMPLE_RATE

        full = np.concatenate(chunks)
        sf.write(os.path.join(OUT, sid + ".wav"), full, SAMPLE_RATE)
        dur = len(full) / SAMPLE_RATE
        with open(os.path.join(OUT, sid + ".json"), "w", encoding="utf-8") as fh:
            json.dump({"duration": round(dur, 3), "words": words}, fh, ensure_ascii=False)
        print(f"  OK {sid}.wav + .json  ({dur:.1f}s, {len(words)} words)")

    print(f"\nDone -> public/narration/{TOUR}/")


if __name__ == "__main__":
    main()
