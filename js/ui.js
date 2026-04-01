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

export function updateUI() {
  /* --- Score display --- */
  el.score.textContent = `Score: ${gameState.score}`;

  /* --- High score: update if beaten, persist to localStorage --- */
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('highScore', gameState.highScore);
  }
  el.highScore.textContent = `🏆 Best: ${gameState.highScore}`;

  /* --- Egg damage indicator --- */
  el.eggDamage.textContent = `🥚 Egg Damage: ${gameState.eggDamage}`;

  /* --- Health bar: green = alive, red = lost --- */
  el.healthBar.querySelectorAll('div').forEach((seg, i) => {
    seg.style.backgroundColor = i < gameState.health ? '#4caf50' : '#ff4444';
  });

  /* --- Missed enemies bar: color shifts with danger level --- */
  /* Yellow (<40%) → Orange (40-70%) → Red (>70%)              */
  el.missedBar.querySelectorAll('div').forEach((seg, i) => {
    if (i < gameState.missedEnemies) {
      const dangerRatio = gameState.missedEnemies / CONFIG.GAME.maxMissedEnemies;

      if (dangerRatio > 0.7) seg.style.backgroundColor = '#ff0000';
      else if (dangerRatio > 0.4) seg.style.backgroundColor = '#ff9800';
      else seg.style.backgroundColor = '#ffc107';
    } else {
      seg.style.backgroundColor = '#ddd'; // Empty segment
    }
  });

  /* --- Shake animation: triggers when 2 or fewer misses remain --- */
  if (gameState.missedEnemies >= CONFIG.GAME.maxMissedEnemies - 2) {
    el.missedBar.style.animation = 'shake 0.4s infinite';
  } else {
    el.missedBar.style.animation = 'none';
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

  for (let i = 0; i < CONFIG.GAME.maxHealth; i++) {
    el.healthBar.appendChild(document.createElement('div'));
  }

  for (let i = 0; i < CONFIG.GAME.maxMissedEnemies; i++) {
    el.missedBar.appendChild(document.createElement('div'));
  }
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