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
  /* Fixed per-type stats: difficulty grows through spawn composition
     (phases below), not through stat scaling. HP values are designed
     in "shots to kill at introduction" against the corn-driven egg
     damage curve (~2-3 dmg @300, 3-4 @600, 5 @900, 6-7 @1200), so a
     type naturally softens as the player's damage grows. */
  ENEMY: {
    size: 40,                  // Hitbox width and height (square)
    types: [
      { id: 'dog',  emoji: '🐶', speed: 2, hp: 1 },  // baseline
      { id: 'cat',  emoji: '😼', speed: 5, hp: 2 },  // fast, fragile
      { id: 'wolf', emoji: '🐺', speed: 2, hp: 10 }, // tank (~3 shots at intro)
      { id: 'fox',  emoji: '🦊', speed: 4, hp: 12 }  // elite: fast AND tanky
    ],
    /* Spawn phases: at each score threshold the weight table changes.
       Old types are never fully retired (a spawn slot spent on a dog
       is breathing room, not a difficulty leak). Weights tuned by
       simulation + playtest. */
    phases: [
      { fromScore: 0,   weights: { dog: 100, cat: 0,  wolf: 0,  fox: 0  } },
      { fromScore: 300, weights: { dog: 50,  cat: 50, wolf: 0,  fox: 0  } },
      { fromScore: 600, weights: { dog: 15,  cat: 50, wolf: 35, fox: 0  } },
      { fromScore: 900, weights: { dog: 12,  cat: 30, wolf: 28, fox: 30 } }
    ]
  },

  /* --- Boss Enemy --- */
  BOSS: {
    size: 100,                 // Hitbox width and height (larger than regular enemies)
    health: 100,               // Total HP. Each egg deals eggDamage (starts at 1, increased by corn)
    speed: 1,                  // Fall speed (slower than regular enemies)
    hSpeed: 2.5,               // Horizontal sweep speed (px/frame @60fps). Vertical speed stays 1, so fight duration is unchanged; the sweep only makes aiming and dodging harder
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
    scoreBeforeBoss: 1200,     // Boss spawns when score reaches this value
    grassBoostScore: 600       // Grass switches to fast scrolling at this score (was tied to global enemy speed > 4, which no longer exists)
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