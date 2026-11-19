"""Second opinion on a take's opening: transcribe a short audio clip on its own (no VAD, no previous-text conditioning).
   python -I asr_head.py <clip.wav> <en|ar>  -> prints the text (utf8)
Used by narrate.ts when the full-take ASR dropped the first words (Whisper often skips a short opening fragment such as a
two-word heading, which made a good take fail the "opens with the script" gate, 2026-11-19)."""
import sys
from faster_whisper import WhisperModel

sys.stdout.reconfigure(encoding="utf8")
m = WhisperModel("large-v3", device="cuda", compute_type="float16")
segs, _ = m.transcribe(sys.argv[1], language=sys.argv[2], beam_size=5, vad_filter=False, condition_on_previous_text=False)
print(" ".join(s.text.strip() for s in segs))
