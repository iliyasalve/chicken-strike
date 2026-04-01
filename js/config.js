/* ========================================= */
/* GAME CONFIGURATION                        */
/* All tunable constants in one place.       */
/* Changing values here affects the entire   */
/* game without touching other files.        */
/* ========================================= */

export const CONFIG = {

  /* --- Debug --- */
  DEBUG_HITBOXES: false,       // Toggle with H key. Shows colored hitbox rectangles around all entities.

  /* --- Player (Chicken) --- */
  CHICKEN: {
    width: 130,                // Hitbox width in pixels
    height: 130,               // Hitbox height in pixels
    speed: 5                   // Base horizontal movement speed (pixels per frame)
  },

  /* --- Projectile (Egg) --- */
  EGG: {
    radius: 20,                // Half-size of the egg hitbox (full size = radius * 2)
    speed: 5,                  // Upward movement speed (pixels per frame)
    cooldown: 300              // Minimum delay between shots (milliseconds)
  },

  /* --- Regular Enemies --- */
  ENEMY: {
    size: 40,                  // Hitbox width and height (square)
    baseSpeed: 2,              // Starting fall speed. Increases with score: baseSpeed + floor(score/200)
    emojis: ['🦊', '🐺', '🐶', '😼']  // Random emoji assigned to each enemy at spawn
  },

  /* --- Boss Enemy --- */
  BOSS: {
    size: 100,                 // Hitbox width and height (larger than regular enemies)
    health: 100,               // Total HP. Each egg deals eggDamage (starts at 1, increased by corn)
    speed: 1,                  // Fall speed (slower than regular enemies)
    emoji: '👹'               // Boss visual
  },

  /* --- Corn Power-up --- */
  CORN: {
    size: 40,                  // Hitbox width and height
    speed: 2,                  // Fall speed
    minInterval: 10000,        // Minimum delay between spawns (10 seconds)
    maxInterval: 20000         // Maximum delay between spawns (20 seconds)
  },

  /* --- Wheat Power-up --- */
  WHEAT: {
    size: 40,                  // Hitbox width and height
    speed: 2,                  // Fall speed
    minInterval: 10000,        // Minimum delay between spawns (10 seconds)
    maxInterval: 20000         // Maximum delay between spawns (20 seconds)
  },

  /* --- Enemy Spawning --- */
  SPAWN: {
    baseInterval: 1500,        // Delay between enemy spawns (milliseconds)
    minInterval: 500,          // Fastest possible spawn rate (not currently used, for dynamic scaling)
    edgeMargin: 50             // Minimum distance from screen edges for spawn position (pixels)
  },

  /* --- Game Rules --- */
  GAME: {
    maxMissedEnemies: 10,      // Game over if this many enemies pass the bottom
    maxHealth: 10,             // Maximum player HP (also determines health bar segments)
    scoreBeforeBoss: 1200      // Boss spawns when score reaches this value
  },

  /* --- Corn Boost Effects --- */
  BOOST: {
    duration: 5000,            // Speed boost duration (5 seconds)
    speedMultiplier: 2,        // Chicken speed multiplied by this during boost
    damageIncrease: 1          // Egg damage permanently increased by this per corn collected
  }
};