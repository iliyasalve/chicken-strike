/* ========================================= */
/* IMPORTS                                   */
/* ========================================= */

import { CONFIG } from './config.js';
import { gameState, resetGameState, viewport } from './state.js';
import {
  resizeCanvas, updateUI, setGrassState, initHealthBar,
  hideStartMenu, showStartMenu, hideGameOver, hidePause,
  showGameOver, playMusic, pauseMusic, resetMusic,
  persistHighScore
} from './ui.js';
import { setupInput } from './input.js';
import {
  updateChicken, updateEggs, updateEnemies, updateBoss, updateItems,
  drawChicken, drawEggs, drawEnemies, drawBoss, drawItems,
  spawnEnemy, spawnCorn, spawnWheat, spawnPepper
} from './entities.js';
import { handleCollisions } from './collision.js';
import {
  submitScore, getLeaderboard, getFullLeaderboard,
  getLeaderboardLimit, formatDate, formatPlaytime,
  deleteByDeviceId, hasConsent, setConsent, isUsernameTaken, getUserId,
  startGameSession
} from './leaderboard.js';
import { soundState, gameOverSound, unlockAudio } from '../js/music.js';

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

/* --- Delta time tracking --- */
/* Timestamp of the previous frame. 0 means "no previous frame"
   (fresh loop start), in which case one 60fps frame is assumed. */
let lastFrameTime = 0;

// Longest frame gap we compensate for (ms). Caps dt after lag spikes
// or tab switches so entities don't teleport across the screen.
const MAX_FRAME_DELTA = 50;

// Reference frame duration at 60fps (ms). All speeds in CONFIG are
// tuned as "pixels per frame at 60fps"; dtFactor scales them so the
// game runs at the same real-time speed on 30/120/144Hz displays.
const BASE_FRAME_TIME = 1000 / 60;

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
  lastFrameTime = 0; // Next loop start gets a clean dt
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
    persistHighScore();
    showGameOver(gameState.gameOverReason || 'Game Over!');
    showGameOverStats();

    if (!soundState.gameOverSoundPlayed && !soundState.sfxMuted) {
      gameOverSound.play();
      soundState.gameOverSoundPlayed = true;
    }

    loadGameOverLeaderboard();
    animationFrameId = null;
    return;
  }

  /* --- Pause: loop stays alive but skips updates/draws --- */
  if (gameState.paused) {
    // Freeze game time: shift every timestamp anchor forward by the
    // paused frame delta. Otherwise spawn timers keep "running" during
    // the pause and enemies/items spawn in a burst on resume, the shot
    // cooldown pre-charges, and the pepper speed boost burns out.
    const pausedDelta = timestamp - (lastFrameTime || timestamp);
    gameState.lastSpawnTime += pausedDelta;
    gameState.lastItemSpawnTime += pausedDelta;
    gameState.lastShotTime += pausedDelta;
    if (gameState.speedBoostActive) {
      gameState.speedBoostEndTime += pausedDelta;
    }

    // Keep the frame clock current so unpausing doesn't produce
    // a huge dt (entities would jump on resume otherwise)
    lastFrameTime = timestamp;
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  /* --- Delta time --- */
  // dtFactor = 1 at exactly 60fps, ~0.5 at 120Hz, ~2 at 30Hz.
  // First frame after loop start assumes one 60fps frame.
  const delta = lastFrameTime ? Math.min(timestamp - lastFrameTime, MAX_FRAME_DELTA) : BASE_FRAME_TIME;
  const dtFactor = delta / BASE_FRAME_TIME;
  lastFrameTime = timestamp;

  /* --- Clear canvas --- */
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  /* --- Update all entities --- */
  updateChicken(canvas, dtFactor);
  updateEggs(dtFactor);
  updateEnemies(canvas, dtFactor);
  updateBoss(canvas, dtFactor);
  updateItems(canvas, dtFactor);
  handleCollisions();

  /* --- Draw all entities --- */
  drawChicken(ctx);
  drawEggs(ctx);
  drawEnemies(ctx);
  drawBoss(ctx);
  drawItems(ctx);

  /* --- Spawn enemies at interval --- */
  // Interval shrinks with score: faster enemies leave the screen sooner,
  // so without this the on-screen density (and perceived difficulty) drops.
  const spawnInterval = Math.max(
    CONFIG.SPAWN.minInterval,
    CONFIG.SPAWN.baseInterval - gameState.score * CONFIG.SPAWN.intervalReduction
  );
  if (timestamp - gameState.lastSpawnTime > spawnInterval) {
    spawnEnemy(canvas);
    gameState.lastSpawnTime = timestamp;
  }

  /* --- Spawn ONE power-up (corn/pepper/wheat) at random interval --- */
  /* Shared spawner: weighted random pick, so bonuses never flood the
     screen and the next drop can't be predicted. */
  if (timestamp - gameState.lastItemSpawnTime > gameState.nextItemInterval) {
    spawnRandomItem();
    gameState.lastItemSpawnTime = timestamp;
    gameState.nextItemInterval = Math.floor(
      Math.random() * (CONFIG.ITEM_SPAWN.maxInterval - CONFIG.ITEM_SPAWN.minInterval + 1)
    ) + CONFIG.ITEM_SPAWN.minInterval;
  }

  animationFrameId = requestAnimationFrame(gameLoop);
}

/* ========================================= */
/* ITEM SPAWNER                              */
/* Picks one power-up type by weight and     */
/* spawns it. Weights in CONFIG.ITEM_SPAWN.  */
/* ========================================= */

function spawnRandomItem() {
  const weights = CONFIG.ITEM_SPAWN.weights;
  const total = weights.corn + weights.pepper + weights.wheat;
  const roll = Math.random() * total;

  if (roll < weights.corn) {
    spawnCorn(canvas);
  } else if (roll < weights.corn + weights.pepper) {
    spawnPepper(canvas);
  } else {
    spawnWheat(canvas);
  }
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
 * Escapes HTML-special characters to prevent stored XSS.
 * Usernames come from the database (user-controlled) and are
 * injected into innerHTML templates below. Without escaping,
 * a name like `<img src=x onerror=...>` would execute for
 * everyone who views the leaderboard.
 * @param {*} value - Raw value (coerced to string)
 * @returns {string} Safe-to-inject string
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

/**
 * Loads top 3 players into the game over screen table.
 */
async function loadGameOverLeaderboard() {
  const data = await getLeaderboard(3);
  const tbody = document.getElementById('leaderboard-list');
  if (!tbody) return;

  // null = fetch failed: say so instead of rendering an empty table
  if (data === null) {
    tbody.innerHTML = '<tr><td colspan="4">⚠️ Leaderboard unavailable</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((entry, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(entry.username)}</td>
      <td>${escapeHtml(entry.score)}</td>
      <td>${escapeHtml(formatPlaytime(entry.playtime))}</td>
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

  // null = fetch failed: sidebar is decorative, a short note is enough
  if (data === null) {
    list.innerHTML = '<li><span class="mini-lb-name">⚠️ Unavailable</span></li>';
    return;
  }

  list.innerHTML = data.map(entry => `
    <li>
      <span class="mini-lb-name">${escapeHtml(entry.username)}</span>
      <span class="mini-lb-score">${escapeHtml(entry.score)}</span>
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
  const retryBtn = document.getElementById('leaderboard-retry-btn');

  // null = fetch failed: distinct message + a retry button
  // (empty list gets the friendly "be the first" text instead)
  if (data === null) {
    emptyMsg.textContent = '⚠️ Could not load the leaderboard. Check your connection.';
    emptyMsg.style.display = 'block';
    retryBtn.style.display = 'inline-block';
    tableWrapper.style.display = 'none';
    return;
  }
  retryBtn.style.display = 'none';

  if (!data.length) {
    emptyMsg.textContent = 'No scores yet. Be the first! 🐔';
    emptyMsg.style.display = 'block';
    tableWrapper.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  tableWrapper.style.display = 'block';

  tbody.innerHTML = data.map((entry, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(entry.username)}</td>
      <td>${escapeHtml(entry.score)}</td>
      <td>${escapeHtml(formatPlaytime(entry.playtime))}</td>
      <td>${escapeHtml(formatDate(entry.created_at))}</td>
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
  // Resume the suspended AudioContext inside the click gesture —
  // instant, unlike the old per-element audio warmup (PERF-4)
  unlockAudio();
  // Begin a verified anti-cheat session (server-timestamped token).
  // Fire-and-forget: the token arrives long before the game ends.
  startGameSession();
  soundState.gameOverSoundPlayed = false;
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
  persistHighScore(); // Run may end mid-game here; don't lose a new record
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

document.getElementById('leaderboard-retry-btn').addEventListener('click', loadModalLeaderboard);

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

let resizeLbTimer = null;

window.addEventListener('resize', () => {
  resizeCanvas();
  // Re-anchor the chicken to the bottom and clamp into the new width,
  // otherwise a resize/rotation leaves it floating or off-screen.
  gameState.chicken.y = viewport.height - gameState.chicken.height - 20;
  gameState.chicken.x = Math.max(
    0, Math.min(viewport.width - gameState.chicken.width, gameState.chicken.x)
  );
  // Debounce the leaderboard refresh so dragging a window edge doesn't
  // fire a Supabase request on every resize event.
  clearTimeout(resizeLbTimer);
  resizeLbTimer = setTimeout(loadMiniLeaderboard, 200);
});

initHealthBar();
setupInput();
resizeCanvas();
updateUI();