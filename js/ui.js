import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { soundState, backgroundMusic } from '../js/music.js';

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

// ============ GRASS STATE (с кешем, без лишних DOM-операций) ============

let currentGrassState = 'static';

export function setGrassState(state) {
  if (state === currentGrassState) return;
  currentGrassState = state;
  el.canvas.classList.remove('grass-static', 'grass-moving', 'grass-boost');
  el.canvas.classList.add(`grass-${state}`);
}

// ============ UI UPDATES ============

export function updateUI() {
    el.score.textContent = `Score: ${gameState.score}`;
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('highScore', gameState.highScore);
    }
    el.highScore.textContent = `High Score: ${gameState.highScore}`;
    el.eggDamage.textContent = `🥚 Egg Damage: ${gameState.eggDamage}`;
    // Обновление полоски здоровья
    el.healthBar.querySelectorAll('div').forEach((seg, i) => {
    seg.style.backgroundColor =
        i < gameState.health ? '#4caf50' : '#ff4444';
    });

    // Обновление полоски пропущенных врагов
    el.missedBar.querySelectorAll('div').forEach((seg, i) => {
    if (i < gameState.missedEnemies) {
        // Чем ближе к лимиту — тем краснее
        const dangerRatio = gameState.missedEnemies / CONFIG.GAME.maxMissedEnemies;

        if (dangerRatio > 0.7) {
        seg.style.backgroundColor = '#ff0000';
        } else if (dangerRatio > 0.4) {
        seg.style.backgroundColor = '#ff9800';
        } else {
        seg.style.backgroundColor = '#ffc107';
        }
    } else {
        seg.style.backgroundColor = '#ddd';
    }
    });
}

// ============ GAME OVER SCREEN ============

export function showGameOver(reason) {
  // gameState.gameOver уже true к моменту вызова
  el.gameOverReason.textContent = reason;
  el.gameOverScreen.style.display = 'flex';
  setGrassState('static');
  if (gameState.startTime) {
    gameState.playtime = Math.round((Date.now() - gameState.startTime) / 1000);
  }
}

// ============ CANVAS ============

export function resizeCanvas() {
  const w = el.canvas.clientWidth;
  const h = el.canvas.clientHeight;
  if (el.canvas.width !== w || el.canvas.height !== h) {
    el.canvas.width = w;
    el.canvas.height = h;
  }
}

// ============ HEALTH BAR INIT ============

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


// ============ MENU HELPERS ============

export function hideStartMenu() {
  el.startMenu.style.display = 'none';
  el.scoreContainer.style.display = 'block';
  el.canvas.style.display = 'block';
}

export function showStartMenu() {
  el.startMenu.style.display = 'flex';
  // НЕ прячем canvas — меню просто наложится сверху (z-index: 20)
}

export function hideGameOver() {
  el.gameOverScreen.style.display = 'none';
}

export function showPause() {
  el.pauseMenu.style.display = 'flex';
}

export function hidePause() {
  el.pauseMenu.style.display = 'none';
}

export function playMusic() {
  if (!soundState.musicMuted) {
    backgroundMusic.play().catch(() => {});
  }
}

export function pauseMusic() {
  backgroundMusic.pause();
}

export function resetMusic() {
  backgroundMusic.currentTime = 0;
}