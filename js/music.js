// ============ AUDIO POOL (фикс для Safari) ============

function createAudioPool(src, size = 4, volume = 0.7) {
  const pool = [];
  for (let i = 0; i < size; i++) {
    const audio = new Audio(src);
    audio.volume = volume;
    pool.push(audio);
  }
  let index = 0;

  return {
    play() {
      const audio = pool[index];
      index = (index + 1) % pool.length;

      // Safari-safe: клонируем если занят
      if (!audio.paused) {
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {});
      }
    }
  };
}

// ============ MUSIC ============

const backgroundMusic = new Audio('assets/sounds/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5;

// ============ SFX (пулы вместо одиночных Audio) ============

const eggPopSound = createAudioPool('assets/sounds/egg_pop.ogg', 4, 0.7);
const splatSound = createAudioPool('assets/sounds/splat.mp3', 6, 0.7);
const chickenEatSound = createAudioPool('assets/sounds/chicken_eat.mp3', 3, 0.7);
const damageSound = createAudioPool('assets/sounds/damage.wav', 3, 0.7);
const gameOverSound = createAudioPool('assets/sounds/game_over.mp3', 2, 0.7);
const victorySound = createAudioPool('assets/sounds/victory.mp3', 2, 0.7);

// ============ STATE ============

export const soundState = {
  gameOverSoundPlayed: false,
  victorySoundPlayed: false,
  sfxMuted: false,
  musicMuted: false
};

// ============ CONTROLS ============

const toggleMusicBtn = document.getElementById('toggle-music-btn');
const toggleMusicBtnPause = document.getElementById('toggle-music-btn-pause');
const toggleSfxBtn = document.getElementById('toggle-sfx-btn');
const toggleSfxBtnPause = document.getElementById('toggle-sfx-btn-pause');

function toggleMusic() {
  soundState.musicMuted = !soundState.musicMuted;

  if (soundState.musicMuted) {
    backgroundMusic.pause();
  } else {
    backgroundMusic.play().catch(() => {});
  }

  const newText = soundState.musicMuted ? '🎵 Music: Off' : '🎵 Music: On';
  toggleMusicBtn.textContent = newText;
  toggleMusicBtnPause.textContent = newText;
}

function toggleSfx() {
  soundState.sfxMuted = !soundState.sfxMuted;

  const newText = soundState.sfxMuted ? '🔇 SFX: Off' : '🔈 SFX: On';
  toggleSfxBtn.textContent = newText;
  toggleSfxBtnPause.textContent = newText;
}

toggleMusicBtn.addEventListener('click', toggleMusic);
toggleMusicBtnPause.addEventListener('click', toggleMusic);
toggleSfxBtn.addEventListener('click', toggleSfx);
toggleSfxBtnPause.addEventListener('click', toggleSfx);

// ============ EXPORT ============

export {
  backgroundMusic,
  eggPopSound,
  splatSound,
  chickenEatSound,
  damageSound,
  gameOverSound,
  victorySound
};