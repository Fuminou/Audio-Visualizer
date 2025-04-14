let song;
let fft;
let gain;
let volumeSlider;

let kickTimes = [];
let snareTimes = [];
let vocalTimes = [];

let kickIndex = 0;
let snareIndex = 0;
let vocalIndex = 0;

let visualPattern = "waveform";

function setup() {
  console.log("setup is running");
  createCanvas(windowWidth, windowHeight);
  noFill();
  colorMode(HSB);

  fft = new p5.FFT();
  gain = new p5.Gain();
  gain.connect();
  gain.amp(0.5);

  // Volume control
  volumeSlider = document.getElementById("volume");
  volumeSlider.addEventListener("input", () => {
    const vol = parseFloat(volumeSlider.value);
    gain.amp(vol, 0.05);
    console.log("Volume set to:", vol);
  });

  // File input
  document.getElementById("audioInput").addEventListener("change", handleFileInput);

  // Drag & Drop
  const dropZone = document.getElementById("drop-zone");
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#0ff";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#888";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#888";
    const file = e.dataTransfer.files[0];
    if (file) readAudioFile(file);
  });
}

// ⬇️ Hook up dropdown outside setup so it runs on page load
window.addEventListener("DOMContentLoaded", () => {
  const patternSelector = document.getElementById("visualPattern");
  visualPattern = patternSelector.value;
  console.log("Initial pattern:", visualPattern);

  patternSelector.addEventListener("change", (e) => {
    visualPattern = e.target.value;
    console.log("Switched to:", visualPattern);
  });
});

function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) readAudioFile(file);
}

function readAudioFile(file) {
  // Reset everything
  kickIndex = 0;
  snareIndex = 0;
  vocalIndex = 0;

  kickTimes = [];
  snareTimes = [];
  vocalTimes = [];

  sendToBackend(file);

  const reader = new FileReader();
  reader.onload = function (f) {
    if (song) {
      song.disconnect();
      song.stop();
    }

    song = loadSound(f.target.result, () => {
      song.disconnect();
      song.connect(gain);
      fft.setInput(song);
      gain.amp(parseFloat(volumeSlider.value));
      song.play();
      console.log("Song playing:", song.isPlaying());
    });
  };
  reader.readAsDataURL(file);
}

function sendToBackend(file) {
  const formData = new FormData();
  formData.append("file", file);

  fetch("http://localhost:5000/analyze", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Backend analysis result:", data);
      kickTimes = data.kicks;
      snareTimes = data.snares;
      vocalTimes = data.vocals;
      kickIndex = snareIndex = vocalIndex = 0;

      alert(`Tempo: ${data.tempo} BPM\nVocals: ${data.vocals.length > 0 ? 'Yes' : 'No'}`);
    })
    .catch((err) => {
      console.error("Error sending to backend:", err);
    });
}
/******************************DRAWING FUNCTIONS ARE HERE**************************************************************************************** */
function draw() {
  background(0);
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text(`Pattern: ${visualPattern}`, 10, 10);

  if (song && song.isPlaying()) {
    if (visualPattern === "waveform") {
      drawWaveform();
    } else if (visualPattern === "bars") {
      drawBars();
    }
  }
}

function drawWaveform() {
  let waveform = fft.waveform();
  stroke(180, 255, 255);
  strokeWeight(2);
  noFill();

  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height * 0.25, height * 0.75);
    vertex(x, y);
  }
  endShape();
}

function drawBars() {
  let spectrum = fft.analyze();

  noFill();
  strokeWeight(6); // thicker bars

  let barWidth = width / spectrum.length;
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = color(hue, 255, 255);
  
  for (let i = 0; i < spectrum.length; i++) {
    let amp = spectrum[i];
    let hue = map(i, 0, spectrum.length, 0, 360);

    // ⬆️ Amplify the height
    let barHeight = map(amp, 0, 255, 0, height * 1.5);

    stroke(hue, 255, 255);
    line(i * barWidth, height, i * barWidth, height - barHeight);
  }
}
