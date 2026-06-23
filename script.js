const envelopeButton = document.querySelector(".envelope-button");
const tapText = document.querySelector(".tap-text");
const insideInvitation = document.querySelector(".inside-invitation");
const cursorGlow = document.querySelector(".cursor-glow");
const musicToggle = document.querySelector(".music-toggle");
const canUseCursorGlow = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
const MUSIC_VOLUME = 0.16;
const MUTED_VOLUME = 0.0001;

let audioContext;
let musicGain;
let musicLoopTimer;
let padNodes = [];
let isMusicMuted = false;

const lullabyNotes = [
  { frequency: 523.25, duration: 0.9 },
  { frequency: 659.25, duration: 0.9 },
  { frequency: 783.99, duration: 1.05 },
  { frequency: 659.25, duration: 0.95 },
  { frequency: 587.33, duration: 0.95 },
  { frequency: 659.25, duration: 0.9 },
  { frequency: 523.25, duration: 1.3 },
  { frequency: 392, duration: 1.25 },
];

function scheduleMusicNote(frequency, startTime, duration, isAccent) {
  const tone = audioContext.createOscillator();
  const toneGain = audioContext.createGain();
  const chime = audioContext.createOscillator();
  const chimeGain = audioContext.createGain();

  tone.type = isAccent ? "triangle" : "sine";
  tone.frequency.setValueAtTime(frequency, startTime);
  toneGain.gain.setValueAtTime(0.0001, startTime);
  toneGain.gain.exponentialRampToValueAtTime(isAccent ? 0.32 : 0.22, startTime + 0.08);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  chime.type = "sine";
  chime.frequency.setValueAtTime(frequency * 2, startTime + 0.02);
  chimeGain.gain.setValueAtTime(0.0001, startTime);
  chimeGain.gain.exponentialRampToValueAtTime(0.075, startTime + 0.1);
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.9));

  tone.connect(toneGain);
  chime.connect(chimeGain);
  toneGain.connect(musicGain);
  chimeGain.connect(musicGain);

  tone.start(startTime);
  chime.start(startTime);
  tone.stop(startTime + duration + 0.08);
  chime.stop(startTime + duration + 0.08);
}

function startHarmonyPad() {
  if (padNodes.length > 0) {
    return;
  }

  [130.81, 196, 261.63].forEach((frequency, index) => {
    const pad = audioContext.createOscillator();
    const padGain = audioContext.createGain();

    pad.type = index === 1 ? "triangle" : "sine";
    pad.frequency.setValueAtTime(frequency, audioContext.currentTime);
    padGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    padGain.gain.exponentialRampToValueAtTime(index === 1 ? 0.035 : 0.024, audioContext.currentTime + 1.1);

    pad.connect(padGain);
    padGain.connect(musicGain);
    pad.start();
    padNodes.push({ pad, padGain });
  });
}

function scheduleMusicLoop() {
  if (!audioContext) {
    return;
  }

  let noteStart = audioContext.currentTime + 0.08;

  lullabyNotes.forEach((note, index) => {
    scheduleMusicNote(note.frequency, noteStart, note.duration, index % 4 === 0);
    noteStart += note.duration * 0.92;
  });
}

function updateMusicButton() {
  musicToggle.hidden = false;
  musicToggle.classList.toggle("is-muted", isMusicMuted);
  musicToggle.setAttribute("aria-pressed", String(!isMusicMuted));
  musicToggle.setAttribute("aria-label", isMusicMuted ? "Play background music" : "Pause background music");
}

function fadeMusicVolume(targetVolume) {
  if (!audioContext || !musicGain) {
    return;
  }

  const now = audioContext.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setTargetAtTime(targetVolume, now, 0.09);
}

function startBackgroundMusic() {
  if (!AudioContextConstructor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
    const musicFilter = audioContext.createBiquadFilter();

    musicFilter.type = "lowpass";
    musicFilter.frequency.setValueAtTime(2600, audioContext.currentTime);

    musicGain = audioContext.createGain();
    musicGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    musicGain.connect(musicFilter);
    musicFilter.connect(audioContext.destination);

    startHarmonyPad();
    scheduleMusicLoop();
    musicLoopTimer = window.setInterval(scheduleMusicLoop, 7200);
  }

  audioContext
    .resume()
    .then(() => {
      fadeMusicVolume(isMusicMuted ? MUTED_VOLUME : MUSIC_VOLUME);
      updateMusicButton();
    })
    .catch(() => {
      musicToggle.hidden = true;
    });
}

function openEnvelope() {
  if (envelopeButton.classList.contains("is-open")) {
    return;
  }

  startBackgroundMusic();
  document.body.classList.add("is-envelope-open");
  envelopeButton.classList.add("is-open");
  envelopeButton.setAttribute("aria-expanded", "true");
  tapText.textContent = "opened";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.setTimeout(() => {
    document.body.classList.add("is-glowing");
  }, 620);

  window.setTimeout(() => {
    document.body.classList.add("is-invitation-visible");
    insideInvitation.removeAttribute("aria-hidden");
  }, 1350);

  window.setTimeout(() => {
    document.body.classList.add("is-envelope-gone");

    insideInvitation.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, 2100);
}

envelopeButton.addEventListener("click", openEnvelope);

envelopeButton.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openEnvelope();
  }
});

if (canUseCursorGlow) {
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let glowX = cursorX;
  let glowY = cursorY;

  window.addEventListener("pointermove", (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    document.body.classList.add("has-cursor-glow");
  });

  window.addEventListener("pointerleave", () => {
    document.body.classList.remove("has-cursor-glow");
  });

  function animateCursorGlow() {
    glowX += (cursorX - glowX) * 0.16;
    glowY += (cursorY - glowY) * 0.16;
    cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
    window.requestAnimationFrame(animateCursorGlow);
  }

  animateCursorGlow();
}

musicToggle.addEventListener("click", () => {
  if (!audioContext) {
    startBackgroundMusic();
    return;
  }

  isMusicMuted = !isMusicMuted;
  fadeMusicVolume(isMusicMuted ? MUTED_VOLUME : MUSIC_VOLUME);
  updateMusicButton();
});
