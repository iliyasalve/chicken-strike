/* ========================================= */
/* SOUND EFFECTS — WEB AUDIO API             */
/*                                           */
/* Why Web Audio instead of <audio> pools:   */
/*   - HTMLAudioElement decodes its resource */
/*     lazily on the first play() and may    */
/*     evict the decoded buffer after idle,  */
/*     causing a main-thread hitch exactly   */
/*     when a sound is first (or rarely)     */
/*     needed: first shot, first kill,       */
/*     first pickup (PERF-4 microfreezes).   */
/*   - Web Audio decodes each file once at   */
/*     page load (async, while the player is */
/*     still in the menu) and keeps the PCM  */
/*     buffer in memory. Playback just       */
/*     creates a BufferSource — microseconds,*/
/*     no I/O, no decode, unlimited overlap  */
/*     (no pools needed).                    */
/* ========================================= */

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

/**
 * Loads and decodes a sound effect into an in-memory buffer.
 * Decoding starts immediately at page load and runs off the
 * critical path; play() is a no-op until the buffer is ready
 * (only possible if a sound fires within the first moments
 * of the very first game).
 */
function createSfx(src, volume = 0.7) {
  let buffer = null;

  // Per-sound gain node, created once and shared by all plays
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  gain.connect(audioCtx.destination);

  fetch(src)
    .then(response => response.arrayBuffer())
    .then(data => audioCtx.decodeAudioData(data))
    .then(decoded => { buffer = decoded; })
    .catch(() => {}); // Missing/undecodable file → sound stays silent

  return {
    play() {
      if (!buffer || audioCtx.state !== 'running') return;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start();
    }
  };
}

/**
 * Resumes the AudioContext. Browsers create it in a "suspended"
 * state until a user gesture; called from the Start button click.
 * Safe to call repeatedly.
 */
export function unlockAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

/* ========================================= */
/* MUSIC (Background Loop)                   */
/* Stays on HTMLAudioElement: a 4 MB looping */
/* track should stream, not sit in RAM as    */
/* decoded PCM.                              */
/* ========================================= */

const backgroundMusic = new Audio('assets/sounds/background_music.mp3');
backgroundMusic.loop = true;     // Repeat forever
backgroundMusic.volume = 0.5;    // Lower volume than SFX

/* ========================================= */
/* SOUND EFFECTS (SFX)                       */
/* egg_pop is AAC (m4a): Safari's            */
/* decodeAudioData can't handle Ogg Vorbis.  */
/* ========================================= */

const eggPopSound = createSfx('assets/sounds/egg_pop.m4a', 0.7);
const splatSound = createSfx('assets/sounds/splat.mp3', 0.7);
const chickenEatSound = createSfx('assets/sounds/chicken_eat.mp3', 0.7);
const damageSound = createSfx('assets/sounds/damage.wav', 0.7);
const gameOverSound = createSfx('assets/sounds/game_over.mp3', 0.7);
const victorySound = createSfx('assets/sounds/victory.mp3', 0.7);

/* ========================================= */
/* GLOBAL SOUND STATE                        */
/* Stores flags controlling audio behavior.  */
/* ========================================= */

export const soundState = {
  gameOverSoundPlayed: false, // Prevents replaying game over sound
  victorySoundPlayed: false,  // Prevents replaying victory sound
  sfxMuted: false,            // Toggles all sound effects
  musicMuted: false           // Toggles background music
};

/* ========================================= */
/* UI CONTROLS (Buttons)                     */
/* Handles user interaction for toggling     */
/* music and sound effects.                  */
/* ========================================= */

// DOM references for toggle buttons
const toggleMusicBtn = document.getElementById('toggle-music-btn');
const toggleSfxBtn = document.getElementById('toggle-sfx-btn');

/* ========================================= */
/* TOGGLE MUSIC                              */
/* Enables/disables background music.        */
/* Updates button label accordingly.         */
/* ========================================= */

function toggleMusic() {
  // Flip music state
  soundState.musicMuted = !soundState.musicMuted;

  if (soundState.musicMuted) {
    // Stop music when muted
    backgroundMusic.pause();
  } else {
    // Resume playback (ignore autoplay errors)
    backgroundMusic.play().catch(() => {});
  }

  // Update button text
  toggleMusicBtn.textContent = soundState.musicMuted
    ? '🎵 Music: Off'
    : '🎵 Music: On';
}

/* ========================================= */
/* TOGGLE SFX                                */
/* Enables/disables all sound effects.       */
/* Only affects future playback.             */
/* ========================================= */

function toggleSfx() {
  // Flip SFX state
  soundState.sfxMuted = !soundState.sfxMuted;

  // Update button text
  toggleSfxBtn.textContent = soundState.sfxMuted
    ? '🔇 SFX: Off'
    : '🔈 SFX: On';
}

/* ========================================= */
/* EVENT LISTENERS                           */
/* Attach click handlers to buttons.         */
/* ========================================= */

toggleMusicBtn.addEventListener('click', toggleMusic);
toggleSfxBtn.addEventListener('click', toggleSfx);

/* ========================================= */
/* EXPORTS                                   */
/* Makes audio objects available to other    */
/* modules (game logic, UI, etc.).           */
/* ========================================= */

export {
  backgroundMusic,
  eggPopSound,
  splatSound,
  chickenEatSound,
  damageSound,
  gameOverSound,
  victorySound
};
