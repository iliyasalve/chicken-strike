/* ========================================= */
/* IMPORTS                                   */
/* ========================================= */

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

/* ========================================= */
/* CANVAS SETUP                              */
/* ========================================= */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* ========================================= */
/* ANIMATION FRAME MANAGEMENT                */
/* Tracks current loop ID to prevent         */
/* multiple loops running simultaneously.    */
/* ========================================= */

let animationFrameId = null;

/**
 * Cancels any running game loop.
 * Must be called before starting a new loop
 * or when navigating to menu.
 */
function stopLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/* ========================================= */
/* GAME LOOP                                 */
/* Core update/draw cycle using rAF.         */
/* Handles game over, pause, and all         */
/* entity updates/draws/spawns per frame.    */
/* ========================================= */

function gameLoop(timestamp) {

  /* --- Game Over: show screen, play sound, stop loop --- */
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

    loadGameOverLeaderboard();
    animationFrameId = null;
    return;
  }

  /* --- Pause: loop stays alive but skips updates/draws --- */
  if (gameState.paused) {
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  /* --- Clear canvas --- */
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* --- Update all entities --- */
  updateChicken(canvas);
  updateEggs();
  updateEnemies(canvas);
  updateBoss(canvas);
  updateItems(canvas);
  handleCollisions();

  /* --- Draw all entities --- */
  drawChicken(ctx);
  drawEggs(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawItems(ctx);

  /* --- Spawn enemies at interval --- */
  if (timestamp - gameState.lastSpawnTime > CONFIG.SPAWN.baseInterval) {
    spawnEnemy(canvas);
    gameState.lastSpawnTime = timestamp;
  }

  /* --- Spawn corn (speed boost + damage up) at random interval --- */
  if (timestamp - gameState.lastCornSpawnTime > gameState.nextCornInterval) {
    spawnCorn(canvas);
    gameState.lastCornSpawnTime = timestamp;
    gameState.nextCornInterval = Math.floor(
      Math.random() * (CONFIG.CORN.maxInterval - CONFIG.CORN.minInterval + 1)
    ) + CONFIG.CORN.minInterval;
  }

  /* --- Spawn wheat (health restore) at random interval --- */
  if (timestamp - gameState.lastWheatSpawnTime > gameState.nextWheatInterval) {
    spawnWheat(canvas);
    gameState.lastWheatSpawnTime = timestamp;
    gameState.nextWheatInterval = Math.floor(
      Math.random() * (CONFIG.WHEAT.maxInterval - CONFIG.WHEAT.minInterval + 1)
    ) + CONFIG.WHEAT.minInterval;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

/* ========================================= */
/* GAME OVER — STATS DISPLAY                 */
/* Shows final score and playtime on the     */
/* game over screen.                         */
/* ========================================= */

function showGameOverStats() {
  const scoreEl = document.getElementById('game-over-score');
  const timeEl = document.getElementById('game-over-time');
  if (scoreEl) scoreEl.textContent = `Score: ${gameState.score}`;
  if (timeEl) timeEl.textContent = `Time: ${formatPlaytime(gameState.playtime)}`;
}

/* ========================================= */
/* LEADERBOARD — RENDERING                   */
/* Three different leaderboard views:        */
/*   1. Game Over screen (top 3)             */
/*   2. In-game mini sidebar (3 or 10)       */
/*   3. Full modal from menu (top 100)       */
/* ========================================= */

/**
 * Loads top 3 players into the game over screen table.
 */
async function loadGameOverLeaderboard() {
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

/**
 * Loads leaderboard into the in-game sidebar.
 * Shows 3 entries on mobile, 10 on desktop.
 */
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

/**
 * Loads full leaderboard (top 100) into the modal.
 * Includes date column.
 */
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

/* ========================================= */
/* GAME CONTROL                              */
/* Start, restart, menu, resume functions.   */
/* ========================================= */

/**
 * Starts a new game session.
 * Kills any existing loop, resets state,
 * loads mini leaderboard, begins music.
 */
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
  loadMiniLeaderboard();
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Restarts the game from game over screen.
 */
function resetGame() {
  hideGameOver();
  startGame();
}

/**
 * Returns to main menu.
 * Stops loop and resets music.
 */
function goToMenu() {
  stopLoop();
  hideGameOver();
  hidePause();
  pauseMusic();
  resetMusic();
  setGrassState('static');
  showStartMenu();
}

/**
 * Resumes game from pause.
 * Does NOT call requestAnimationFrame —
 * the loop is already running in paused state.
 */
function resumeGame() {
  gameState.paused = false;
  hidePause();
  setGrassState('moving');
  playMusic();
}

/* ========================================= */
/* BUTTON LISTENERS — CORE GAME              */
/* ========================================= */

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', resetGame);
document.getElementById('menu-btn-game-over').addEventListener('click', goToMenu);
document.getElementById('menu-btn-pause').addEventListener('click', goToMenu);
document.getElementById('resume-btn').addEventListener('click', resumeGame);

/* ========================================= */
/* DOM REFERENCES — ALL MODALS               */
/* Grouped here to avoid scattering and      */
/* duplicate declarations throughout code.   */
/* ========================================= */

// Rules
const rulesModal = document.getElementById('rules-modal');
const rulesCloseBtn = document.getElementById('rules-close-btn');

// Leaderboard
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');

// Settings
const settingsModal = document.getElementById('settings-modal');
const settingsCloseBtn = document.getElementById('settings-close-btn');

// Privacy Policy
const privacyModal = document.getElementById('privacy-modal');
const privacyCloseBtn = document.getElementById('privacy-close-btn');
const privacyBtn = document.getElementById('privacy-btn');

// Delete Data
const deleteModal = document.getElementById('delete-modal');
const deleteModalCloseBtn = document.getElementById('delete-modal-close-btn');
const deleteByDeviceBtn = document.getElementById('delete-by-device-btn');
const deleteResult = document.getElementById('delete-result');
const deleteDataBtn = document.getElementById('delete-data-btn');

// GDPR
const gdprBanner = document.getElementById('gdpr-banner');
const gdprAccept = document.getElementById('gdpr-accept');
const gdprDecline = document.getElementById('gdpr-decline');

// Leaderboard submit
const submitBtn = document.getElementById('submit-leaderboard-btn');
const usernameInput = document.getElementById('leaderboard-username');

/* ========================================= */
/* MODAL — RULES (How to Play)               */
/* Accessible from main menu and pause menu. */
/* ========================================= */

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

/* ========================================= */
/* MODAL — LEADERBOARD (Top 100)             */
/* Accessible from main menu.                */
/* ========================================= */

document.getElementById('leaderboard-btn').addEventListener('click', async () => {
  leaderboardModal.style.display = 'flex';
  await loadModalLeaderboard();
});

leaderboardCloseBtn.addEventListener('click', () => {
  leaderboardModal.style.display = 'none';
});

leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) leaderboardModal.style.display = 'none';
});

/* ========================================= */
/* MODAL — SETTINGS                          */
/* Contains: Audio, Privacy, Delete, Credits */
/* Accessible from main menu and pause menu. */
/* ========================================= */

document.getElementById('settings-btn').addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

document.getElementById('settings-btn-pause').addEventListener('click', () => {
  settingsModal.style.display = 'flex';
});

settingsCloseBtn.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.style.display = 'none';
});

/* ========================================= */
/* MODAL — PRIVACY POLICY                    */
/* Opens from: Settings button.              */
/* Has higher z-index so it can appear       */
/* on top of settings modal.                 */
/* ========================================= */

privacyBtn.addEventListener('click', () => {
  privacyModal.style.display = 'flex';
});

privacyCloseBtn.addEventListener('click', () => {
  privacyModal.style.display = 'none';
});

privacyModal.addEventListener('click', (e) => {
  if (e.target === privacyModal) privacyModal.style.display = 'none';
});

/* ========================================= */
/* MODAL — DELETE DATA (GDPR)                */
/* Deletes user's leaderboard entry and      */
/* local storage data by device ID.          */
/* Opens from: Settings button.              */
/* ========================================= */

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

/**
 * Shows a colored result message inside the delete modal.
 * @param {string} message - Text to display
 * @param {string} type - CSS class: 'success', 'warning', or 'error'
 */
function showDeleteResult(message, type) {
  deleteResult.textContent = message;
  deleteResult.className = type;
  deleteResult.style.display = 'block';
}

/**
 * Handles the "Delete my data" button click.
 * Asks for confirmation, then deletes all records
 * linked to this device from Supabase + localStorage.
 */
deleteByDeviceBtn.addEventListener('click', async () => {
  const confirmed = confirm(
    'This will permanently delete all your scores linked to this device. Continue?'
  );
  if (!confirmed) return;

  deleteByDeviceBtn.disabled = true;
  deleteByDeviceBtn.textContent = '⏳ Deleting...';

  const result = await deleteByDeviceId();

  if (result.success && result.count > 0) {
    showDeleteResult(
      `✅ Deleted ${result.count} record(s). Local data cleared.`, 'success'
    );
    gameState.highScore = 0;
    gameState.score = 0; 
    updateUI();
  } else if (result.success && result.count === 0) {
    showDeleteResult('⚠️ No records found for this device.', 'warning');
  } else {
    showDeleteResult(
      '❌ Something went wrong. Please contact us by email.', 'error'
    );
  }

  setTimeout(() => {
    deleteByDeviceBtn.disabled = false;
    deleteByDeviceBtn.textContent = 'Delete my data';
  }, 2000);
});

/* ========================================= */
/* GDPR CONSENT                              */
/* Shows banner before first score save.     */
/* Player must accept to store data.         */
/* Declining allows playing without saving.  */
/* ========================================= */

/**
 * Shows GDPR consent banner if user hasn't agreed yet.
 * @returns {boolean} true if consent already given
 */
function showGdprIfNeeded() {
  if (!hasConsent()) {
    gdprBanner.style.display = 'block';
    return false;
  }
  return true;
}

gdprAccept.addEventListener('click', () => {
  setConsent(true);
  gdprBanner.style.display = 'none';
});

gdprDecline.addEventListener('click', () => {
  setConsent(false);
  gdprBanner.style.display = 'none';
});

/* ========================================= */
/* LEADERBOARD — SCORE SUBMISSION            */
/* Handles nickname input, GDPR check,       */
/* Telegram auto-fill, and score saving.     */
/* ========================================= */

/**
 * Telegram auto-fill:
 * If running inside Telegram WebApp, pre-fill the nickname
 * from the user's profile and lock the input field.
 * Priority: first_name → @username → empty (manual input).
 */
if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
  const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
  const tgName = tgUser.first_name || tgUser.username || '';

  if (usernameInput && tgName) {
    usernameInput.value = tgName;
    usernameInput.readOnly = true;
    usernameInput.style.opacity = '0.7';
    usernameInput.style.cursor = 'default';
  } else if (usernameInput) {
    usernameInput.placeholder = 'Enter your nickname';
  }
}

/**
 * Save Score button handler.
 * Flow:
 *   1. Check GDPR consent (show banner if missing)
 *   2. Validate nickname (must not be empty)
 *   3. Check username availability
 *   4. Submit score via upsert (updates if better)
 *   5. Refresh leaderboard and show feedback
 */
submitBtn?.addEventListener('click', async () => {

  /* Step 1: Check GDPR consent */
  if (!hasConsent()) {
    showGdprIfNeeded();
    return;
  }

  /* Step 2: Validate nickname */
  const username = usernameInput?.value.trim();

  if (!username) {
    usernameInput.style.borderColor = '#ff4444';
    usernameInput.placeholder = '⚠️ Enter a nickname!';
    setTimeout(() => {
      usernameInput.style.borderColor = '#c2b280';
      usernameInput.placeholder = 'Enter your nickname';
    }, 2000);
    return;
  }

  /* Step 3: Check username availability */
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

  /* Step 4: Submit score (upsert — updates if better) */
  const result = await submitScore(username, gameState.score, gameState.playtime);
  await loadGameOverLeaderboard();

  /* Step 5: Show result feedback */
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

/* ========================================= */
/* KEYBOARD — ESCAPE KEY (close modals)      */
/* Closes the topmost visible modal.         */
/* Priority order (highest z-index first):   */
/*   privacy > delete > settings >           */
/*   rules > leaderboard                     */
/* ========================================= */

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (privacyModal.style.display === 'flex') {
      privacyModal.style.display = 'none';
    } else if (deleteModal.style.display === 'flex') {
      deleteModal.style.display = 'none';
    } else if (settingsModal.style.display === 'flex') {
      settingsModal.style.display = 'none';
    } else if (rulesModal.style.display === 'flex') {
      rulesModal.style.display = 'none';
    } else if (leaderboardModal.style.display === 'flex') {
      leaderboardModal.style.display = 'none';
    }
  }
});

/* ========================================= */
/* INITIALIZATION                            */
/* Runs once on page load.                   */
/* Sets up health bar segments, input        */
/* handlers, canvas size, and UI state.      */
/* ========================================= */

window.addEventListener('resize', () => {
  resizeCanvas();
  loadMiniLeaderboard();
});

initHealthBar();
setupInput();
resizeCanvas();
updateUI();