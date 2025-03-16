// Visual variables
let audioInitialized = false;
let t = 0; // Time variable for evolving patterns
let scale = []; // Will hold our current scale notes as frequencies
let rootFrequency = 261.63; // C3 in Hz
let scaleType = "minor"; // Can be "minor" or "pentatonic"
let lastNoteTime = 0;
let noteSpacing = 250; // Minimum ms between notes
let activityLevel = 0; // Track visual activity
let masterGain; // Added master gain node

// New visual system elements
let particles = [];      // Main particle system
let audioEvents = [];    // Visual elements triggered by audio
let fadeCanvas;          // Secondary canvas for fade effect
let fadeAmount = 0.1;   // Amount of fade per frame
let colorTheme;          // Current color theme
let currentBlendMode;    // Current blend mode
let particleLifespan = 250; // Base lifespan for particles

// Particle class definition


// Scale definitions (intervals in semitones)
const scales = {
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 3, 5, 7, 10, 12, 15, 5],
};

// Root note frequencies to cycle through (in Hz)
const possibleRoots = [
  261.63, // C3
  293.66, // D3
  329.63, // E3
  349.23, // F3
  392.0,  // G3
  440.0,  // A3
  493.88, // B3
];

// Tone.js instruments
let melodySynth;
let harmonySynth;
let bassSynth;
let masterReverb;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 255);
  // Initialize blend mode
  currentBlendMode = BLEND;
  
  // Create fade canvas for trailing effect
  fadeCanvas = createGraphics(width, height);
  fadeCanvas.background(0);
  
  // Initialize color theme
  updateColorTheme();
  
  // Initialize particles
  createInitialParticles(100);
  
  // Prepare for audio initialization on user interaction
  updateScale();

  // Show message to click for audio
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(255);
  text("~~~", width / 2, height / 2);
}

// Create a new color theme
function updateColorTheme() {
  // Generate a theme based on a base hue
  const baseHue = random(255);
  
  colorTheme = {
    // Background colors
    background: color(baseHue, 10, 5, 25),
    fadeColor: color(baseHue, 10, 5,  10),
    
    // Particle colors
    particleColors: [
      color(baseHue, 70, 80, 180),
      color((baseHue - 30) % 360, 80, 75, 180),
      color((baseHue - 60) % 360, 90, 70, 180),
      color((baseHue - 180) % 360, 80, 85, 180)
    ],
    
    // Audio event colors
    audioColor: color((baseHue + 120) % 360, 90, 85, 200),
    
    // Update periodically
    update: function() {
      // Subtle evolution of colors
      this.fadeColor = color(
        (baseHue + sin(t * 0.1) * 10) % 255, 
        10, 
        5 + sin(t * 0.05) * 5, 
        fadeAmount * 0.05
      );
    }
  };
}

// Create initial particles
function createInitialParticles(count) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(
      random(width),
      random(height),
      random(colorTheme.particleColors)
    ));
  }
}

function draw() {
  // Update time variable
  t += 0.003;
  
  // Update color theme
  colorTheme.update();
  
  // Apply fade effect to the fade canvas
  fadeCanvas.push();
  fadeCanvas.noStroke();
  fadeCanvas.fill(colorTheme.fadeColor);
  fadeCanvas.blendMode(BLEND);
  fadeCanvas.rect(0, 0, width, height);
  fadeCanvas.pop();
  
  // Draw particles on the fade canvas
  drawParticlesOnFadeCanvas();
  
  // Copy the fade canvas to the main canvas
  image(fadeCanvas, 0, 0);
  
  // Reset activity level
  activityLevel = 0;
  
  // Update and draw particles on main canvas
  updateAndDrawParticles();
  
  // Update and draw audio events
  updateAndDrawAudioEvents();
  
  // Audio logic
  handleAudio();
  
  // Display prompt if audio isn't initialized
  if (!audioInitialized) {
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    text("~~~", width / 2, height / 2);
  }
  
  // Display volume control information if audio is initialized
  if (audioInitialized && masterGain) {
    textAlign(RIGHT, TOP);
    textSize(16);
    fill(255, 200);
    text(`Volume: ${Math.round(masterGain.gain.value * 100)}%`, width - 20, 20);
  }
}

// Draw particles on the fade canvas
function drawParticlesOnFadeCanvas() {
  fadeCanvas.push();
  fadeCanvas.blendMode(BLEND);
  fadeCanvas.noStroke();
  
  for (let particle of particles) {
    // Use varying opacity based on particle lifespan
    let opacity = map(particle.lifespan, 0, particleLifespan, 0, 10);
    fadeCanvas.fill(red(particle.color), green(particle.color), blue(particle.color), opacity * 0.5);
    
    // Draw trail for moving particles
    if (particle.vel.mag() > 0.5) {
      let trailLength = map(particle.vel.mag(), 0.5, 3, 3, 5);
      for (let i = 0; i < trailLength; i++) {
        let trailPos = createVector(
          particle.pos.x - particle.vel.x * i * 0.5,
          particle.pos.y - particle.vel.y * i * 0.5
        );
        
        let size = map(i, 0, trailLength, particle.size, particle.size * 0.2);
        let alpha = map(i, 0, trailLength, opacity * 0.5, 0);
        
        fadeCanvas.fill(red(particle.color), green(particle.color), blue(particle.color), alpha);
        fadeCanvas.ellipse(trailPos.x, trailPos.y, size);
      }
    } else {
      // Simple fade effect for slower particles
      fadeCanvas.ellipse(particle.pos.x, particle.pos.y, particle.size * 1.2);
    }
  }
  
  fadeCanvas.pop();
}

// Update and draw particles on main canvas
function updateAndDrawParticles() {
  push();
  blendMode(ADD);
  noStroke();
  
  for (let i = particles.length - 1; i >= 0; i--) {
    let particle = particles[i];
    
    // Check if particle color is null and assign one if needed
    if (particle.color === null) {
      particle.color = random(colorTheme.particleColors);
    }
    
    // Update particle
    particle.update();
    
    // Add to activity level
    activityLevel += map(particle.vel.mag(), 0, 3, 0, 0.5);
    
    // Draw particle on main canvas for immediate display
    fill(red(particle.color), green(particle.color), blue(particle.color), 150);
    ellipse(particle.pos.x, particle.pos.y, particle.size);
    
    // Remove dead particles
    if (particle.isDead()) {
      particles.splice(i, 1);
    }
  }
  
  pop();
  
  // Normalize activity level
  activityLevel = constrain(activityLevel, 0, 1);
  
  // Occasionally add new particles
  if (frameCount % 20 === 0 && particles.length < 150) {
    // Add particles at edges of screen
    let x, y;
    let edge = floor(random(4));
    
    switch (edge) {
      case 0: // Top
        x = random(width);
        y = -10;
        break;
      case 1: // Right
        x = width + 10;
        y = random(height);
        break;
      case 2: // Bottom
        x = random(width);
        y = height + 10;
        break;
      case 3: // Left
        x = -10;
        y = random(height);
        break;
    }
    
    particles.push(new Particle(x, y, random(colorTheme.particleColors)));
  }
}

// Update and draw audio events
function updateAndDrawAudioEvents() {
  push();
  noFill();
  
  for (let i = audioEvents.length - 1; i >= 0; i--) {
    let event = audioEvents[i];
    
    // Update event
    event.radius += event.speed;
    event.opacity -= event.fadeRate;
    
    // Draw event
    stroke(red(event.color), green(event.color), blue(event.color), event.opacity);
    strokeWeight(event.weight);
    
    // Draw different shapes based on event type
    if (event.type === 'note') {
      // Circular ripple for notes
      ellipse(event.x, event.y, event.radius * 2);
    } else if (event.type === 'chord') {
      // Multiple concentric ripples for chords
      for (let j = 0; j < 3; j++) {
        let r = event.radius * (0.7 + j * 0.2);
        ellipse(event.x, event.y, r * 2);
      }
    } else if (event.type === 'keyChange') {
      // Star-like shape for key changes
      push();
      translate(event.x, event.y);
      rotate(event.radius * 0.01);
      
      beginShape();
      for (let j = 0; j < 5; j++) {
        let angle = TWO_PI * j / 5;
        let r1 = event.radius;
        let r2 = event.radius * 0.6;
        
        let x1 = sin(angle) * r1;
        let y1 = cos(angle) * r1;
        let x2 = cos(angle + TWO_PI/10) * r2;
        let y2 = sin(angle + TWO_PI/10) * r2;
        
        rect(x1, y1, r1);
        rect(x2, y2, r2);
      }
      endShape(CLOSE);
      pop();
    }
    
    // Remove faded events
    if (event.opacity <= 0) {
      audioEvents.splice(i, 1);
    }
  }
  
  pop();
}

// Handle audio-related functionality
function handleAudio() {
  if (audioInitialized) {
    // Smooth the activity level for more stable audio
    activityLevel = lerp(activityLevel, 
                         constrain(activityLevel, 0.1, 0.9),
                         0.05);
    
    // Root note changes - infrequent to prevent overlapping transitions
    if (frameCount % 480 === 0 || (activityLevel > 0.7 && frameCount % 240 === 0)) {
      changeRootNote();
      
      // Create visual effect for key change
      createAudioEvent('keyChange', width/2, height/2, 0.8, colorTheme.audioColor);
    }

    // Musical phrases with 4/4 time signature
    const timeSignature = 4;
    const beatLength = 60; // frames per beat at ~60bpm

    // Play notes on specific beats to create coherent phrases
    if (frameCount % beatLength === 0) {
      // Mainly on downbeats (first beat of measure)
      if (frameCount % (beatLength * timeSignature) === 0) {
        if (random() < 0.7) {
          const velocity = map(activityLevel, 0, 1, 0.2, 0.5);
          setTimeout(() => playNote(velocity), random(17, 100));
        }
      }
      // Sometimes on beat 3
      else if (frameCount % (beatLength * timeSignature) === beatLength * 2) {
        if (random() < 0.4) {
          const velocity = map(activityLevel, 0, 1, 0.15, 0.45);
          setTimeout(() => playNote(velocity), random(20, 80));
        }
      }
      // Rarely on other beats
      else if (random() < 0.15) {
        const velocity = map(activityLevel, 0, 1, 0.1, 0.3);
        setTimeout(() => playNote(velocity), random(10, 50));
      }
    }

    // Occasional notes based on activity
    if (frameCount % 30 === 0) {
      const noteProb = map(activityLevel, 0, 1, 0.1, 0.4);
      if (random() < noteProb) {
        const velocity = map(activityLevel, 0, 1, 0.15, 0.3);
        setTimeout(() => playNote(velocity), random(0, 400));
      }
    }

    // Adjust note spacing based on activity
    noteSpacing = map(activityLevel, 0, 1, 500, 250);
  }
}

// Create an audio visualization event
function createAudioEvent(type, x, y, intensity, eventColor) {
  let speedFactor = map(intensity, 0, 1, 0.5, 2);
  let weightFactor = map(intensity, 0, 1, 0.5, 2);
  
  audioEvents.push({
    type: type,
    x: x,
    y: y,
    radius: 10,
    opacity: 200,
    speed: 2 * speedFactor,
    fadeRate: 2,
    color: eventColor || colorTheme.audioColor,
    weight: 2 * weightFactor
  });
  
  // Add particles around the event
  let particleCount = map(intensity, 0, 1, 5, 20);
  for (let i = 0; i < particleCount; i++) {
    let angle = random(TWO_PI);
    let distance = random(5, 30);
    let newX = x + cos(angle) * distance;
    let newY = y + sin(angle) * distance;
    
    let particle = new Particle(newX, newY, eventColor || random(colorTheme.particleColors));
    particle.vel = p5.Vector.fromAngle(angle, random(1, 3));
    particle.lifespan = particleLifespan * random(0.8, 1.2);
    
    particles.push(particle);
  }
}

// Create particles in response to a note
function createNoteParticles(x, y, frequency, velocity) {
  // Determine color based on note frequency
  let hue = map(frequency, scale[0], scale[scale.length - 1], 0, 150);
  let noteColor = color(hue, 80, 90, 180);
  
  // Create particles
  let count = map(velocity, 0, 1, 5, 20);
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let speed = random(0.5, 20);
    
    let p = new Particle(x, y, noteColor);
    p.vel = p5.Vector.fromAngle(angle, speed);
    p.lifespan = particleLifespan * random(0.8, 1.2);
    p.size = map(velocity, 0, 1, 3, 80);
    
    particles.push(p);
  }
}

// Particle class
class Particle {
  constructor(x, y, color) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(-1, 1));
    this.acc = createVector(0, 0);
    this.color = color || random(colorTheme.particleColors);
    this.size = random(3, 8);
    this.lifespan = particleLifespan * random(0.8, 1.2);
    this.maxSpeed = random(0.5, 3);
    
    // Flow field parameters
    this.noiseScale = random(0.002, 0.01);
    this.noiseStrength = random(0.1, 0.5);
  }
  
  applyForce(force) {
    this.acc.add(force);
  }
  
  update() {
    // Apply flow field based on noise
    let noiseVal = noise(
      this.pos.x * this.noiseScale,
      this.pos.y * this.noiseScale,
      t * 0.1
    );
    
    let angle = map(noiseVal, 0, 1, 0, TWO_PI * 2);
    let flowForce = p5.Vector.fromAngle(angle, this.noiseStrength);
    this.applyForce(flowForce);
    
    // Occasionally change direction
    if (random() < 0.01) {
      this.vel.rotate(random(-PI/4, PI/4));
    }
    
    // Update physics
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    
    // Reset acceleration
    this.acc.mult(0);
    
    // Decrease lifespan
    this.lifespan -= random(0.5, 1.5);
    
    // Wrap around the canvas
    if (this.pos.x < -50) this.pos.x = width + 50;
    if (this.pos.x > width + 50) this.pos.x = -50;
    if (this.pos.y < -50) this.pos.y = height + 50;
    if (this.pos.y > height + 50) this.pos.y = -50;
  }
  
  isDead() {
    return this.lifespan <= 0;
  }
}

// Mouse click handler to initialize audio
function mousePressed() {
  if (!audioInitialized) {
    initAudio();
  } else {
    // Create particles and audio event at mouse position
    createAudioEvent('note', mouseX, mouseY, 0.7);
    
    // Add several particles
    for (let i = 0; i < 55; i++) {
      let p = new Particle(
        mouseX + random(-20, 20),
        mouseY + random(-20, 20)
      );
      p.vel = p5.Vector.random2D().mult(random(1, 3));
      particles.push(p);
    }
    
    // Play a note based on mouse position
    if (scale.length > 0) {
      const noteIdx = floor(map(mouseX, 0, width, 0, scale.length));
      const clampedIdx = constrain(noteIdx, 0, scale.length - 1);
      const noteFreq = scale[clampedIdx];
      
      if (melodySynth) {
        melodySynth.triggerAttackRelease(noteFreq, "8n", undefined, 0.5);
      }
    }
  }
}

// Mouse dragged function to add interactivity
function mouseDragged() {
  if (audioInitialized && frameCount % 3 === 0) {
    // Add particles along drag path
    let p = new Particle(mouseX, mouseY);
    p.vel = createVector(movedX, movedY).mult(0.82);
    particles.push(p);
    
    // Occasionally play a note based on mouse position
    if (random() < 0.1 && scale.length > 0) {
      const noteIdx = floor(map(mouseX, 0, width, 0, scale.length));
      const clampedIdx = constrain(noteIdx, 0, scale.length - 1);
      const noteFreq = scale[clampedIdx];
      
      if (melodySynth) {
        melodySynth.triggerAttackRelease(
          noteFreq,
          "16n",
          undefined,
          map(abs(movedX) + abs(movedY), 0, 50, 0.1, 0.3)
        );
      }
    }
  }
  
  return false; // Prevent default behavior
}

// Key pressed function for interaction
function keyPressed() {
  if (!audioInitialized) return;

  if (key === " ") {
    // Space bar creates a visual burst and plays a chord
    createAudioEvent('chord', width/2, height/2, 1.0);
    
    // Add many particles
    for (let i = 0; i < 50; i++) {
      let angle = random(TWO_PI);
      let distance = random(50, 200);
      let x = width/2 + cos(angle) * distance;
      let y = height/2 + sin(angle) * distance;
      
      let p = new Particle(x, y);
      p.vel = p5.Vector.fromAngle(angle, random(1, 4));
      particles.push(p);
    }
    
    playChord();
  } else if (key === "c" || key === "C") {
    // Clear all particles
    particles = [];
    audioEvents = [];
    
    // Clear fade canvas
    fadeCanvas.background(0);
  } else if (key === "f" || key === "F") {
    // Adjust fade amount
    fadeAmount = (fadeAmount === 0.05) ? 0.02 : 0.05;
    
    // Update fade color alpha
    colorTheme.fadeColor = color(
      hue(colorTheme.fadeColor),
      saturation(colorTheme.fadeColor),
      brightness(colorTheme.fadeColor),
      fadeAmount * 255
    );
  } else if (key === "r" || key === "R") {
    // Randomize color theme
    updateColorTheme();
    fadeCanvas.background(0);
  } else if (key === '+' || key === '=') {
    // Increase volume by 10%
    if (masterGain) {
      let currentVolume = masterGain.gain.value;
      setMasterVolume(currentVolume + 0.1);
    }
  } else if (key === '-' || key === '_') {
    // Decrease volume by 10%
    if (masterGain) {
      let currentVolume = masterGain.gain.value;
      setMasterVolume(currentVolume - 0.1);
    }
  } else if (key === '0') {
    // Reset to default volume
    setMasterVolume(0.8);
  }
}

// Function to set master volume
function setMasterVolume(value) {
  // value should be between 0 and 1
  if (masterGain) {
    // Clamp value between 0 and 1
    const clampedValue = constrain(value, 0, 1);
    
    // Smoothly transition to new volume
    masterGain.gain.rampTo(clampedValue, 0.1);
    
    console.log("Volume set to", Math.round(clampedValue * 100) + "%");
  }
}

// Touch handler for mobile devices
function touchStarted() {
  if (!audioInitialized) {
    initAudio();
    return false;
  }
}

// Window resize handler
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recreate fade canvas
  fadeCanvas = createGraphics(width, height);
  fadeCanvas.background(0);
}

// Initialize Tone.js audio system
function initAudio() {
  if (audioInitialized) return;

  try {
    // Start audio context - this needs to be triggered by user interaction
    Tone.start()
      .then(() => {
        console.log("Tone.js started");

        // Set initial volume to prevent any startup clicks
        Tone.getDestination().volume.value = -2;

        // Create our scale before initializing instruments
        updateScale();

        // Add a slight delay before setting up instruments to ensure context is running
        setTimeout(() => {
          setupAudioComponents();
        }, 100);
      })
      .catch((e) => {
        console.error("Could not start Tone.js:", e);
      });
  } catch (e) {
    console.error("Error initializing audio:", e);
  }
}

// Separate function to set up audio components after context is ready
function setupAudioComponents() {
  try {
    // Create a master gain node to control overall volume
    masterGain = new Tone.Gain(0.8); // Starting at 80% volume
    
    // Set up master effects
    masterReverb = new Tone.Reverb({
      decay: 5,
      wet: 0.4,
      preDelay: 0.05,
    });

    // Create a limiter for preventing clipping
    const limiter = new Tone.Limiter(-1);

    // Create a compressor for smoother dynamics
    const compressor = new Tone.Compressor({
      threshold: -14,
      ratio: 3,
      attack: 0.01,
      release: 0.1,
    });

    // Connect effects chain: compressor -> limiter -> masterGain -> masterReverb -> destination
    compressor.connect(limiter);
    limiter.connect(masterGain);
    masterGain.connect(masterReverb);
    masterReverb.toDestination();

    // Melody synth - clean sine
    melodySynth = new Tone.Synth({
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.6,
        release: 0.8,
      },
    }).connect(compressor);
    melodySynth.volume.value = -2;

    // Harmony synth - slightly different timbre
    harmonySynth = new Tone.Synth({
      oscillator: {
        type: "sine",
        partials: [1, 0.5, 0.7],
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.5,
        release: 1.0,
      },
    }).connect(compressor);
    harmonySynth.volume.value = -10; // Lower volume for harmony

    // Bass synth - fat and warm
    bassSynth = new Tone.Synth({
      oscillator: {
        type: "sine",
        partials: [1, 0.3, 0.1],
      },
      envelope: {
        attack: 0.08,
        decay: 0.3,
        sustain: 0.7,
        release: 1.2,
      },
    }).connect(compressor);
    bassSynth.volume.value = -4; // Bass slightly quieter

    // Gradually fade in the master volume to prevent initial clicks
    Tone.getDestination().volume.value = -10;
    Tone.getDestination().volume.rampTo(-5, 1);

    console.log("Audio components initialized successfully");
    audioInitialized = true;
  } catch (e) {
    console.error("Error setting up audio components:", e);
  }
}

// Update the musical scale based on root and type
function updateScale() {
  scale = [];

  try {
    for (let i = 0; i < scales[scaleType].length; i++) {
      // Calculate equal temperament frequency
      const freq = rootFrequency * Math.pow(2, scales[scaleType][i] / 12);
      scale.push(freq);
    }
  } catch (e) {
    console.error("Error updating scale:", e);
    // Fallback to a simple scale
    scale = [
      rootFrequency,
      rootFrequency * 1.125,
      rootFrequency * 1.25,
      rootFrequency * 1.333,
      rootFrequency * 1.5,
      rootFrequency * 1.667,
      rootFrequency * 1.875,
      rootFrequency * 2,
    ];
  }
}

// Play a single note using Tone.js
function playNote(velocity = 0.5) {
  if (!audioInitialized) return;

  const now = millis();

  // Ensure enough spacing between notes
  if (now - lastNoteTime < noteSpacing) return;
  lastNoteTime = now;

  try {
    // Choose note from scale with musical probabilities
    let noteIndex;
    const r = random();
    if (r < 0.25) {
      noteIndex = 0; // Root
    } else if (r < 0.4) {
      noteIndex = 4; // Fifth
    } else if (r < 0.55) {
      noteIndex = 2; // Third
    } else if (r < 0.7) {
      noteIndex = 5; // Sixth
    } else {
      // Other scale tones occasionally
      const options = [1, 3, 6, 7];
      noteIndex = options[Math.floor(random(options.length))];
    }

    // Make sure we have a valid scale and index
    if (!scale || scale.length === 0) {
      console.error("Scale is not properly initialized");
      return;
    }

    // Constrain note index to valid range
    noteIndex = constrain(noteIndex, 0, scale.length - 1);

    // Get frequency for the note
    const freq = scale[noteIndex];

    // Ensure we're in valid range
    velocity = constrain(velocity, 0.1, 0.6);

    // Use fixed duration strings instead of dynamically calculated ones
    let noteDuration = "8n"; // Default to eighth note
    if (activityLevel < 0.3) {
      noteDuration = "4n"; // Quarter note for slower activity
    } else if (activityLevel > 0.7) {
      noteDuration = "16n"; // Sixteenth note for faster activity
    }

    // Check if synths exist before trying to use them
    if (melodySynth) {
      // Play melody note with fixed time reference
      melodySynth.triggerAttackRelease(
        freq,
        noteDuration,
        undefined, // Let Tone.js use "now"
        velocity
      );
    }

    // Sometimes add harmony
    if (random() < 0.3 && harmonySynth) {
      // Choose harmonic interval
      let harmonyOffset;
      if (scaleType === "minor") {
        const options = [2, 5, 7]; // third, sixth, octave
        harmonyOffset = options[Math.floor(random(options.length))];
      } else {
        const options = [2, 4, 7]; // pentatonic options
        harmonyOffset = options[Math.floor(random(options.length))];
      }

      const harmonyIndex = (noteIndex + harmonyOffset) % scale.length;
      const harmonyFreq = scale[harmonyIndex];

      // Add a slight delay
      setTimeout(() => {
        harmonySynth.triggerAttackRelease(
          harmonyFreq,
          noteDuration,
          undefined,
          velocity * 0.7
        );
      }, 30);
    }

    // Occasionally add bass
    if (random() < 0.15 && bassSynth) {
      // Use root or fifth for bass
      const bassOptions = [0, 4];
      const bassIndex = bassOptions[Math.floor(random(bassOptions.length))];

      // Check if we have a valid bassIndex
      if (bassIndex < scale.length) {
        const bassFreq = scale[bassIndex] * 0.5; // Octave lower

        // Add a slight delay for bass
        setTimeout(() => {
          bassSynth.triggerAttackRelease(
            bassFreq,
            noteDuration,
            undefined,
            velocity * 0.8
          );
        }, 20);
      }
    }

    // Create visual feedback for the note
    if (velocity > 0.15) {
      // Map note to screen position
      const xPos = map(
        noteIndex,
        0,
        scale.length - 1,
        width * 0.2,
        width * 0.8
      );
      const yPos = map(
        freq,
        scale[0],
        scale[scale.length - 1],
        height * 0.8,
        height * 0.2
      );

      // Create audio event at this position
      createAudioEvent('note', xPos, yPos, velocity);
      
      // Add particles based on note
      createNoteParticles(xPos, yPos, freq, velocity);
    }
  } catch (e) {
    console.error("Error playing note:", e);
  }
}

// Change the root note of the scale
function changeRootNote() {
  if (!audioInitialized) return;

  try {
    // Store previous root
    const previousRoot = rootFrequency;

    // Use circle of fifths for musical transitions
    const circleOfFifths = [
      possibleRoots[0], // C
      possibleRoots[4], // G
      possibleRoots[5], // A
      possibleRoots[2], // E
      possibleRoots[6], // B
      possibleRoots[1], // D
      possibleRoots[3], // F
    ];

    // Select new root based on activity level
    const idx = Math.floor(map(activityLevel, 0, 1, 0, circleOfFifths.length));
    rootFrequency = circleOfFifths[idx % circleOfFifths.length];

    // Choose scale type based on activity level
    const previousScaleType = scaleType;
    scaleType = activityLevel > 0.6 ? "pentatonic" : "minor";

    // Only update if something changed
    if (previousRoot !== rootFrequency || previousScaleType !== scaleType) {
      updateScale();

      // Play a smooth chord transition to signal key change
      playTransitionChord(previousRoot);
    }
  } catch (e) {
    console.error("Error changing root note:", e);
  }
}

// Play a chord when the spacebar is pressed
function playChord() {
  if (!audioInitialized || !melodySynth || !harmonySynth || !bassSynth) return;

  try {
    // Check if scale is valid
    if (!scale || scale.length < 5) {
      console.error("Scale not properly initialized for chord");
      return;
    }

    // Play root
    melodySynth.triggerAttackRelease(scale[0], "2n");

    // Add third after slight delay
    setTimeout(() => {
      if (harmonySynth) {
        harmonySynth.triggerAttackRelease(scale[2], "2n", undefined, 0.6);
      }
    }, 50);

    // Add fifth after another slight delay
    setTimeout(() => {
      if (harmonySynth) {
        harmonySynth.triggerAttackRelease(scale[4], "2n", undefined, 0.5);
      }
    }, 100);

    // Add bass note
    if (bassSynth) {
      setTimeout(() => {
        bassSynth.triggerAttackRelease(scale[0] * 0.5, "2n", undefined, 0.8);
      }, 20);
    }
  } catch (e) {
    console.error("Error playing chord:", e);
  }
}

// Play a smooth transition chord when changing root note
function playTransitionChord(previousRoot) {
  if (!audioInitialized || !melodySynth || !harmonySynth || !bassSynth) return;

  try {
    // Check for valid inputs
    if (!previousRoot || !rootFrequency || !scale || scale.length < 5) {
      console.error("Invalid inputs for transition chord");
      return;
    }

    // Calculate old fifth frequency
    const oldFifth = previousRoot * 1.5;

    // First play a chord with the old fifth and new root
    setTimeout(() => {
      if (bassSynth) {
        bassSynth.triggerAttackRelease(
          rootFrequency * 0.5,
          "2n",
          undefined,
          0.6
        );
      }
    }, 10);

    // Melody plays old fifth
    setTimeout(() => {
      if (melodySynth) {
        melodySynth.triggerAttackRelease(oldFifth, "4n", undefined, 0.5);
      }
    }, 50);

    // Harmony plays new root
    setTimeout(() => {
      if (harmonySynth) {
        harmonySynth.triggerAttackRelease(rootFrequency, "2n", undefined, 0.4);
      }
    }, 100);

    // Then transition to new chord with delay
    setTimeout(() => {
      // Play root
      if (melodySynth) {
        melodySynth.triggerAttackRelease(scale[0], "2n", undefined, 0.6);
      }

      // Play fifth
      setTimeout(() => {
        if (harmonySynth) {
          harmonySynth.triggerAttackRelease(scale[4], "2n", undefined, 0.5);
        }
      }, 100);

      // Play third with longer delay
      setTimeout(() => {
        if (harmonySynth) {
          harmonySynth.triggerAttackRelease(scale[2], "2n", undefined, 0.4);
        }
      }, 400);
    }, 800);
  } catch (e) {
    console.error("Error playing transition chord:", e);
  }
}

function touchStarted() {
  // Add a small delay to ensure iOS processes the event properly
  setTimeout(() => {
    // Handle your touch logic here
    // For example, creating particles or initializing audio
    mousePressed();
  }, 10);
  
  // Prevent default to stop scrolling
  return false;
  
  
}

function touchMoved() {
  // Handle touch dragging same as mouse drag
  // Your handling code here, or just call your mouseDragged function
  mouseDragged();
  
  // IMPORTANT: prevent default to stop scrolling/zooming
  return false;
}
