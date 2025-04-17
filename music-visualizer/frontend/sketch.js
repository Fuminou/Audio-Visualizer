// Main visualizer elements
let visualizer;
let audioContext;
let sourceNode;
let gainNode;
let analyser;
let canvas;

// Preset management
let presets = {};
let presetKeys = [];
let currentPresetIndex = 0;
let presetCycleInterval;
let isRandomPreset = true;

// UI state
let isPlaying = false;
let inactivityTimer;
let playPauseBtn;
let progressFill;

//visual stuff
let kickTimes = [], snareTimes = [], vocalTimes = [];
let kickIndex = 0, snareIndex = 0, vocalIndex = 0;


//const header = document.getElementById('header');
//const footer = document.getElementById('footer');

function init() {
  console.log("Initializing visualizer...");
  
  // Setup canvas
  canvas = document.getElementById('canvas');
  resizeCanvas();
  
  // Setup progress bar
  progressFill = document.getElementById('progress-fill');

  // Initialize audio context
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create visualizer
  visualizer = butterchurn.default.createVisualizer(
    audioContext,
    canvas,
    {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1
    }
  );

  //setup modal for uploading audio files
  setupUploadModal();

  // Load presets
  loadAllPresets();
  
  // Setup audio nodes
  setupAudioNodes();
  
  // Setup UI controls
  setupControls();
  
  // Start rendering
  requestAnimationFrame(render);

  // steup modal for selecting presets
  setupPresetModal();

}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (visualizer) {
    visualizer.setRendererSize(canvas.width, canvas.height);
  }
}

function loadAllPresets() {
  // Combine regular and extra presets
  allPresets = {
    ...butterchurnPresets.getPresets(),
    ...(window.butterchurnPresetsExtra ? butterchurnPresetsExtra.getPresets() : {})
  };

  // Sort presets alphabetically by name
  sortedPresetKeys = Object.keys(allPresets).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  // Populate the dropdown
  const presetSelect = document.getElementById('visualPattern');
  presetSelect.innerHTML = ''; // Clear existing options

  sortedPresetKeys.forEach((presetName, index) => {
    const option = document.createElement('option');
    option.value = index; // Store index as value
    option.textContent = presetName; // Show full preset name
    presetSelect.appendChild(option);
  });

  // Load first preset by default
  if (sortedPresetKeys.length > 0) {
    loadPreset(0);
  }
}

// Function to load a preset by index
function loadPreset(index) {
  if (index >= 0 && index < sortedPresetKeys.length) {
    currentPresetIndex = index;
    const presetName = sortedPresetKeys[index];
    visualizer.loadPreset(allPresets[presetName], 3.0); // 3 second transition
    
    // Update dropdown selection
    document.getElementById('visualPattern').value = index;
    
    console.log(`Loaded preset: ${presetName}`);
  }
}

function setupAudioNodes() {
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  
  gainNode = audioContext.createGain();
  gainNode.gain.value = 0.5;
  
  // Connect nodes
  gainNode.connect(analyser);
  analyser.connect(audioContext.destination);
  visualizer.connectAudio(analyser);
}

function setupControls() {
  // Volume control
  const volumeSlider = document.getElementById('volume');
  volumeSlider.addEventListener('input', () => {
    gainNode.gain.value = parseFloat(volumeSlider.value);
  });

  // Preset selector
  const presetSelect = document.getElementById('visualPattern');
  presetSelect.addEventListener('change', (e) => {
    loadPreset(parseInt(e.target.value));
  });

  // Play/Pause button
  playPauseBtn = document.getElementById('playPauseBtn');
  playPauseBtn.addEventListener('click', togglePlayback);

  // File input
  document.getElementById('audioInput').addEventListener('change', handleFileInput);
}

function togglePlayback() {
  if (!sourceNode || !audioContext) return;

  const icon = playPauseBtn.querySelector('i');

  if (isPlaying) {
    audioContext.suspend().then(() => {
      icon.classList.remove('fa-pause');
      icon.classList.add('fa-play');
      isPlaying = false;
    });
  } else {
    audioContext.resume().then(() => {
      icon.classList.remove('fa-play');
      icon.classList.add('fa-pause');
      isPlaying = true;
    });
  }
}


function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) readAudioFile(file);
}

function readAudioFile(file) {
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }

  const offset = 0;
  const reader = new FileReader();
  reader.onload = function(e) {
    audioContext.decodeAudioData(e.target.result)
      .then(buffer => {
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.connect(gainNode);
        sourceNode.start(0, offset);
        document.getElementById('visualizer-cover')?.classList.add('hidden');
        isPlaying = true;
        if (playPauseBtn) {
          const icon = playPauseBtn.querySelector('i');
          icon.classList.remove('fa-play');
          icon.classList.add('fa-pause');
        }
        sendToBackend(file);

      })
      .catch(err => {
        console.error("Error decoding audio:", err);
      });
  };
  reader.readAsArrayBuffer(file);
}

function render() {
  if (isPlaying) {
    visualizer.render();
  }

  if (sourceNode && sourceNode.buffer && isPlaying) {
    const currentTime = audioContext.currentTime;
    const duration = sourceNode.buffer.duration;
    const percent = (currentTime / duration) * 100;
    progressFill.style.width = `${percent}%`;

    if (kickIndex < kickTimes.length && currentTime >= kickTimes[kickIndex]) {
      triggerKickVisual();
      kickIndex++;
    }

    if (snareIndex < snareTimes.length && currentTime >= snareTimes[snareIndex]) {
      triggerSnareVisual();
      snareIndex++;
    }

    if (vocalIndex < vocalTimes.length && currentTime >= vocalTimes[vocalIndex]) {
      triggerVocalVisual();
      vocalIndex++;
    }
  }

  requestAnimationFrame(render);
}


function setupUploadModal() {
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadModal = document.getElementById('uploadModal');
  const closeModal = document.querySelector('.modal .close');
  const dropZone = uploadModal.querySelector('.modal-content'); // ✅ define it here

  uploadBtn.addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
  });

  closeModal.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#0ff';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#888';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#888';
    const file = e.dataTransfer.files[0];
    if (file) {
      readAudioFile(file);
      uploadModal.classList.add('hidden');
    }
  });

  // Input file fallback
  const audioInput = document.getElementById('audioInput');
  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      readAudioFile(file);
      uploadModal.classList.add('hidden');
    }
  });
}

function setupPresetModal() {
  const presetBtn = document.getElementById('presetBtn');
  const presetModal = document.getElementById('presetModal');
  const closePreset = presetModal.querySelector('.close');
  const presetSelect = document.getElementById('visualPattern');

  presetBtn.addEventListener('click', () => {
    presetModal.classList.remove('hidden');
  });

  closePreset.addEventListener('click', () => {
    presetModal.classList.add('hidden');
  });

  presetSelect.addEventListener('change', (e) => {
    loadPreset(parseInt(e.target.value));
    presetModal.classList.add('hidden');
  });
}


//funtion for showing ui and dissapear when inactive

function showUI() {
  const header = document.getElementById('header');
  const footer = document.getElementById('footer');
  if (header) header.classList.remove('hide-ui');
  if (footer) footer.classList.remove('hide-ui');
}

function hideUI() {
  const header = document.getElementById('header');
  const footer = document.getElementById('footer');
  if (header) header.classList.add('hide-ui');
  if (footer) footer.classList.add('hide-ui');
}

function resetInactivityTimer() {
  showUI();
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(hideUI, 3000); // Hide after 3 seconds
}

// Start tracking mouse activity
document.addEventListener('mousemove', resetInactivityTimer);
resetInactivityTimer(); // kick it off initially

// Window resize handler
window.addEventListener('resize', resizeCanvas);

// Initialize when everything is loaded
window.addEventListener('load', init);

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
    
      alert(`Tempo: ${data.tempo} BPM\nKicks: ${kickTimes.length}, Snares: ${snareTimes.length}, Vocals: ${vocalTimes.length}`);
    })
    
    .catch((err) => {
      console.error("Error sending to backend:", err);
    });
}

function triggerKickVisual() {
  document.body.style.backgroundColor = "#ff0066";
  setTimeout(() => document.body.style.backgroundColor = "", 100);
}

function triggerSnareVisual() {
  document.body.style.backgroundColor = "#00ccff";
  setTimeout(() => document.body.style.backgroundColor = "", 100);
}

function triggerVocalVisual() {
  document.body.style.backgroundColor = "#ffff66";
  setTimeout(() => document.body.style.backgroundColor = "", 100);
}
