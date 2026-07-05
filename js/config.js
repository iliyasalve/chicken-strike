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
    speed: 5,                  // Base horizontal movement speed (pixels per frame at 60fps, scaled by deltaTime)
    speedIncrease: 1,          // Permanent speed gained per pepper level-up (triangular progression)
    maxSpeedLevel: 3           // Permanent speed cap: base 5 -> 8 max (matches ENEMY.maxSpeed)
  },

  /* --- Projectile (Egg) --- */
  EGG: {
    radius: 20,                // Half-size of the egg hitbox (full size = radius * 2)
    speed: 5,                  // Upward movement speed (pixels per frame at 60fps, scaled by deltaTime)
    cooldown: 300              // Minimum delay between shots (milliseconds)
  },

  /* --- Regular Enemies --- */
  ENEMY: {
    size: 40,                  // Hitbox width and height (square)
    baseSpeed: 2,              // Starting fall speed. Increases with score: baseSpeed + floor(score/300)
    maxSpeed: 8,               // Fall speed cap. Without it enemies outrun the chicken (speed 5, 10 boosted) at high scores
    maxToughness: 6,           // Enemy HP cap (grows floor(score/100)+1). Keeps far enemies killable in 1-2 volleys late game
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
    speed: 2                   // Fall speed
  },

  /* --- Wheat Power-up --- */
  WHEAT: {
    size: 40,                  // Hitbox width and height
    speed: 2                   // Fall speed
  },

  /* --- Pepper Power-up --- */
  PEPPER: {
    size: 40,                  // Hitbox width and height
    speed: 2                   // Fall speed
  },

  /* --- Power-up Spawning --- */
  /* One shared spawner: every minInterval..maxInterval ms (random, so
     spawns can't be predicted) exactly ONE item drops, picked by weight.
     A single item at a time keeps pickups a meaningful choice instead
     of the screen filling with simultaneous bonuses. */
  ITEM_SPAWN: {
    minInterval: 8000,         // Minimum delay between item spawns (8 seconds)
    maxInterval: 14000,        // Maximum delay between item spawns (14 seconds)
    weights: {                 // Relative spawn chances (corn 60%, pepper 20%, wheat 20%)
      corn: 3,
      pepper: 1,
      wheat: 1
    }
  },

  /* --- Enemy Spawning --- */
  SPAWN: {
    baseInterval: 1500,        // Delay between enemy spawns at score 0 (milliseconds)
    minInterval: 500,          // Fastest possible spawn rate (reached at score 2000 with reduction 0.5)
    intervalReduction: 0.5,    // Ms shaved off the spawn interval per score point (keeps enemy density up as they get faster)
    edgeMargin: 50             // Minimum distance from screen edges for spawn position (pixels)
  },

  /* --- Game Rules --- */
  GAME: {
    maxMissedEnemies: 10,      // Game over if this many enemies pass the bottom
    maxHealth: 10,             // Maximum player HP (also determines health bar segments)
    scoreBeforeBoss: 1200      // Boss spawns when score reaches this value
  },

  /* --- Power-up Boost Effects --- */
  BOOST: {
    duration: 5000,            // Temporary speed boost duration (5 seconds), granted by pepper
    speedMultiplier: 2,        // Chicken speed multiplied by this during boost
    damageIncrease: 1          // Egg damage permanently gained per corn collected
    // Corn: flat +1 damage per pickup. The shared item spawner keeps
    // corn rare enough (~1 per 25s) that damage stays moderate.
    // Pepper: permanent +speedIncrease per level-up on a triangular
    // curve (1 -> 2 -> 3 peppers), hard-capped at maxSpeedLevel, plus
    // the temporary x2 boost on every pickup.
  }
};