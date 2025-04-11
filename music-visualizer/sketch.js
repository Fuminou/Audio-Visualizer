let song;
let fft;
let gain;
let volumeSlider;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  colorMode(HSB);

  fft = new p5.FFT();
  gain = new p5.Gain();
  gain.connect(); // connect gain to output
  gain.amp(0.5);  // initial volume

  // Volume slider
  volumeSlider = document.getElementById('volume');
  volumeSlider.addEventListener('input', () => {
    const vol = parseFloat(volumeSlider.value);
    gain.amp(vol, 0.05); // smoother transition
    console.log('Volume set to:', vol);
  });

  // File input
  document.getElementById('audioInput').addEventListener('change', handleFileInput);

  // Drag & Drop
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.style.borderColor = '#0ff';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#888';
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = '#888';
    const file = e.dataTransfer.files[0];
    if (file) readAudioFile(file);
  });
}

function draw() {
  background(0, 0.1);
  if (song && song.isPlaying()) {
    let spectrum = fft.analyze();
    strokeWeight(2);
    for (let i = 0; i < spectrum.length; i++) {
      let amp = spectrum[i];
      let hue = map(i, 0, spectrum.length, 0, 360);
      stroke(hue, 255, 255);
      line(i, height, i, height - amp * 1.5);
    }
  }
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) readAudioFile(file);
}

function readAudioFile(file) {
  const reader = new FileReader();
  reader.onload = function (f) {
    if (song) {
      song.disconnect(); // important: stop routing from old song
      song.stop();
    }

    song = loadSound(f.target.result, () => {
      song.disconnect();      // disconnect from default master output
      song.connect(gain);     // route through gain
      fft.setInput(song);
      gain.amp(parseFloat(volumeSlider.value)); // set initial gain
      song.play();
    });
  };
  reader.readAsDataURL(file);
}
