/* ========================================= */
/* ENTITIES                                  */
/* Handles all game objects:                 */
/*   - Drawing (render to canvas)            */
/*   - Updating (movement, state changes)    */
/*   - Spawning (creating new instances)     */
/*                                           */
/* Entity types:                             */
/*   🐔 Chicken  — player character          */
/*   🥚 Eggs     — projectiles               */
/*   🦊 Enemies  — falling threats           */
/*   👹 Boss     — special enemy             */
/*   🌽 Corn     — speed + damage power-up   */
/*   🌾 Wheat    — health restore            */
/* ========================================= */

import { CONFIG } from './config.js';
import { gameState, chickenPermSpeed } from './state.js';
import { setGrassState } from './ui.js';

/* ========================================= */
/* ASSETS                                    */
/* ========================================= */

const chickenImg = new Image();
chickenImg.src = 'assets/images/kuritsa.png';

/* Emoji fonts, defined once. Assigning ctx.font forces the browser to
   parse the font string, so draw functions set it once per call
   instead of once per entity (PERF-1). */
const EMOJI_FONT_40 = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const EMOJI_FONT_80 = '80px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/* Rasterize every emoji glyph the game uses into an offscreen canvas
   at module load. The first fillText of a glyph triggers font loading/
   rasterization on the main thread — a one-off hitch that would
   otherwise land on the first shot, first enemy or first pickup
   (PERF-4). Runs while the player is still in the menu. */
{
  const off = document.createElement('canvas');
  off.width = 128;
  off.height = 128;
  const offCtx = off.getContext('2d');

  const glyphs = ['🥚', '🌽', '🌾', '🌶️', CONFIG.BOSS.emoji, ...CONFIG.ENEMY.emojis];
  offCtx.font = EMOJI_FONT_40;
  glyphs.forEach(g => offCtx.fillText(g, 0, 60));
  offCtx.font = EMOJI_FONT_80;
  offCtx.fillText(CONFIG.BOSS.emoji, 0, 100);
}

/* ========================================= */
/* DEBUG — HITBOX VISUALIZATION              */
/* Toggle via CONFIG.DEBUG_HITBOXES (Key H)  */
/* Draws colored rectangles around entities  */
/* and shows their dimensions.               */
/*                                           */
/* Colors:                                   */
/*   🔵 Blue      — Chicken                  */
/*   🟡 Yellow    — Eggs                     */
/*   🔴 Red       — Enemies                  */
/*   🟣 Purple    — Boss                     */
/*   🟢 Green     — Corn                     */
/*   🟤 Goldenrod — Wheat                    */
/* ========================================= */

function drawHitbox(ctx, obj, color = 'red') {
  if (!CONFIG.DEBUG_HITBOXES) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);

  // Show dimensions above hitbox. Draw functions set the emoji font
  // once per call, so restore it after the debug label.
  const prevFont = ctx.font;
  ctx.fillStyle = color;
  ctx.font = '10px monospace';
  ctx.fillText(`${obj.width}x${obj.height}`, obj.x, obj.y - 3);
  ctx.font = prevFont;
}

/* ========================================= */
/* DRAW FUNCTIONS                            */
/* Render each entity type to canvas.        */
/* Called every frame from gameLoop.          */
/* ========================================= */

/**
 * Draws the player chicken.
 * Flips image horizontally when moving right
 * to face the direction of movement.
 */
export function drawChicken(ctx) {
  if (gameState.chicken.dx > 0) {
    // Moving right: flip image horizontally
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(chickenImg,
      -gameState.chicken.x - gameState.chicken.width,
      gameState.chicken.y,
      gameState.chicken.width,
      gameState.chicken.height
    );
    ctx.restore();
  } else {
    // Moving left or standing: draw normally
    ctx.drawImage(chickenImg,
      gameState.chicken.x,
      gameState.chicken.y,
      gameState.chicken.width,
      gameState.chicken.height
    );
  }
  drawHitbox(ctx, gameState.chicken, 'blue');
}

/**
 * Draws all active egg projectiles.
 */
export function drawEggs(ctx) {
  if (gameState.eggs.length === 0) return;
  ctx.font = EMOJI_FONT_40;
  gameState.eggs.forEach(e => {
    ctx.fillText('🥚', e.x, e.y);
    drawHitbox(ctx, e, 'yellow');
  });
}

/**
 * Draws all active enemies.
 * Each enemy has a random emoji assigned at spawn.
 */
export function drawEnemies(ctx) {
  if (gameState.enemies.length === 0) return;
  ctx.font = EMOJI_FONT_40;
  ctx.textBaseline = 'top';
  gameState.enemies.forEach(e => {
    ctx.fillText(e.emoji, e.x, e.y);
    drawHitbox(ctx, e, 'red');
  });
}

/**
 * Draws the boss if it exists.
 * Boss uses a larger font size (80px) than regular enemies.
 */
export function drawBoss(ctx) {
  if (!gameState.boss) return;

  ctx.font = EMOJI_FONT_80;
  ctx.textBaseline = 'top';
  ctx.fillText(gameState.boss.emoji, gameState.boss.x, gameState.boss.y);
  drawHitbox(ctx, gameState.boss, 'purple');
}

/**
 * Draws all active power-up items (corn and wheat).
 */
export function drawItems(ctx) {
  if (gameState.corns.length === 0 && gameState.wheats.length === 0 && gameState.peppers.length === 0) return;
  ctx.font = EMOJI_FONT_40;

  gameState.corns.forEach(c => {
    ctx.fillText('🌽', c.x, c.y);
    drawHitbox(ctx, c, 'green');
  });

  gameState.wheats.forEach(w => {
    ctx.fillText('🌾', w.x, w.y);
    drawHitbox(ctx, w, 'goldenrod');
  });

  gameState.peppers.forEach(p => {
    ctx.fillText('🌶️', p.x, p.y);
    drawHitbox(ctx, p, 'orangered');
  });
}

/* ========================================= */
/* UPDATE FUNCTIONS                          */
/* Move entities, check boundaries,          */
/* handle state transitions.                 */
/* Called every frame from gameLoop.          */
/* ========================================= */

/**
 * Updates chicken position.
 * - Checks if speed boost has expired
 * - Recalculates dx based on current speed
 *   (fixes bug where picking up corn didn't
 *   feel instant while holding a direction)
 * - Clamps position to canvas boundaries
 */
export function updateChicken(canvas, dtFactor = 1) {
  // Check if speed boost timer has expired
  if (gameState.speedBoostActive && Date.now() > gameState.speedBoostEndTime) {
    gameState.speedBoostActive = false;
    gameState.chicken.speed = chickenPermSpeed();
  }

  // Recalculate dx with current speed while preserving direction.
  // Math.sign returns -1 (left), 0 (still), or 1 (right).
  // This ensures speed changes apply immediately, even if
  // the player is already holding a movement key.
  if (gameState.chicken.dx !== 0) {
    gameState.chicken.dx = Math.sign(gameState.chicken.dx) * gameState.chicken.speed;
  }

  // Apply movement (scaled by frame time) and clamp to canvas edges
  gameState.chicken.x += gameState.chicken.dx * dtFactor;
  gameState.chicken.x = Math.max(0, Math.min(canvas.width - gameState.chicken.width, gameState.chicken.x));
}

/**
 * Updates egg positions.
 * Eggs move upward. Removes eggs that go off-screen.
 */
export function updateEggs(dtFactor = 1) {
  gameState.eggs = gameState.eggs.filter(e => e.y > 0);
  gameState.eggs.forEach(e => e.y -= CONFIG.EGG.speed * dtFactor);
}

/**
 * Updates enemy positions.
 * - Speed increases with score (base + score/200)
 * - Switches grass animation speed based on enemy speed
 * - Counts missed enemies (passed bottom of screen)
 * - Triggers game over if too many enemies missed
 */
export function updateEnemies(canvas, dtFactor = 1) {
  // Speed grows with score but is capped so enemies stay dodgeable
  // (chicken starts at 5, pepper raises it to 8). Divisor 300 tuned
  // by playtest: /200 hit chicken-speed parity already at score 600.
  const speed = Math.min(
    CONFIG.ENEMY.baseSpeed + Math.floor(gameState.score / 300),
    CONFIG.ENEMY.maxSpeed
  );

  // Visual feedback: grass scrolls faster when enemies are fast
  if (speed > 4) {
    setGrassState('boost');
  } else {
    setGrassState('moving');
  }

  gameState.enemies = gameState.enemies.filter(e => {
    e.y += speed * dtFactor;

    // Enemy passed the bottom edge
    if (e.y > canvas.height) {
      gameState.missedEnemies++;

      if (gameState.missedEnemies >= CONFIG.GAME.maxMissedEnemies) {
        gameState.gameOver = true;
        gameState.gameOverReason = 'Too many enemies passed by!';
        setGrassState('static');
      }

      return false; // Remove enemy
    }
    return true; // Keep enemy
  });
}

/**
 * Updates boss position.
 * Boss moves downward slowly. If it reaches the bottom,
 * the player loses immediately (health set to 0).
 */
export function updateBoss(canvas, dtFactor = 1) {
  if (!gameState.boss) return;

  gameState.boss.y += gameState.boss.speed * dtFactor;

  // Boss escaped past the chicken
  if (gameState.boss.y > canvas.height) {
    gameState.boss = null;
    gameState.health = 0;
    gameState.gameOver = true;
    gameState.gameOverReason = 'The boss got past the Chicken!';
    setGrassState('static');
  }
}

/**
 * Updates power-up positions (corn and wheat).
 * Both fall downward at their configured speed.
 * Removes items that go off-screen (not collected).
 */
export function updateItems(canvas, dtFactor = 1) {
  gameState.corns = gameState.corns.filter(c => c.y < canvas.height);
  gameState.corns.forEach(c => c.y += CONFIG.CORN.speed * dtFactor);

  gameState.wheats = gameState.wheats.filter(w => w.y < canvas.height);
  gameState.wheats.forEach(w => w.y += CONFIG.WHEAT.speed * dtFactor);

  gameState.peppers = gameState.peppers.filter(p => p.y < canvas.height);
  gameState.peppers.forEach(p => p.y += CONFIG.PEPPER.speed * dtFactor);
}

/* ========================================= */
/* SPAWN FUNCTIONS                           */
/* Create new entities at random positions   */
/* above the visible screen (y = -size).     */
/* Edge margin prevents spawning too close   */
/* to screen edges.                          */
/* ========================================= */

/**
 * Spawns a regular enemy or triggers boss.
 *
 * Boss spawn conditions:
 *   - Score >= scoreBeforeBoss
 *   - No boss currently active
 *   - Boss not already spawned this round
 *
 * If boss is active or was spawned, no regular
 * enemies spawn until boss fight ends.
 *
 * Enemy toughness (maxHits) scales with score:
 *   maxHits = floor(score / 100) + 1
 */
export function spawnEnemy(canvas) {
  // Check if it's time to spawn the boss
  if (gameState.score >= CONFIG.GAME.scoreBeforeBoss && !gameState.boss && !gameState.bossSpawned) {
    gameState.boss = {
      x: Math.random() * (canvas.width - CONFIG.BOSS.size),
      y: -CONFIG.BOSS.size,
      width: CONFIG.BOSS.size,
      height: CONFIG.BOSS.size,
      health: CONFIG.BOSS.health,
      speed: CONFIG.BOSS.speed,
      emoji: CONFIG.BOSS.emoji
    };
    gameState.bossSpawned = true;
    return;
  }

  // Don't spawn regular enemies during boss fight
  if (gameState.boss || gameState.bossSpawned) return;

  // Pick random enemy emoji
  const emoji = CONFIG.ENEMY.emojis[Math.floor(Math.random() * CONFIG.ENEMY.emojis.length)];

  // Random x position within safe margins
  const x = Math.random() * (canvas.width - CONFIG.ENEMY.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;

  // Enemies get tougher as score increases, capped so kill time
  // stays bounded (egg damage grows much slower than score).
  // Divisor 150 tuned by playtest: /100 outpaced damage progression.
  const maxHits = Math.min(
    Math.floor(gameState.score / 150) + 1,
    CONFIG.ENEMY.maxToughness
  );

  gameState.enemies.push({
    x, y: -CONFIG.ENEMY.size,
    width: CONFIG.ENEMY.size, height: CONFIG.ENEMY.size,
    emoji, hits: 0, maxHits
  });
}

/**
 * Spawns a corn power-up.
 * Collecting it grants temporary speed boost
 * and permanently increases egg damage.
 */
export function spawnCorn(canvas) {
  const x = Math.random() * (canvas.width - CONFIG.CORN.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.corns.push({ x, y: -CONFIG.CORN.size, width: CONFIG.CORN.size, height: CONFIG.CORN.size });
}

/**
 * Spawns a wheat power-up.
 * Collecting it restores 1 health point
 * (capped at maxHealth).
 */
export function spawnWheat(canvas) {
  const x = Math.random() * (canvas.width - CONFIG.WHEAT.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.wheats.push({ x, y: -CONFIG.WHEAT.size, width: CONFIG.WHEAT.size, height: CONFIG.WHEAT.size });
}

/**
 * Spawns a pepper power-up.
 * Collecting it grants temporary speed boost
 * and progresses permanent chicken speed.
 */
export function spawnPepper(canvas) {
  const x = Math.random() * (canvas.width - CONFIG.PEPPER.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.peppers.push({ x, y: -CONFIG.PEPPER.size, width: CONFIG.PEPPER.size, height: CONFIG.PEPPER.size });
}