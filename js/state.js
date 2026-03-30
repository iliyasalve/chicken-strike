import { CONFIG } from './config.js';

export const gameState = {
  chicken: {
    x: 0, y: 0,
    width: CONFIG.CHICKEN.width,
    height: CONFIG.CHICKEN.height,
    speed: CONFIG.CHICKEN.speed,
    dx: 0
  },
  eggs: [], enemies: [], corns: [], wheats: [],
  boss: null,
  score: 0,
  highScore: parseInt(localStorage.getItem('highScore')) || 0,
  health: CONFIG.GAME.maxHealth,
  eggDamage: 1,
  missedEnemies: 0,
  gameOver: false,
  gameOverReason: '',    // ← НОВОЕ
  isVictory: false,      // ← НОВОЕ
  paused: false,
  bossSpawned: false,
  speedBoostActive: false,
  speedBoostEndTime: 0,
  lastShotTime: 0,
  lastSpawnTime: 0,
  lastCornSpawnTime: 0,
  lastWheatSpawnTime: 0,
  nextCornInterval: 0,
  nextWheatInterval: 0,
  startTime: 0,
  playtime: 0
};

export function resetGameState(canvas) {
  Object.assign(gameState, {
    chicken: {
      ...gameState.chicken,
      x: canvas.width / 2 - CONFIG.CHICKEN.width / 2,
      y: canvas.height - CONFIG.CHICKEN.height - 20,
      speed: CONFIG.CHICKEN.speed,
      dx: 0
    },
    eggs: [], enemies: [], corns: [], wheats: [],
    boss: null,
    score: 0,
    health: CONFIG.GAME.maxHealth,
    eggDamage: 1,
    missedEnemies: 0,
    gameOver: false,
    gameOverReason: '',    // ← СБРОС
    isVictory: false,      // ← СБРОС
    paused: false,
    bossSpawned: false,
    speedBoostActive: false,
    speedBoostEndTime: 0,
    lastShotTime: 0,
    lastSpawnTime: 0,
    lastCornSpawnTime: performance.now(),
    lastWheatSpawnTime: performance.now(),
    nextCornInterval: Math.floor(Math.random() * (CONFIG.CORN.maxInterval - CONFIG.CORN.minInterval + 1)) + CONFIG.CORN.minInterval,
    nextWheatInterval: Math.floor(Math.random() * (CONFIG.WHEAT.maxInterval - CONFIG.WHEAT.minInterval + 1)) + CONFIG.WHEAT.minInterval,
    startTime: 0,
    playtime: 0
  });
}