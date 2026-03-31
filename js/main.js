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
import {
  submitScore, getLeaderboard, getFullLeaderboard,
  getLeaderboardLimit, formatDate, formatPlaytime,
  isUsernameTaken, getUserId
} from './leaderboard.js';
import { soundState, gameOverSound, victorySound } from '../js/music.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    showGameOverStats();

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

    loadFullLeaderboard();
    animationFrameId = null;
    return;
  }

  if (gameState.paused) {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateChicken(canvas);
  updateEggs();
  updateEnemies(canvas);
  updateBoss(canvas);
  updateItems(canvas);
  handleCollisions();

  drawChicken(ctx);
  drawEggs(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawItems(ctx);

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

// ============ GAME OVER STATS ============

function showGameOverStats() {
  const scoreEl = document.getElementById('game-over-score');
  const timeEl = document.getElementById('game-over-time');
  if (scoreEl) scoreEl.textContent = `Score: ${gameState.score}`;
  if (timeEl) timeEl.textContent = `Time: ${formatPlaytime(gameState.playtime)}`;
}

// ============ LEADERBOARD RENDERING ============

async function loadFullLeaderboard() {
  // Game Over — всегда только топ 3
  const data = await getLeaderboard(3);
  const tbody = document.getElementById('leaderboard-list');
  if (!tbody) return;

  tbody.innerHTML = data.map((entry, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${entry.username}</td>
      <td>${entry.score}</td>
      <td>${formatPlaytime(entry.playtime)}</td>
    </tr>
  `).join('');
}

async function loadMiniLeaderboard() {
  const limit = getLeaderboardLimit();
  const data = await getLeaderboard(limit);
  const list = document.getElementById('mini-leaderboard-list');
  if (!list) return;

  list.innerHTML = data.map(entry => `
    <li>
      <span class="mini-lb-name">${entry.username}</span>
      <span class="mini-lb-score">${entry.score}</span>
    </li>
  `).join('');
}

// ============ GAME CONTROL ============

function startGame() {
  stopLoop();
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
  loadMiniLeaderboard(); // ✅ Загружаем мини-лидерборд при старте
  animationFrameId = requestAnimationFrame(gameLoop);
}

function resetGame() {
  hideGameOver();
  startGame();
}

function goToMenu() {
  stopLoop();
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
  if (e.target === rulesModal) rulesModal.style.display = 'none';
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && rulesModal.style.display === 'flex') {
    rulesModal.style.display = 'none';
  }
});

// ============ LEADERBOARD MODAL ============

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');

leaderboardBtn.addEventListener('click', async () => {
  leaderboardModal.style.display = 'flex';
  await loadModalLeaderboard();
});

leaderboardCloseBtn.addEventListener('click', () => {
  leaderboardModal.style.display = 'none';
});

leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) {
    leaderboardModal.style.display = 'none';
  }
});

// Добавь Escape для закрытия (обнови существующий обработчик)
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (rulesModal.style.display === 'flex') {
      rulesModal.style.display = 'none';
    } else if (leaderboardModal.style.display === 'flex') {
      leaderboardModal.style.display = 'none';
    }
  }
});

async function loadModalLeaderboard() {
  const data = await getFullLeaderboard();
  const tbody = document.getElementById('leaderboard-modal-list');
  const emptyMsg = document.getElementById('leaderboard-modal-empty');
  const tableWrapper = document.getElementById('leaderboard-modal-table-wrapper');

  if (!data.length) {
    emptyMsg.style.display = 'block';
    tableWrapper.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = data.map((entry, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${entry.username}</td>
      <td>${entry.score}</td>
      <td>${formatPlaytime(entry.playtime)}</td>
      <td>${formatDate(entry.created_at)}</td>
    </tr>
  `).join('');
}

// ============ LEADERBOARD SUBMIT ============

const submitBtn = document.getElementById('submit-leaderboard-btn');
const usernameInput = document.getElementById('leaderboard-username');

submitBtn?.addEventListener('click', async () => {
  let username;

  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    username = window.Telegram.WebApp.initDataUnsafe.user.first_name || 'Anonymous';
  } else {
    username = usernameInput?.value.trim() || 'Anonymous';
  }

  // ✅ Проверяем доступность ника
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳...';

  const taken = await isUsernameTaken(username, getUserId());

  if (taken) {
    submitBtn.textContent = '❌ Name taken';
    usernameInput.style.borderColor = '#ff4444';

    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = '💾 Save';
      usernameInput.style.borderColor = '#c2b280';
    }, 2000);
    return;
  }

  const result = await submitScore(username, gameState.score, gameState.playtime);
  await loadFullLeaderboard();

  if (result?.updated) {
    submitBtn.textContent = '✅ Saved!';
  } else if (result?.updated === false) {
    submitBtn.textContent = '📊 Not a record';
  } else {
    submitBtn.textContent = '❌ Error';
  }

  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 Save';
  }, 2000);
});

// ============ INIT ============

window.addEventListener('resize', () => {
  resizeCanvas();
  loadMiniLeaderboard(); // ✅ Обновляем при смене размера
});

initHealthBar();
setupInput();
resizeCanvas();
updateUI();