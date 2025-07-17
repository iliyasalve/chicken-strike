// music.js

const backgroundMusic = new Audio('assets/sounds/background_music.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.5; 
let musicMuted = false;

const eggPopSound = new Audio('assets/sounds/egg_pop.ogg');
eggPopSound.volume = 0.7;

const splatSound = new Audio('assets/sounds/splat.mp3');
splatSound.volume = 0.7;

const chickenEatSound = new Audio('assets/sounds/chicken_eat.mp3');
chickenEatSound.volume = 0.7;

const damageSound = new Audio('assets/sounds/damage.wav');
damageSound.volume = 0.7;

const gameOverSound = new Audio('assets/sounds/game_over.mp3');
gameOverSound.volume = 0.7;
let gameOverSoundPlayed = false;

const victorySound = new Audio('assets/sounds/victory.mp3');
victorySound.volume = 0.7;
let victorySoundPlayed = false;

let sfxMuted = false;

const toggleMusicBtn = document.getElementById('toggle-music-btn');
const toggleMusicBtnPause = document.getElementById('toggle-music-btn-pause');
const toggleSfxBtn = document.getElementById('toggle-sfx-btn');
const toggleSfxBtnPause = document.getElementById('toggle-sfx-btn-pause');

function toggleMusic() {
  musicMuted = !musicMuted;

  if (musicMuted) {
    backgroundMusic.pause();
  } else {
    backgroundMusic.play().catch(err => console.warn("Autoplay blocked:", err));
  }

  const newText = musicMuted ? '🎵 Music: Off' : '🎵 Music: On';
  toggleMusicBtn.textContent = newText;
  toggleMusicBtnPause.textContent = newText;
}

function toggleSfx() {
  sfxMuted = !sfxMuted;

  const newText = sfxMuted ? '🔇 SFX: Off' : '🔈 SFX: On';
  toggleSfxBtn.textContent = newText;
  toggleSfxBtnPause.textContent = newText;
}

toggleMusicBtn.addEventListener('click', toggleMusic);
toggleMusicBtnPause.addEventListener('click', toggleMusic);

toggleSfxBtn.addEventListener('click', toggleSfx);
toggleSfxBtnPause.addEventListener('click', toggleSfx);


export {
  backgroundMusic,
  eggPopSound,
  splatSound,
  chickenEatSound,
  damageSound,
  gameOverSound,
  gameOverSoundPlayed,
  victorySound,
  victorySoundPlayed,
  sfxMuted,
  musicMuted
};
