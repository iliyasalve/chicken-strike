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

import { CONFIG, cycleHpMult } from './config.js';
import { gameState, chickenPermSpeed, viewport } from './state.js';
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

  const glyphs = ['🥚', '🌽', '🌾', '🌶️', CONFIG.BOSS.emoji, ...CONFIG.ENEMY.types.map(t => t.emoji)];
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

  const now = performance.now();
  gameState.enemies.forEach(e => {
    if (e.hitFlashUntil > now) {
      // Hit flash: brief scale-up + transparency so the player sees
      // the egg connected (multi-hit types would feel unresponsive
      // otherwise)
      const cx = e.x + e.width / 2;
      const cy = e.y + e.height / 2;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.translate(cx, cy);
      ctx.scale(1.15, 1.15);
      ctx.translate(-cx, -cy);
      ctx.fillText(e.emoji, e.x, e.y);
      ctx.restore();
    } else {
      ctx.fillText(e.emoji, e.x, e.y);
    }
    drawHitbox(ctx, e, 'red');
  });
}

/**
 * Draws the boss if it exists.
 * Boss uses a larger font size (80px) than regular enemies.
 */
export function drawBoss(ctx) {
  if (!gameState.boss) return;

  const boss = gameState.boss;
  ctx.font = EMOJI_FONT_80;
  ctx.textBaseline = 'top';
  ctx.fillText(boss.emoji, boss.x, boss.y);

  // Health bar above the boss: the fight is long (15-20 hits) and
  // moving, so the player needs to see progress
  const barW = boss.width;
  const barH = 6;
  const barY = boss.y - barH - 4;
  const ratio = Math.max(0, boss.health / boss.maxHealth);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(boss.x, barY, barW, barH);
  ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ffb300' : '#e53935';
  ctx.fillRect(boss.x, barY, barW * ratio, barH);

  drawHitbox(ctx, boss, 'purple');
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
  gameState.chicken.x = Math.max(0, Math.min(viewport.width - gameState.chicken.width, gameState.chicken.x));
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
  // Visual feedback: grass scrolls faster once the game heats up.
  // Tied to a score threshold now that enemy speed is per-type.
  if (gameState.score >= CONFIG.GAME.grassBoostScore) {
    setGrassState('boost');
  } else {
    setGrassState('moving');
  }

  gameState.enemies = gameState.enemies.filter(e => {
    e.y += e.speed * dtFactor;

    // Enemy passed the bottom edge
    if (e.y > viewport.height) {
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

  // Ping-pong sweep: constant horizontal speed, bounce at the edges.
  // Makes the boss a moving target (eggs fly straight up) and forces
  // the chicken to dodge near the bottom. Constant speed by design —
  // an escalating "fury" was rejected for readability (see spec).
  const maxX = viewport.width - gameState.boss.width;
  gameState.boss.x += gameState.boss.hDir * CONFIG.BOSS.hSpeed * dtFactor;
  if (gameState.boss.x <= 0) {
    gameState.boss.x = 0;
    gameState.boss.hDir = 1;
  } else if (gameState.boss.x >= maxX) {
    gameState.boss.x = maxX;
    gameState.boss.hDir = -1;
  }

  // Boss escaped past the chicken
  if (gameState.boss.y > viewport.height) {
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
  gameState.corns = gameState.corns.filter(c => c.y < viewport.height);
  gameState.corns.forEach(c => c.y += CONFIG.CORN.speed * dtFactor);

  gameState.wheats = gameState.wheats.filter(w => w.y < viewport.height);
  gameState.wheats.forEach(w => w.y += CONFIG.WHEAT.speed * dtFactor);

  gameState.peppers = gameState.peppers.filter(p => p.y < viewport.height);
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
 * Picks an enemy type using the spawn-phase weight table. Phase index
 * is driven by progress within the current cycle, shifted up by one
 * per completed wave: wave 2 starts at the dog/cat mix, wave 4+ runs
 * the final mix from the first second.
 */
function pickEnemyType() {
  const progress = gameState.score - gameState.cycleStartScore;
  let base = 0;
  CONFIG.ENEMY.phases.forEach((p, i) => { if (progress >= p.fromScore) base = i; });
  const idx = Math.min(CONFIG.ENEMY.phases.length - 1, base + (gameState.wave - 1));
  const phase = CONFIG.ENEMY.phases[idx];

  const entries = CONFIG.ENEMY.types
    .map(t => [t, phase.weights[t.id] || 0])
    .filter(([, w]) => w > 0);

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll < 0) return type;
  }
  return entries[entries.length - 1][0]; // Float edge case fallback
}

/**
 * Spawns a regular enemy or triggers boss.
 *
 * Boss spawn conditions:
 *   - Score >= nextBossScore (per-cycle threshold)
 *   - No boss currently active
 *   - Boss not already spawned this cycle
 *
 * If boss is active or was spawned, no regular
 * enemies spawn until boss fight ends.
 *
 * Regular enemies get their type (emoji, speed, HP)
 * from the score-phase weight table (pickEnemyType).
 */
export function spawnEnemy(canvas) {
  // Check if it's time to spawn the boss
  if (gameState.score >= gameState.nextBossScore && !gameState.boss && !gameState.bossSpawned) {
    const bossX = Math.random() * (viewport.width - CONFIG.BOSS.size);
    gameState.boss = {
      x: bossX,
      y: -CONFIG.BOSS.size,
      width: CONFIG.BOSS.size,
      height: CONFIG.BOSS.size,
      // HP parity: boss scales with the wave like regular enemies,
      // keeping the fight at 15-20 hits against the grown egg damage
      health: Math.round(CONFIG.BOSS.health * cycleHpMult(gameState.wave)),
      maxHealth: Math.round(CONFIG.BOSS.health * cycleHpMult(gameState.wave)),
      speed: CONFIG.BOSS.speed,
      emoji: CONFIG.BOSS.emoji,
      // Sweep toward the far side of the screen (spawned left goes
      // right and vice versa), then ping-pongs between the edges
      hDir: bossX < (viewport.width - CONFIG.BOSS.size) / 2 ? 1 : -1
    };
    gameState.bossSpawned = true;
    return;
  }

  // Don't spawn regular enemies during boss fight
  if (gameState.boss || gameState.bossSpawned) return;

  const type = pickEnemyType();

  // Random x position within safe margins
  const x = Math.random() * (viewport.width - CONFIG.ENEMY.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;

  gameState.enemies.push({
    x, y: -CONFIG.ENEMY.size,
    width: CONFIG.ENEMY.size, height: CONFIG.ENEMY.size,
    emoji: type.emoji, speed: type.speed,
    hits: 0, maxHits: Math.round(type.hp * cycleHpMult(gameState.wave)),
    hitFlashUntil: 0
  });
}

/**
 * Spawns a corn power-up.
 * Collecting it grants temporary speed boost
 * and permanently increases egg damage.
 */
export function spawnCorn(canvas) {
  const x = Math.random() * (viewport.width - CONFIG.CORN.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.corns.push({ x, y: -CONFIG.CORN.size, width: CONFIG.CORN.size, height: CONFIG.CORN.size });
}

/**
 * Spawns a wheat power-up.
 * Collecting it restores 1 health point
 * (capped at maxHealth).
 */
export function spawnWheat(canvas) {
  const x = Math.random() * (viewport.width - CONFIG.WHEAT.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.wheats.push({ x, y: -CONFIG.WHEAT.size, width: CONFIG.WHEAT.size, height: CONFIG.WHEAT.size });
}

/**
 * Spawns a pepper power-up.
 * Collecting it grants temporary speed boost
 * and progresses permanent chicken speed.
 */
export function spawnPepper(canvas) {
  const x = Math.random() * (viewport.width - CONFIG.PEPPER.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.peppers.push({ x, y: -CONFIG.PEPPER.size, width: CONFIG.PEPPER.size, height: CONFIG.PEPPER.size });
}