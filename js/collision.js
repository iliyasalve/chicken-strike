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
import { gameState, chickenPermSpeed, startNextWave } from './state.js';
import { updateUI, setGrassState } from './ui.js';
import { removeAt, releaseEgg, releaseEnemy, releaseItem } from './entities.js';
import { resetGrid, insertGrid, queryGrid } from './spatial.js';
import { isColliding } from './geometry.js';
import { triangularLevel } from './progression.js';
import { soundState, splatSound, damageSound, chickenEatSound, victorySound } from '../js/music.js';

/* Reused query output (SCALE-3: no per-frame allocation) */
const candidates = [];

/* ========================================= */
/* MAIN COLLISION HANDLER                    */
/* Called once per frame from gameLoop.       */
/* Hits mark entities with a `dead` flag;    */
/* one backward sweep at the end compacts    */
/* the arrays in place and releases dead     */
/* entities to the pools (SCALE-3 — no Set/  */
/* array allocation per frame).              */
/* ========================================= */

export function handleCollisions() {

  /* --- Broad phase: enemies into the grid once per frame (SCALE-4) --- */
  resetGrid();
  for (const enemy of gameState.enemies) insertGrid(enemy);

  /* ----------------------------------------- */
  /* EGGS vs ENEMIES                           */
  /* Each egg deals eggDamage to enemy.         */
  /* Enemy dies when hits >= maxHits.            */
  /* Score +10 per enemy killed.                */
  /* Grid narrows each egg to enemies sharing  */
  /* a cell; exact check stays isColliding.    */
  /* ----------------------------------------- */

  for (const egg of gameState.eggs) {
    if (egg.dead) continue;

    for (const enemy of queryGrid(egg, candidates)) {
      if (enemy.dead) continue;

      if (isColliding(egg, enemy)) {
        enemy.hits += gameState.eggDamage;

        // Hit feedback: drawEnemies renders a short flash (no HP bars,
        // the flash only confirms the hit landed)
        enemy.hitFlashUntil = performance.now() + 120;

        if (!soundState.sfxMuted) {
          splatSound.play();
        }

        // Egg is always consumed on hit
        egg.dead = true;

        // Check if enemy is dead
        if (enemy.hits >= enemy.maxHits) {
          enemy.dead = true;
          gameState.score += 10;
        }

        break; // egg consumed, stop scanning candidates
      }
    }
  }

  /* ----------------------------------------- */
  /* CHICKEN vs ENEMIES                        */
  /* Direct contact deals 1 HP damage.          */
  /* Game over if health reaches 0.             */
  /* Enemies killed by an egg this frame are   */
  /* skipped (dead flag), as before.           */
  /* ----------------------------------------- */

  for (const enemy of queryGrid(gameState.chicken, candidates)) {
    if (enemy.dead) continue;

    if (isColliding(gameState.chicken, enemy)) {
      enemy.dead = true;
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
  }

  /* ----------------------------------------- */
  /* CHICKEN vs CORN (power-up)                */
  /* Each corn permanently adds +1 egg damage.  */
  /* The shared item spawner already limits     */
  /* corn to roughly one per ~25s, so damage    */
  /* stays moderate (boss takes 15-20 hits).    */
  /* Speed boost belongs to the pepper item.    */
  /* ----------------------------------------- */

  for (let i = gameState.corns.length - 1; i >= 0; i--) {
    if (isColliding(gameState.chicken, gameState.corns[i])) {
      gameState.eggDamage += CONFIG.BOOST.damageIncrease;

      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }

      removeAt(gameState.corns, i, releaseItem);
    }
  }

  /* ----------------------------------------- */
  /* CHICKEN vs WHEAT (healing)                */
  /* Restores 1 HP, capped at maxHealth.        */
  /* ----------------------------------------- */

  for (let i = gameState.wheats.length - 1; i >= 0; i--) {
    if (isColliding(gameState.chicken, gameState.wheats[i])) {
      if (gameState.health < CONFIG.GAME.maxHealth) {
        gameState.health++;
      }

      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }

      removeAt(gameState.wheats, i, releaseItem);
    }
  }

  /* ----------------------------------------- */
  /* CHICKEN vs PEPPER (power-up)              */
  /* Activates temporary speed boost (every     */
  /* pickup) and progresses permanent chicken   */
  /* speed on a triangular curve (1, 2, 3, ...  */
  /* peppers per +1), hard-capped at            */
  /* maxSpeedLevel so the chicken never         */
  /* outruns the game.                          */
  /* ----------------------------------------- */

  for (let i = gameState.peppers.length - 1; i >= 0; i--) {
    if (isColliding(gameState.chicken, gameState.peppers[i])) {
      // Triangular permanent speed progression (hard cap). speedLevel is
      // derived from the running total: level L costs L peppers, so the
      // Nth level unlocks at 1+2+...+N total (triangular numbers 1,3,6,...).
      gameState.peppersCollected++;
      gameState.speedLevel = Math.min(
        CONFIG.CHICKEN.maxSpeedLevel,
        triangularLevel(gameState.peppersCollected)
      );

      // Temporary boost on every pickup (applies on top of perm speed)
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = Date.now() + CONFIG.BOOST.duration;
      gameState.chicken.speed = chickenPermSpeed() * CONFIG.BOOST.speedMultiplier;

      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }

      removeAt(gameState.peppers, i, releaseItem);
    }
  }

  /* ----------------------------------------- */
  /* EGGS vs BOSS                              */
  /* Boss takes eggDamage per hit.              */
  /* Boss death = +500 score + next wave.       */
  /* Guard: if boss dies mid-loop from one egg, */
  /* remaining eggs skip via null check.        */
  /* ----------------------------------------- */

  if (gameState.boss) {
    for (const egg of gameState.eggs) {
      // Boss may have been killed by a previous egg in this same frame
      if (!gameState.boss) break;
      if (egg.dead) continue;

      if (isColliding(egg, gameState.boss)) {
        gameState.boss.health -= gameState.eggDamage;

        // Same hit flash as regular enemies (rendered by drawBoss)
        gameState.boss.hitFlashUntil = performance.now() + 120;

        if (!soundState.sfxMuted) {
          splatSound.play();
        }

        // Egg is always consumed on hit
        egg.dead = true;

        // Boss defeated: +500 and the game continues — next wave
        if (gameState.boss.health <= 0) {
          gameState.boss = null;
          gameState.score += 500;
          startNextWave(performance.now());
          if (!soundState.sfxMuted) {
            victorySound.play();
          }
        }
      }
    }

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

  /* --- Sweep: compact arrays in place, release dead to pools --- */
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    if (gameState.enemies[i].dead) {
      gameState.enemies[i].dead = false;
      removeAt(gameState.enemies, i, releaseEnemy);
    }
  }
  for (let i = gameState.eggs.length - 1; i >= 0; i--) {
    if (gameState.eggs[i].dead) {
      gameState.eggs[i].dead = false;
      removeAt(gameState.eggs, i, releaseEgg);
    }
  }

  /* --- Refresh HUD after all collision changes --- */
  updateUI();
}