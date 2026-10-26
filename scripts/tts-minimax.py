"""Static MiniMax TTS for the Observatory's announcement clips.

Usage: uv run python scripts/tts-minimax.py OUT.mp3 "text" [--voice ID] [--lang yue|cmn|en]
       [--speed 1.0] [--emotion calm] [--tone 攞假/(lo2)(gaa3) ...] [--bitrate 128000]
Needs MINIMAX_API_KEY in the environment. Voices are synthetic; never imitate a
real person.
"""
import argparse, json, os, urllib.request
from pathlib import Path

API = "https://api.minimax.io/v1/t2a_v2"
MODEL = "speech-2.8-hd"
LANGS = {"yue": "Chinese,Yue", "cmn": "Chinese", "en": "English"}


def key():
    if os.environ.get("MINIMAX_API_KEY"):
        return os.environ["MINIMAX_API_KEY"]
    raise SystemExit("MINIMAX_API_KEY not set")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("text")
    ap.add_argument("--voice", default="Cantonese_ProfessionalHost（M)")
    ap.add_argument("--lang", default="yue", choices=LANGS)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--emotion", default="calm")
    ap.add_argument("--tone", action="append", default=[])
    ap.add_argument("--bitrate", type=int, default=128000)
    a = ap.parse_args()
    payload = {
        "model": MODEL,
        "text": a.text,
        "stream": False,
        "language_boost": LANGS[a.lang],
        "output_format": "hex",
        "voice_setting": {"voice_id": a.voice, "speed": a.speed, "vol": 1.0, "pitch": 0, "emotion": a.emotion},
        "audio_setting": {"sample_rate": 44100, "bitrate": a.bitrate, "format": "mp3", "channel": 1},
    }
    if a.tone:
        payload["pronunciation_dict"] = {"tone": a.tone}
    req = urllib.request.Request(API, data=json.dumps(payload).encode(),
                                 headers={"Authorization": f"Bearer {key()}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        res = json.load(r)
    if res.get("base_resp", {}).get("status_code") != 0:
        raise SystemExit(json.dumps(res.get("base_resp"), ensure_ascii=False))
    Path(a.out).write_bytes(bytes.fromhex(res["data"]["audio"]))
    print(a.out, res.get("extra_info", {}).get("audio_length"), "ms")


main()
