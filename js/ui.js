/* ========================================= */
/* UI MANAGEMENT                             */
/* Handles all DOM updates and visual state: */
/*   - HUD (score, health, missed, damage)   */
/*   - Grass animation state                 */
/*   - Menu visibility (start, pause, over)  */
/*   - Canvas resizing                       */
/*   - Health/missed bar initialization      */
/*   - Background music controls             */
/* ========================================= */

import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { soundState, backgroundMusic } from '../js/music.js';

/* ========================================= */
/* DOM ELEMENT REFERENCES                    */
/* Cached once at startup to avoid repeated  */
/* getElementById calls every frame.         */
/* ========================================= */

const el = {
  score: document.getElementById('current-score'),
  highScore: document.getElementById('high-score'),
  healthBar: document.getElementById('health-bar'),
  eggDamage: document.getElementById('egg-damage'),
  chickenSpeed: document.getElementById('chicken-speed'),
  missedBar: document.getElementById('missed-bar'),
  gameOverScreen: document.getElementById('game-over-screen'),
  gameOverReason: document.getElementById('game-over-reason'),
  pauseMenu: document.getElementById('pause-menu'),
  startMenu: document.getElementById('start-menu'),
  scoreContainer: document.getElementById('score-container'),
  canvas: document.getElementById('gameCanvas')
};

/* ========================================= */
/* GRASS ANIMATION STATE                     */
/* Controls the scrolling grass background.  */
/* Uses caching to avoid unnecessary DOM     */
/* class changes every frame.                */
/*                                           */
/* States:                                   */
/*   'static'  — no animation (menu/pause)   */
/*   'moving'  — normal scroll speed         */
/*   'boost'   — fast scroll (high enemy     */
/*               speed, score > 800)         */
/* ========================================= */

let currentGrassState = 'static';

export function setGrassState(state) {
  if (state === currentGrassState) return; // Skip if unchanged
  currentGrassState = state;
  el.canvas.classList.remove('grass-static', 'grass-moving', 'grass-boost');
  el.canvas.classList.add(`grass-${state}`);
}

/* ========================================= */
/* HUD UPDATE                                */
/* Called every frame and after collisions.  */
/* Updates all on-screen indicators:         */
/*   - Current score                         */
/*   - High score (saved to localStorage)    */
/*   - Egg damage level                      */
/*   - Health bar segments (green/red)       */
/*   - Missed enemies bar (yellow→orange→red)*/
/*   - Shake animation when close to limit   */
/* ========================================= */

/* updateUI runs every frame, but DOM writes trigger style/paint work
   even when nothing changed. Each indicator is therefore dirty-checked
   against the last rendered value and only touched on a real change.
   Bar segments are cached as arrays by initHealthBar (no per-frame
   querySelectorAll). */
const rendered = {
  score: null, highScore: null, eggDamage: null, speed: null,
  health: null, missed: null, shake: null
};
const segments = { health: [], missed: [] };

export function updateUI() {
  /* --- Score display --- */
  if (gameState.score !== rendered.score) {
    rendered.score = gameState.score;
    el.score.textContent = `Score: ${gameState.score}`;
  }

  /* --- High score: update in memory if beaten --- */
  /* Persisted to localStorage once on game over (persistHighScore),
     not here: updateUI runs every frame, and a record run would issue
     a synchronous disk write 60 times per second (micro-stutters). */
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
  }
  if (gameState.highScore !== rendered.highScore) {
    rendered.highScore = gameState.highScore;
    el.highScore.textContent = `🏆 Best: ${gameState.highScore}`;
  }

  /* --- Egg damage indicator --- */
  if (gameState.eggDamage !== rendered.eggDamage) {
    rendered.eggDamage = gameState.eggDamage;
    el.eggDamage.textContent = `🥚 Egg Damage: ${gameState.eggDamage}`;
  }

  /* --- Chicken speed indicator (shows x2 while boosted) --- */
  if (gameState.chicken.speed !== rendered.speed) {
    rendered.speed = gameState.chicken.speed;
    el.chickenSpeed.textContent = `🌶️ Speed: ${gameState.chicken.speed}`;
  }

  /* --- Health bar: green = alive, red = lost --- */
  if (gameState.health !== rendered.health) {
    rendered.health = gameState.health;
    segments.health.forEach((seg, i) => {
      seg.style.backgroundColor = i < gameState.health ? '#4caf50' : '#ff4444';
    });
  }

  /* --- Missed enemies bar: color shifts with danger level --- */
  /* Yellow (<40%) → Orange (40-70%) → Red (>70%)              */
  if (gameState.missedEnemies !== rendered.missed) {
    rendered.missed = gameState.missedEnemies;
    const dangerRatio = gameState.missedEnemies / CONFIG.GAME.maxMissedEnemies;
    const fillColor = dangerRatio > 0.7 ? '#ff0000'
                    : dangerRatio > 0.4 ? '#ff9800'
                    : '#ffc107';
    segments.missed.forEach((seg, i) => {
      seg.style.backgroundColor = i < gameState.missedEnemies ? fillColor : '#ddd';
    });

    /* --- Shake animation: triggers when 2 or fewer misses remain --- */
    const shake = gameState.missedEnemies >= CONFIG.GAME.maxMissedEnemies - 2;
    if (shake !== rendered.shake) {
      rendered.shake = shake;
      el.missedBar.style.animation = shake ? 'shake 0.4s infinite' : 'none';
    }
  }
}

/* ========================================= */
/* GAME OVER SCREEN                          */
/* Shows the game over overlay with reason.  */
/* Calculates total playtime from startTime. */
/* gameState.gameOver is already true when   */
/* this function is called from gameLoop.    */
/* ========================================= */

export function showGameOver(reason) {
  el.gameOverReason.textContent = reason;
  el.gameOverScreen.style.display = 'flex';
  setGrassState('static');

  // Calculate total play time in seconds
  if (gameState.startTime) {
    gameState.playtime = Math.round((Date.now() - gameState.startTime) / 1000);
  }
}

/* ========================================= */
/* CANVAS RESIZING                           */
/* Syncs canvas internal resolution with its */
/* CSS display size. Called on window resize  */
/* and before game start.                    */
/* Without this, canvas content would be     */
/* stretched/blurry.                         */
/* ========================================= */

export function resizeCanvas() {
  const w = el.canvas.clientWidth;
  const h = el.canvas.clientHeight;

  if (el.canvas.width !== w || el.canvas.height !== h) {
    el.canvas.width = w;
    el.canvas.height = h;
  }
}

/* ========================================= */
/* HIGH SCORE PERSISTENCE                    */
/* Called once when a run ends (game over or */
/* exit to menu) instead of every frame.     */
/* ========================================= */

export function persistHighScore() {
  localStorage.setItem('highScore', gameState.highScore);
}

/* ========================================= */
/* HEALTH & MISSED BARS INITIALIZATION       */
/* Creates individual <div> segments inside  */
/* the health and missed bars.               */
/* Called once at startup.                   */
/*                                           */
/* Health bar: maxHealth segments (default 10)*/
/* Missed bar: maxMissedEnemies segments (10)*/
/* Each segment is colored by updateUI().    */
/* ========================================= */

export function initHealthBar() {
  el.healthBar.innerHTML = '';
  el.missedBar.innerHTML = '';
  segments.health = [];
  segments.missed = [];

  for (let i = 0; i < CONFIG.GAME.maxHealth; i++) {
    const seg = document.createElement('div');
    el.healthBar.appendChild(seg);
    segments.health.push(seg);
  }

  for (let i = 0; i < CONFIG.GAME.maxMissedEnemies; i++) {
    const seg = document.createElement('div');
    el.missedBar.appendChild(seg);
    segments.missed.push(seg);
  }

  // Invalidate the dirty-check cache so the next updateUI repaints
  // everything against the fresh segments
  Object.keys(rendered).forEach(k => { rendered[k] = null; });
}

/* ========================================= */
/* MENU VISIBILITY HELPERS                   */
/* Show/hide various game screens.           */
/* Start menu overlays canvas via z-index,   */
/* canvas stays visible behind it.           */
/* ========================================= */

/**
 * Hides start menu and shows game HUD + canvas.
 */
export function hideStartMenu() {
  el.startMenu.style.display = 'none';
  el.scoreContainer.style.display = 'block';
  el.canvas.style.display = 'block';
}

/**
 * Shows start menu overlay.
 * Canvas remains visible underneath (z-index layering).
 */
export function showStartMenu() {
  el.startMenu.style.display = 'flex';
}

/**
 * Hides the game over screen.
 */
export function hideGameOver() {
  el.gameOverScreen.style.display = 'none';
}

/**
 * Shows the pause menu overlay.
 */
export function showPause() {
  el.pauseMenu.style.display = 'flex';
}

/**
 * Hides the pause menu overlay.
 */
export function hidePause() {
  el.pauseMenu.style.display = 'none';
}

/* ========================================= */
/* MUSIC CONTROLS                            */
/* Simple wrappers for background music.     */
/* Respects soundState.musicMuted flag.      */
/* ========================================= */

/**
 * Starts playing background music
 * (only if not muted in settings).
 */
export function playMusic() {
  if (!soundState.musicMuted) {
    backgroundMusic.play().catch(() => {});
  }
}

/**
 * Pauses background music.
 */
export function pauseMusic() {
  backgroundMusic.pause();
}

/**
 * Resets music to the beginning.
 * Used when returning to main menu.
 */
export function resetMusic() {
  backgroundMusic.currentTime = 0;
}