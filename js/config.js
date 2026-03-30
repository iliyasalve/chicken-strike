export const CONFIG = {
    DEBUG_HITBOXES: false,  // ← переключатель
  CHICKEN: { width: 130, height: 130, speed: 5 },
  EGG: { radius: 20, speed: 5, cooldown: 300 },
  ENEMY: { size: 40, baseSpeed: 2, emojis: ['🦊', '🐺', '🐶', '😼'] },
  BOSS: { size: 100, health: 100, speed: 1, emoji: '👹' },
  CORN: { size: 40, speed: 2, minInterval: 10000, maxInterval: 20000 },
  WHEAT: { size: 40, speed: 2, minInterval: 10000, maxInterval: 20000 },
  SPAWN: { baseInterval: 1500, minInterval: 500, edgeMargin: 50 },
  GAME: { maxMissedEnemies: 10, maxHealth: 10, scoreBeforeBoss: 1200 },
  BOOST: { duration: 5000, speedMultiplier: 2, damageIncrease: 1 }
};