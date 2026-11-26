"""Records the host's lines with the open Kokoro voice model (Apache-2.0).

Setup (once):
  python3 -m venv .venv-voice && .venv-voice/bin/pip install kokoro-onnx soundfile
  Download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Run:
  node scripts/voice/texts.mjs /tmp/voice-texts.json
  .venv-voice/bin/python scripts/voice/gen.py /tmp/voice-texts.json <model dir> public/voice

Only new lines are recorded; clips for lines that no longer exist are deleted.
"""
import json, os, re, subprocess, sys, tempfile

import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = 'af_heart'
LETTERS = {'A': 'Ay', 'B': 'Bee', 'C': 'See', 'D': 'Dee'}


def speakable(text: str) -> str:
    # "A: Paris." reads better as "Ay, Paris."
    return re.sub(r'(?<![\w\'])([ABCD]): ', lambda m: LETTERS[m.group(1)] + ', ', text)


def main() -> None:
    texts_path, model_dir, out_dir = sys.argv[1:4]
    items = json.load(open(texts_path))
    os.makedirs(out_dir, exist_ok=True)
    wanted = {i['id'] for i in items}
    for f in os.listdir(out_dir):
        if f.endswith('.mp3') and f[:-4] not in wanted:
            os.remove(os.path.join(out_dir, f))
    todo = [i for i in items if not os.path.exists(os.path.join(out_dir, i['id'] + '.mp3'))]
    print(f'{len(items)} lines, {len(todo)} to record')
    k = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
    with tempfile.TemporaryDirectory() as tmp:
        for n, item in enumerate(todo, 1):
            is_question = ' A: ' in item['text']
            samples, sr = k.create(speakable(item['text']), voice=VOICE, speed=1.08 if is_question else 1.0, lang='en-us')
            wav = os.path.join(tmp, 'clip.wav')
            sf.write(wav, samples, sr)
            subprocess.run(
                ['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB',
                 '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '32k', os.path.join(out_dir, item['id'] + '.mp3')],
                check=True,
            )
            if n % 50 == 0:
                print(f'  {n}/{len(todo)}')
    ids = sorted(i['id'] for i in items if os.path.exists(os.path.join(out_dir, i['id'] + '.mp3')))
    json.dump(ids, open(os.path.join(out_dir, 'index.json'), 'w'))
    print(f'done: {len(ids)} clips')


if __name__ == '__main__':
    main()
