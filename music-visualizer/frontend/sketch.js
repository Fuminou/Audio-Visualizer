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

function init() {
  console.log("Initializing visualizer...");
  
  // Setup canvas
  canvas = document.getElementById('canvas');
  resizeCanvas();
  
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

  // Load presets
  loadAllPresets();
  
  // Setup audio nodes
  setupAudioNodes();
  
  // Setup UI controls
  setupControls();
  
  // Start rendering
  requestAnimationFrame(render);
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

  // File input
  document.getElementById('audioInput').addEventListener('change', handleFileInput);
  
  // Drag and drop
  setupDragAndDrop();
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#0ff";
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#888";
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) readAudioFile(file);
  });

  dropZone.addEventListener('click', () => {
    document.getElementById('audioInput').click();
  });
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

  const reader = new FileReader();
  reader.onload = function(e) {
    audioContext.decodeAudioData(e.target.result)
      .then(buffer => {
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = buffer;
        sourceNode.connect(gainNode);
        sourceNode.start(0);
        isPlaying = true;
        
      })
      .catch(err => {
        console.error("Error decoding audio:", err);
      });
  };
  reader.readAsArrayBuffer(file);
}

function render() {
  visualizer.render();
  requestAnimationFrame(render);
}

// Window resize handler
window.addEventListener('resize', resizeCanvas);

// Initialize when everything is loaded
window.addEventListener('load', init);