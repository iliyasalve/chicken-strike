/* ========================================= */
/* COLLISION DETECTION & HANDLING             */
/* Checks all entity interactions per frame:  */
/*   - Eggs vs Enemies                        */
/*   - Chicken vs Enemies (damage)            */
/*   - Chicken vs Corn (speed + damage boost) */
/*   - Chicken vs Wheat (health restore)      */
/*   - Eggs vs Boss                           */
/*   - Chicken vs Boss (instant death)        */
/* ========================================= */

import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { updateUI, setGrassState } from './ui.js';
import { soundState, splatSound, damageSound, chickenEatSound } from '../js/music.js';

/* ========================================= */
/* AABB COLLISION CHECK                      */
/* Axis-Aligned Bounding Box test.           */
/* Returns true if two rectangles overlap.   */
/* Both objects must have: x, y, width, height */
/* ========================================= */

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/* ========================================= */
/* MAIN COLLISION HANDLER                    */
/* Called once per frame from gameLoop.       */
/* Uses Set-based removal to avoid index     */
/* shifting bugs when splicing arrays.       */
/* ========================================= */

export function handleCollisions() {

  /* --- Track which eggs and enemies to remove --- */
  /* Using Sets prevents duplicate removal and      */
  /* avoids index corruption from mid-loop splice   */
  const eggsToRemove = new Set();
  const enemiesToRemove = new Set();

  /* ----------------------------------------- */
  /* EGGS vs ENEMIES                           */
  /* Each egg deals eggDamage to enemy.         */
  /* Enemy dies when hits >= maxHits.            */
  /* Score +10 per enemy killed.                */
  /* ----------------------------------------- */

  gameState.enemies.forEach((enemy, eIdx) => {
    gameState.eggs.forEach((egg, eggIdx) => {
      // Skip already-marked objects
      if (eggsToRemove.has(eggIdx) || enemiesToRemove.has(eIdx)) return;

      if (isColliding(egg, enemy)) {
        enemy.hits += gameState.eggDamage;

        if (!soundState.sfxMuted) {
          splatSound.play();
        }

        // Egg is always consumed on hit
        eggsToRemove.add(eggIdx);

        // Check if enemy is dead
        if (enemy.hits >= enemy.maxHits) {
          enemiesToRemove.add(eIdx);
          gameState.score += 10;
        }
      }
    });

    /* ----------------------------------------- */
    /* CHICKEN vs ENEMIES                        */
    /* Direct contact deals 1 HP damage.          */
    /* Game over if health reaches 0.             */
    /* ----------------------------------------- */

    if (!enemiesToRemove.has(eIdx) && isColliding(gameState.chicken, enemy)) {
      enemiesToRemove.add(eIdx);
      gameState.health--;

      if (!soundState.sfxMuted) {
        damageSound.play();
      }

      if (gameState.health <= 0) {
        gameState.gameOver = true;
        gameState.gameOverReason = 'You were hit by an enemy!';
        setGrassState('static');
      }
    }
  });

  /* --- Safe removal: splice from end to start to preserve indices --- */
  [...enemiesToRemove].sort((a, b) => b - a).forEach(i => gameState.enemies.splice(i, 1));
  [...eggsToRemove].sort((a, b) => b - a).forEach(i => gameState.eggs.splice(i, 1));

  /* ----------------------------------------- */
  /* CHICKEN vs CORN (power-up)                */
  /* Activates temporary speed boost and        */
  /* permanently increases egg damage.          */
  /* ----------------------------------------- */

  gameState.corns = gameState.corns.filter(corn => {
    if (isColliding(gameState.chicken, corn)) {
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = Date.now() + CONFIG.BOOST.duration;
      gameState.chicken.speed = CONFIG.CHICKEN.speed * CONFIG.BOOST.speedMultiplier;
      gameState.eggDamage += CONFIG.BOOST.damageIncrease;

      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }

      return false; // Remove corn
    }
    return true; // Keep corn
  });

  /* ----------------------------------------- */
  /* CHICKEN vs WHEAT (healing)                */
  /* Restores 1 HP, capped at maxHealth.        */
  /* ----------------------------------------- */

  gameState.wheats = gameState.wheats.filter(wheat => {
    if (isColliding(gameState.chicken, wheat)) {
      if (gameState.health < CONFIG.GAME.maxHealth) {
        gameState.health++;
      }

      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }

      return false; // Remove wheat
    }
    return true; // Keep wheat
  });

  /* ----------------------------------------- */
  /* EGGS vs BOSS                              */
  /* Boss takes eggDamage per hit.              */
  /* Boss death = +500 score + victory screen.  */
  /* Guard: if boss dies mid-loop from one egg, */
  /* remaining eggs skip via null check.        */
  /* ----------------------------------------- */

  if (gameState.boss) {
    gameState.eggs = gameState.eggs.filter(egg => {
      // Boss may have been killed by a previous egg in this same frame
      if (!gameState.boss) return true;

      if (isColliding(egg, gameState.boss)) {
        gameState.boss.health -= gameState.eggDamage;

        if (!soundState.sfxMuted) {
          splatSound.play();
        }

        // Check if boss is defeated
        if (gameState.boss.health <= 0) {
          gameState.boss = null;
          gameState.score += 500;
          gameState.gameOver = true;
          gameState.gameOverReason = 'Victory! The Chicken defeated the boss!';
          gameState.isVictory = true;
          setGrassState('static');
        }

        return false; // Remove egg
      }
      return true; // Keep egg
    });

    /* ----------------------------------------- */
    /* CHICKEN vs BOSS (instant death)           */
    /* Direct contact with boss = 0 HP.           */
    /* ----------------------------------------- */

    if (gameState.boss && isColliding(gameState.chicken, gameState.boss)) {
      gameState.boss = null;
      gameState.health = 0;
      gameState.gameOver = true;
      gameState.gameOverReason = 'The Chicken was crushed by the boss!';
      setGrassState('static');
    }
  }

  /* --- Refresh HUD after all collision changes --- */
  updateUI();
}