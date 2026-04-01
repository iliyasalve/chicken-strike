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

  /* --- Boss --- */
  boss: null,                        // Boss object or null if no boss active

  /* --- Scoring --- */
  score: 0,                          // Current game score
  highScore: parseInt(localStorage.getItem('highScore')) || 0,  // Best score (persisted)

  /* --- Player stats --- */
  health: CONFIG.GAME.maxHealth,     // Current HP (max 10)
  eggDamage: 1,                      // Damage per egg (increased by corn)
  missedEnemies: 0,                  // Count of enemies that passed the screen

  /* --- Game flow --- */
  gameOver: false,                   // True when game has ended
  gameOverReason: '',                // Text shown on game over screen
  isVictory: false,                  // True if game ended by defeating boss
  paused: false,                     // True when game is paused

  /* --- Boss tracking --- */
  bossSpawned: false,                // True after boss has been created (prevents re-spawn)

  /* --- Speed boost (from corn) --- */
  speedBoostActive: false,           // True while boost is active
  speedBoostEndTime: 0,              // Timestamp when boost expires

  /* --- Cooldowns and spawn timers --- */
  lastShotTime: 0,                   // Timestamp of last egg shot (for cooldown)
  lastSpawnTime: 0,                  // Timestamp of last enemy spawn
  lastCornSpawnTime: 0,              // Timestamp of last corn spawn
  lastWheatSpawnTime: 0,             // Timestamp of last wheat spawn
  nextCornInterval: 0,               // Random delay until next corn spawn (ms)
  nextWheatInterval: 0,              // Random delay until next wheat spawn (ms)

  /* --- Session timing (for leaderboard) --- */
  startTime: 0,                      // Timestamp when game started
  playtime: 0                        // Total play time in seconds (calculated on game over)
};

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
/* Corn/wheat spawn timers use               */
/* performance.now() as base, and random     */
/* intervals to prevent predictable spawns.  */
/* ========================================= */

export function resetGameState(canvas) {
  Object.assign(gameState, {

    /* --- Reset chicken to center-bottom --- */
    chicken: {
      ...gameState.chicken,
      x: canvas.width / 2 - CONFIG.CHICKEN.width / 2,
      y: canvas.height - CONFIG.CHICKEN.height - 20,
      speed: CONFIG.CHICKEN.speed,
      dx: 0
    },

    /* --- Clear all entity arrays --- */
    eggs: [],
    enemies: [],
    corns: [],
    wheats: [],

    /* --- Reset boss --- */
    boss: null,

    /* --- Reset scoring (highScore preserved) --- */
    score: 0,

    /* --- Reset player stats --- */
    health: CONFIG.GAME.maxHealth,
    eggDamage: 1,
    missedEnemies: 0,

    /* --- Reset game flow --- */
    gameOver: false,
    gameOverReason: '',
    isVictory: false,
    paused: false,

    /* --- Reset boss tracking --- */
    bossSpawned: false,

    /* --- Reset speed boost --- */
    speedBoostActive: false,
    speedBoostEndTime: 0,

    /* --- Reset timers --- */
    lastShotTime: 0,
    lastSpawnTime: 0,
    lastCornSpawnTime: performance.now(),
    lastWheatSpawnTime: performance.now(),

    /* --- Randomize first spawn intervals --- */
    nextCornInterval: Math.floor(
      Math.random() * (CONFIG.CORN.maxInterval - CONFIG.CORN.minInterval + 1)
    ) + CONFIG.CORN.minInterval,
    nextWheatInterval: Math.floor(
      Math.random() * (CONFIG.WHEAT.maxInterval - CONFIG.WHEAT.minInterval + 1)
    ) + CONFIG.WHEAT.minInterval,

    /* --- Reset session timing --- */
    startTime: 0,
    playtime: 0
  });
}