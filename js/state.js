/* ========================================= */
/* GAME STATE                                */
/* Central state object for the entire game. */
/* All modules read/write from this object.  */
/*                                           */
/* Using a shared mutable object instead of  */
/* primitive exports ensures all modules     */
/* see the same up-to-date values.           */
/* ========================================= */

import { CONFIG } from './config.js';

/* ========================================= */
/* VIEWPORT (logical playfield size)         */
/* CSS-pixel size of the canvas, updated by  */
/* resizeCanvas(). Game logic (spawns,       */
/* clamps, off-screen checks) uses this, NOT */
/* canvas.width/height: since the high-DPI   */
/* fix the canvas buffer is scaled by        */
/* devicePixelRatio and no longer matches    */
/* logical coordinates.                      */
/* ========================================= */

export const viewport = { width: 0, height: 0 };

/* ========================================= */
/* STATE OBJECT                              */
/* ========================================= */

export const gameState = {

  /* --- Player character --- */
  chicken: {
    x: 0,                           // Horizontal position (set on reset)
    y: 0,                           // Vertical position (set on reset)
    width: CONFIG.CHICKEN.width,     // Hitbox width (130px)
    height: CONFIG.CHICKEN.height,   // Hitbox height (130px)
    speed: CONFIG.CHICKEN.speed,     // Current movement speed (affected by corn boost)
    dx: 0                           // Horizontal velocity (-speed, 0, or +speed)
  },

  /* --- Entity arrays --- */
  eggs: [],                          // Active egg projectiles
  enemies: [],                       // Active falling enemies
  corns: [],                         // Active corn power-ups
  wheats: [],                        // Active wheat power-ups
  peppers: [],                       // Active pepper power-ups

  /* --- Boss --- */
  boss: null,                        // Boss object or null if no boss active

  /* --- Scoring --- */
  score: 0,                          // Current game score
  highScore: parseInt(localStorage.getItem('highScore')) || 0,  // Best score (persisted)

  /* --- Player stats --- */
  health: CONFIG.GAME.maxHealth,     // Current HP (max 10)
  eggDamage: 1,                      // Damage per egg (+1 per corn collected)
  speedLevel: 0,                     // Permanent chicken speed level (derived: min(cap, triangularLevel(peppersCollected)))
  peppersCollected: 0,               // Total peppers collected (drives the triangular speed curve)
  missedEnemies: 0,                  // Count of enemies that passed the screen

  /* --- Game flow --- */
  gameOver: false,                   // True when game has ended
  gameOverReason: '',                // Text shown on game over screen
  paused: false,                     // True when game is paused

  /* --- Boss tracking --- */
  bossSpawned: false,                // True after boss has been created (prevents re-spawn)

  /* --- Endless waves --- */
  wave: 1,                           // Current wave number (bosses killed + 1)
  nextBossScore: CONFIG.GAME.scoreBeforeBoss,  // Boss spawns when score reaches this
  cycleStartScore: 0,                // Score at the start of the current cycle (phase progress base)
  bannerUntil: 0,                    // performance.now() until which the "Wave N" banner shows

  /* --- Speed boost (from corn) --- */
  speedBoostActive: false,           // True while boost is active
  speedBoostEndTime: 0,              // Timestamp when boost expires

  /* --- Cooldowns and spawn timers --- */
  lastShotTime: 0,                   // Timestamp of last egg shot (for cooldown)
  lastSpawnTime: 0,                  // Timestamp of last enemy spawn
  lastItemSpawnTime: 0,              // Timestamp of last power-up spawn (shared spawner)
  nextItemInterval: 0,               // Random delay until next power-up spawn (ms)

  /* --- Session timing (for leaderboard) --- */
  startTime: 0,                      // Timestamp when game started
  playtime: 0                        // Total play time in seconds (calculated on game over)
};

/* ========================================= */
/* DERIVED VALUES                            */
/* ========================================= */

/**
 * Current permanent (non-boosted) chicken speed:
 * base speed plus pepper progression levels.
 */
export function chickenPermSpeed() {
  return CONFIG.CHICKEN.speed + gameState.speedLevel * CONFIG.CHICKEN.speedIncrease;
}

/**
 * Boss killed: advance to the next wave. The +500 boss bonus is already
 * in gameState.score, so basing nextBossScore on the current score keeps
 * every cycle exactly CYCLE.length points of real play (score % length
 * would let the bonus eat 500 points of next-cycle progress).
 * Killing the boss also lets the hens rebuild part of the coop:
 * the missed-enemy budget gets missRepair back (never below 0 missed).
 */
export function startNextWave(now) {
  gameState.wave++;
  gameState.nextBossScore = gameState.score + CONFIG.CYCLE.length;
  gameState.cycleStartScore = gameState.score;
  gameState.bossSpawned = false;
  gameState.missedEnemies = Math.max(0, gameState.missedEnemies - CONFIG.CYCLE.missRepair);
  gameState.bannerUntil = now + CONFIG.CYCLE.bannerDuration;
}

/* ========================================= */
/* STATE RESET                               */
/* Called when starting a new game.          */
/* Resets all values to defaults.            */
/*                                           */
/* Note: highScore is NOT reset here —       */
/* it persists across sessions.              */
/*                                           */
/* Chicken position is centered at the       */
/* bottom of the canvas with a small margin. */
/*                                           */
/* The item spawn timer uses                 */
/* performance.now() as base, and a random   */
/* interval to prevent predictable spawns.   */
/* ========================================= */

export function resetGameState(canvas) {
  Object.assign(gameState, {

    /* --- Reset chicken to center-bottom --- */
    chicken: {
      ...gameState.chicken,
      x: viewport.width / 2 - CONFIG.CHICKEN.width / 2,
      y: viewport.height - CONFIG.CHICKEN.height - 20,
      speed: CONFIG.CHICKEN.speed,
      dx: 0
    },

    /* --- Clear all entity arrays --- */
    eggs: [],
    enemies: [],
    corns: [],
    wheats: [],
    peppers: [],

    /* --- Reset boss --- */
    boss: null,

    /* --- Reset scoring (highScore preserved) --- */
    score: 0,

    /* --- Reset player stats --- */
    health: CONFIG.GAME.maxHealth,
    eggDamage: 1,
    speedLevel: 0,
    peppersCollected: 0,
    missedEnemies: 0,

    /* --- Reset game flow --- */
    gameOver: false,
    gameOverReason: '',
    paused: false,

    /* --- Reset boss tracking --- */
    bossSpawned: false,

    /* --- Reset endless waves --- */
    wave: 1,
    nextBossScore: CONFIG.GAME.scoreBeforeBoss,
    cycleStartScore: 0,
    bannerUntil: 0,

    /* --- Reset speed boost --- */
    speedBoostActive: false,
    speedBoostEndTime: 0,

    /* --- Reset timers --- */
    lastShotTime: 0,
    lastSpawnTime: 0,
    lastItemSpawnTime: performance.now(),

    /* --- Randomize first item spawn interval --- */
    nextItemInterval: Math.floor(
      Math.random() * (CONFIG.ITEM_SPAWN.maxInterval - CONFIG.ITEM_SPAWN.minInterval + 1)
    ) + CONFIG.ITEM_SPAWN.minInterval,

    /* --- Reset session timing --- */
    startTime: 0,
    playtime: 0
  });
}