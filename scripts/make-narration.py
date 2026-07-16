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
    .tts-venv/bin/python scripts/make-narration.py                 # everything
    .tts-venv/bin/python scripts/make-narration.py klijenti        # one tour
    .tts-venv/bin/python scripts/make-narration.py klijenti seg2   # one segment

Voice: af_heart (warm female narrator). Output: 24kHz WAV.

Segments map to the steps in lib/demo-scenarios/<tour>.ts. Re-generating changes
segment durations, so re-check the sleep() constants there against the lengths
printed below — the choreography is timed against this audio, not the clock.

Keep the text plain-spoken: spell out names, avoid characters TTS mangles, and
write Croatian names phonetically — this is an English G2P model, and it will
mangle "natječaj" or "Kovačević" if given them raw.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro import KPipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = "af_heart"
SAMPLE_RATE = 24000

# tour id -> { segment id -> English narration text (written for pronunciation) }
TOURS = {
    "welcome": {
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
    },
    "klijenti": {
        "seg1":
            "The clients page is the address book behind everything else. Each client "
            "carries the contact details, and a set of tags describing the kind of work "
            "they do. Those tags double as filters: picking one narrows the list to just "
            "that kind of client, which is how you find who to approach when a matching "
            "tender opens up.",
        "seg2":
            "Opening a client pulls together everything the company touches. Their "
            "projects, with the status and deadline of each. The tenders they have been "
            "entered into. And their finances, invoice by invoice, so the question of who "
            "still owes what is answered on the same screen as the work itself, instead of "
            "in a separate accounting system.",
    },
    "potencijalni": {
        "seg1":
            "Leads are kept apart from clients, because they need a different kind of "
            "attention. The list is ordered by the date of last contact, so the ones "
            "going cold drift to where they can be seen. Each lead records who on the "
            "team brought them in, and when anyone last spoke to them.",
        "seg2":
            "Every lead gets an AI summary of what they are actually after, written from "
            "the notes below it, so nobody has to read the whole history to pick up a "
            "conversation. The notes themselves are a running thread between the team and "
            "the assistant, and they stay with the lead if it converts into a client.",
    },
    "rad": {
        "seg1":
            "Work in progress is split across two pages. The task board groups everything "
            "into three columns: to do, in progress, and done. Each card names the project "
            "it belongs to, who it is assigned to, and when it is due. The badge on the "
            "right is the priority, and the urgent ones are marked in red.",
        "seg2":
            "Deadlines get a page of their own, because in this business the date is the "
            "thing that actually bites. Everything is listed against today, and each entry "
            "is colored by how close it is. Red inside three days, amber inside fifteen, "
            "and grey once it has passed. Nothing here needs to be opened. It is meant to "
            "be read at a glance, in the morning.",
    },
    "financije": {
        "seg1":
            "The finance page answers four questions at once. What has been invoiced in "
            "total. How much of that has actually been paid, in green. What the work has "
            "cost us. And, in red, how much is overdue. That last number is the one worth "
            "watching, because it is money already earned but not yet collected.",
        "seg2":
            "Below the totals is every transaction behind them. Each line carries the date, "
            "the client it belongs to, and whether it has been settled or is running late. "
            "Because each one is tied to a client, the same figures also show up on that "
            "client's own page, next to the projects that produced them.",
    },
}


def render(tour, seg_filter=None):
    out_dir = os.path.join(ROOT, "public", "narration", tour)
    os.makedirs(out_dir, exist_ok=True)
    pipe = KPipeline(lang_code="a")

    segments = TOURS[tour]
    ids = [seg_filter] if seg_filter else list(segments.keys())
    print(f"\n{tour}:")
    for sid in ids:
        text = segments.get(sid)
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
        sf.write(os.path.join(out_dir, sid + ".wav"), full, SAMPLE_RATE)
        dur = len(full) / SAMPLE_RATE
        with open(os.path.join(out_dir, sid + ".json"), "w", encoding="utf-8") as fh:
            json.dump({"duration": round(dur, 3), "words": words}, fh, ensure_ascii=False)
        print(f"  OK {sid}.wav + .json  ({dur:.1f}s, {len(words)} words)")


def main():
    tour = sys.argv[1] if len(sys.argv) > 1 else None
    seg = sys.argv[2] if len(sys.argv) > 2 else None

    if tour and tour not in TOURS:
        print(f"unknown tour '{tour}'. known: {', '.join(TOURS)}")
        sys.exit(1)

    for tid in ([tour] if tour else TOURS):
        render(tid, seg)

    print("\nDone -> public/narration/")


if __name__ == "__main__":
    main()
