/* ========================================= */
/* AUDIO POOL (Safari Fix)                   */
/* Creates a pool of reusable Audio objects  */
/* to allow overlapping playback of sounds.  */
/*                                           */
/* Why:                                      */
/*   - Browsers (especially Safari) may      */
/*     block or glitch when the same Audio   */
/*     element is played repeatedly.         */
/*   - Pool allows multiple instances of     */
/*     the same sound to play simultaneously */
/*     (e.g. rapid shooting, collisions).    */
/* ========================================= */

function createAudioPool(src, size = 4, volume = 0.7) {
  const pool = [];

  // Pre-create multiple Audio instances
  for (let i = 0; i < size; i++) {
    const audio = new Audio(src);
    audio.volume = volume;
    pool.push(audio);
  }

  // Index for cycling through the pool
  let index = 0;

  return {
    play() {
      const audio = pool[index];

      // Move index forward (loop back at the end)
      index = (index + 1) % pool.length;

      /* Safari-safe behavior:
         If audio is still playing, reset it instead of waiting */
      if (!audio.paused) {
        audio.currentTime = 0;
      }

      // Attempt to play (ignore autoplay errors)
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    }
  };
}

/* ========================================= */
/* MUSIC (Background Loop)                   */
/* Handles continuous background music.      */
/* ========================================= */

const backgroundMusic = new Audio('assets/sounds/background_music.mp3');
backgroundMusic.loop = true;     // Repeat forever
backgroundMusic.volume = 0.5;    // Lower volume than SFX

/* ========================================= */
/* SOUND EFFECTS (SFX)                       */
/* Uses audio pools instead of single Audio  */
/* instances to support overlapping sounds.  */
/* ========================================= */

const eggPopSound = createAudioPool('assets/sounds/egg_pop.ogg', 4, 0.7);
const splatSound = createAudioPool('assets/sounds/splat.mp3', 6, 0.7);
const chickenEatSound = createAudioPool('assets/sounds/chicken_eat.mp3', 3, 0.7);
const damageSound = createAudioPool('assets/sounds/damage.wav', 3, 0.7);
const gameOverSound = createAudioPool('assets/sounds/game_over.mp3', 2, 0.7);
const victorySound = createAudioPool('assets/sounds/victory.mp3', 2, 0.7);

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