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
  deleteByDeviceId, hasConsent, setConsent, isUsernameTaken, getUserId
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
const privacyBtn = document.getElementById('privacy-btn');
const privacyBtnPause = document.getElementById('privacy-btn-pause');

document.getElementById('rules-btn').addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});

document.getElementById('rules-btn-pause').addEventListener('click', () => {
  rulesModal.style.display = 'flex';
});

privacyBtn.addEventListener('click', () => {
  privacyModal.style.display = 'flex';
});

privacyBtnPause.addEventListener('click', () => {
  privacyModal.style.display = 'flex';
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
    } else if (deleteModal.style.display === 'flex') {
      deleteModal.style.display = 'none';
    } else if (privacyModal.style.display === 'flex') {
      privacyModal.style.display = 'none';
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

// Если Telegram — заполняем ник и блокируем поле
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  // Берём first_name, если нет — username (@nickname), если нет — оставляем поле открытым
  const tgName = tgUser.first_name || tgUser.username || '';

  if (usernameInput && tgName) {
    // Имя найдено — заполняем и блокируем
    usernameInput.value = tgName;
    usernameInput.readOnly = true;
    usernameInput.style.opacity = '0.7';
    usernameInput.style.cursor = 'default';
  } else if (usernameInput) {
    // Имени нет — оставляем поле активным
    usernameInput.placeholder = 'Enter your nickname';
  }
}

submitBtn?.addEventListener('click', async () => {
  
  // ✅ Проверяем GDPR согласие
  if (!hasConsent()) {
    showGdprIfNeeded();
    return;
  }
  
   const username = usernameInput?.value.trim();

  // Не даём сохранить без ника
  if (!username) {
    usernameInput.style.borderColor = '#ff4444';
    usernameInput.placeholder = '⚠️ Enter a nickname!';
    setTimeout(() => {
      usernameInput.style.borderColor = '#c2b280';
      usernameInput.placeholder = 'Enter your nickname';
    }, 2000);
    return;
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


// ============ GDPR ============

const gdprBanner = document.getElementById('gdpr-banner');
const gdprAccept = document.getElementById('gdpr-accept');
const gdprDecline = document.getElementById('gdpr-decline');
const privacyModal = document.getElementById('privacy-modal');
const privacyCloseBtn = document.getElementById('privacy-close-btn');
const deleteDataBtn = document.getElementById('delete-data-btn');

// Показываем GDPR баннер перед первым сохранением
function showGdprIfNeeded() {
  if (!hasConsent()) {
    gdprBanner.style.display = 'block';
    return false; // согласия нет
  }
  return true; // согласие есть
}

gdprAccept.addEventListener('click', () => {
  setConsent(true);
  gdprBanner.style.display = 'none';
});

gdprDecline.addEventListener('click', () => {
  setConsent(false);
  gdprBanner.style.display = 'none';
});

privacyCloseBtn.addEventListener('click', () => {
  privacyModal.style.display = 'none';
});

privacyModal.addEventListener('click', (e) => {
  if (e.target === privacyModal) privacyModal.style.display = 'none';
});

// ===== DELETE DATA =====

// ============ DELETE DATA MODAL ============

const deleteModal = document.getElementById('delete-modal');
const deleteModalCloseBtn = document.getElementById('delete-modal-close-btn');
const deleteByDeviceBtn = document.getElementById('delete-by-device-btn');
const deleteResult = document.getElementById('delete-result');

deleteDataBtn.addEventListener('click', () => {
  deleteResult.style.display = 'none';
  deleteModal.style.display = 'flex';
});

deleteModalCloseBtn.addEventListener('click', () => {
  deleteModal.style.display = 'none';
});

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) deleteModal.style.display = 'none';
});

function showDeleteResult(message, type) {
  deleteResult.textContent = message;
  deleteResult.className = type;
  deleteResult.style.display = 'block';
}

deleteByDeviceBtn.addEventListener('click', async () => {
  const confirmed = confirm(
    'This will permanently delete all your scores linked to this device. Continue?'
  );
  if (!confirmed) return;

  deleteByDeviceBtn.disabled = true;
  deleteByDeviceBtn.textContent = '⏳ Deleting...';

  const result = await deleteByDeviceId();

  if (result.success && result.count > 0) {
    showDeleteResult(`✅ Deleted ${result.count} record(s). Local data cleared.`, 'success');
    gameState.highScore = 0;
    updateUI();
  } else if (result.success && result.count === 0) {
    showDeleteResult('⚠️ No records found for this device.', 'warning');
  } else {
    showDeleteResult('❌ Something went wrong. Please contact us by email.', 'error');
  }

  setTimeout(() => {
    deleteByDeviceBtn.disabled = false;
    deleteByDeviceBtn.textContent = 'Delete my data';
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