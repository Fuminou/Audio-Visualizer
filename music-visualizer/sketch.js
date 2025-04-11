let song;
let fft;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noFill();
  colorMode(HSB);
  fft = new p5.FFT();

  // Connect the input element to handleFile()
  document.getElementById('audioInput').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (file) {
      let reader = new FileReader();
      reader.onload = function(f) {
        handleFile({ type: 'audio', data: f.target.result });
      };
      reader.readAsDataURL(file);
    }
  });
}

function draw() {
  background(0, 0.1); // semi-transparent background for trailing effect

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

function handleFile(file) {
  if (file.type === 'audio') {
    if (song) {
      song.stop();
    }

    song = loadSound(file.data, () => {
      fft.setInput(song); // attach FFT to song
      song.play();
    });
  } else {
    alert('Please upload an audio file!');
  }
}
