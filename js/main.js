import { CONFIG } from './config.js';
import { gameState, resetGameState } from './state.js';
import {
  resizeCanvas, updateUI, setGrassState, initHealthBar,
  hideStartMenu, showStartMenu, hideGameOver, hidePause,
  showPause, showGameOver, playMusic, pauseMusic, resetMusic
} from './ui.js';
import { setupInput } from './input.js';
import {
  updateChicken, updateEggs, updateEnemies, updateBoss, updateItems,
  drawChicken, drawEggs, drawEnemies, drawBoss, drawItems,
  spawnEnemy, spawnCorn, spawnWheat
} from './entities.js';
import { handleCollisions } from './collision.js';
import { submitScore, getLeaderboard } from './leaderboard.js';
import { soundState, gameOverSound, victorySound } from '../js/music.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ✅ ИСПРАВЛЕНИЕ: отслеживаем ID анимации
let animationFrameId = null;

// ============ STOP LOOP ============

function stopLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ============ GAME LOOP ============

function gameLoop(timestamp) {
  if (gameState.gameOver) {
    showGameOver(gameState.gameOverReason || 'Game Over!');

    if (gameState.isVictory) {
      if (!soundState.victorySoundPlayed && !soundState.sfxMuted) {
        victorySound.play();
        soundState.victorySoundPlayed = true;
      }
    } else {
      if (!soundState.gameOverSoundPlayed && !soundState.sfxMuted) {
        gameOverSound.play();
        soundState.gameOverSoundPlayed = true;
      }
    }

    animationFrameId = null; // Цикл мёртв
    return;
  }

  if (gameState.paused) {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update
  updateChicken(canvas);
  updateEggs();
  updateEnemies(canvas);
  updateBoss(canvas);
  updateItems(canvas);
  handleCollisions();

  // Draw
  drawChicken(ctx);
  drawEggs(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawItems(ctx);

  // Spawn
  if (timestamp - gameState.lastSpawnTime > CONFIG.SPAWN.baseInterval) {
    spawnEnemy(canvas);
    gameState.lastSpawnTime = timestamp;
  }
  if (timestamp - gameState.lastCornSpawnTime > gameState.nextCornInterval) {
    spawnCorn(canvas);
    gameState.lastCornSpawnTime = timestamp;
    gameState.nextCornInterval = Math.floor(
      Math.random() * (CONFIG.CORN.maxInterval - CONFIG.CORN.minInterval + 1)
    ) + CONFIG.CORN.minInterval;
  }
  if (timestamp - gameState.lastWheatSpawnTime > gameState.nextWheatInterval) {
    spawnWheat(canvas);
    gameState.lastWheatSpawnTime = timestamp;
    gameState.nextWheatInterval = Math.floor(
      Math.random() * (CONFIG.WHEAT.maxInterval - CONFIG.WHEAT.minInterval + 1)
    ) + CONFIG.WHEAT.minInterval;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

// ============ GAME CONTROL ============

function startGame() {
  stopLoop(); // ✅ Убиваем старый цикл если есть
  resizeCanvas();
  resetGameState(canvas);
  soundState.gameOverSoundPlayed = false;
  soundState.victorySoundPlayed = false;
  gameState.startTime = Date.now();
  hideStartMenu();
  hideGameOver();
  hidePause();
  setGrassState('moving');
  updateUI();
  playMusic();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  hideGameOver();
  startGame();
}

function goToMenu() {
  stopLoop(); // ✅ Убиваем цикл при выходе в меню
  hideGameOver();
  hidePause();
  pauseMusic();
  resetMusic();
  setGrassState('static');
  showStartMenu();
}

function resumeGame() {
  gameState.paused = false;
  hidePause();
  setGrassState('moving');
  playMusic();
  // ✅ НЕ запускаем новый цикл — он уже крутится
}

// ============ BUTTON LISTENERS ============

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);
document.getElementById('menu-btn-game-over').addEventListener('click', goToMenu);
document.getElementById('menu-btn-pause').addEventListener('click', goToMenu);
document.getElementById('resume-btn').addEventListener('click', resumeGame);

// ============ RULES MODAL ============

const rulesModal = document.getElementById('rules-modal');
const rulesCloseBtn = document.getElementById('rules-close-btn');

// Обе кнопки открывают одно и то же окно правил
document.getElementById('rules-btn').addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});

document.getElementById('rules-btn-pause').addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});

rulesCloseBtn.addEventListener('click', () => {
  rulesModal.style.display = 'none';
});

rulesModal.addEventListener('click', (e) => {
  if (e.target === rulesModal) {
    rulesModal.style.display = 'none';
  }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && rulesModal.style.display === 'flex') {
    rulesModal.style.display = 'none';
  }
});

// ============ LEADERBOARD ============

const submitBtn = document.getElementById('submit-leaderboard-btn');
const usernameInput = document.getElementById('leaderboard-username');
const leaderboardList = document.getElementById('leaderboard-list');

submitBtn?.addEventListener('click', async () => {
  const username = usernameInput?.value.trim() || 'Anonymous';
  await submitScore(username, gameState.score, gameState.playtime);
  await loadLeaderboard();
});

async function loadLeaderboard() {
  const data = await getLeaderboard(10);
  if (leaderboardList) {
    leaderboardList.innerHTML = data
      .map((e, i) => `<li>#${i + 1} ${e.username} — ${e.score} pts (${e.playtime}s)</li>`)
      .join('');
  }
}

// ============ INIT ============

window.addEventListener('resize', resizeCanvas);
initHealthBar();
setupInput();
resizeCanvas();
updateUI();