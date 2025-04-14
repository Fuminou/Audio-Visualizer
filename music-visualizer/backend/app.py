from flask import Flask, request, jsonify
import librosa
import numpy as np
import tempfile
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def detect_peaks(energy, threshold=0.6):
    # Normalize energy
    energy = energy / np.max(energy)
    # Simple peak detection
    peaks = np.where(energy > threshold)[0]
    return peaks

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    audio_file = request.files['file']

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        audio_file.save(tmp.name)
        y, sr = librosa.load(tmp.name, sr=None)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

        # Compute STFT
        S = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        times = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr)

        def band_energy(freq_low, freq_high):
            idx = np.where((freqs >= freq_low) & (freqs <= freq_high))[0]
            band = S[idx, :]
            return np.mean(band, axis=0)

        # Extract energy for each category
        kick_energy = band_energy(20, 100)
        snare_energy = band_energy(150, 250)
        vocal_energy = band_energy(300, 3000)

        # Detect peaks
        kick_idxs = detect_peaks(kick_energy, threshold=0.6)
        snare_idxs = detect_peaks(snare_energy, threshold=0.5)
        vocal_idxs = detect_peaks(vocal_energy, threshold=0.05)

        kick_times = [float(times[i]) for i in kick_idxs]
        snare_times = [float(times[i]) for i in snare_idxs]
        vocal_times = [float(times[i]) for i in vocal_idxs]

        #avg_vocal_energy = np.mean(vocal_energy)
        #vocals_present = avg_vocal_energy > 0.05  # heuristic

    return jsonify({
        "tempo": round(tempo.item(), 2),
        "kicks": [round(t, 2) for t in kick_times],
        "snares": [round(t, 2) for t in snare_times],
        "vocals": [round(t, 2) for t in vocal_times],
        #"vocals": bool(vocals_present)
    })

if __name__ == '__main__':
    app.run(debug=True)
