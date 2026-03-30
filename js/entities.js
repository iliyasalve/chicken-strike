import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { setGrassState } from './ui.js';

const chickenImg = new Image();
chickenImg.src = 'assets/images/kuritsa.png';

// ============ DEBUG HITBOX HELPER ============

function drawHitbox(ctx, obj, color = 'red') {
  if (!CONFIG.DEBUG_HITBOXES) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);

  // Показываем размер
  ctx.fillStyle = color;
  ctx.font = '10px monospace';
  ctx.fillText(`${obj.width}x${obj.height}`, obj.x, obj.y - 3);
}

// ============ DRAW ============

export function drawChicken(ctx) {
  if (gameState.chicken.dx > 0) {
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
    ctx.drawImage(chickenImg,
      gameState.chicken.x,
      gameState.chicken.y,
      gameState.chicken.width,
      gameState.chicken.height
    );
  }
  drawHitbox(ctx, gameState.chicken, 'blue');
}

export function drawEggs(ctx) {
  gameState.eggs.forEach(e => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🥚', e.x, e.y);
    drawHitbox(ctx, e, 'yellow');
  });
}

export function drawEnemies(ctx) {
  gameState.enemies.forEach(e => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(e.emoji, e.x, e.y);
    drawHitbox(ctx, e, 'red');
  });
}

export function drawBoss(ctx) {
  if (!gameState.boss) return;
  ctx.font = '80px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(gameState.boss.emoji, gameState.boss.x, gameState.boss.y);
  drawHitbox(ctx, gameState.boss, 'purple');
}

export function drawItems(ctx) {
  gameState.corns.forEach(c => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🌽', c.x, c.y);
    drawHitbox(ctx, c, 'green');
  });
  gameState.wheats.forEach(w => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🌾', w.x, w.y);
    drawHitbox(ctx, w, 'goldenrod');
  });
}

// ============ UPDATE ============

export function updateChicken(canvas) {
  if (gameState.speedBoostActive && Date.now() > gameState.speedBoostEndTime) {
    gameState.speedBoostActive = false;
    gameState.chicken.speed = CONFIG.CHICKEN.speed;
  }
  gameState.chicken.x += gameState.chicken.dx;
  gameState.chicken.x = Math.max(0, Math.min(canvas.width - gameState.chicken.width, gameState.chicken.x));
}

export function updateEggs() {
  gameState.eggs = gameState.eggs.filter(e => e.y > 0);
  gameState.eggs.forEach(e => e.y -= CONFIG.EGG.speed);
}

export function updateEnemies(canvas) {
  const speed = CONFIG.ENEMY.baseSpeed + Math.floor(gameState.score / 200);

  if (speed > 4) {
    setGrassState('boost');
  } else {
    setGrassState('moving');
  }

  gameState.enemies = gameState.enemies.filter(e => {
    e.y += speed;
    if (e.y > canvas.height) {
      gameState.missedEnemies++;
      if (gameState.missedEnemies >= CONFIG.GAME.maxMissedEnemies) {
        gameState.gameOver = true;
        gameState.gameOverReason = 'Too many enemies passed by!'; // ← НОВОЕ
        setGrassState('static');
      }
      return false;
    }
    return true;
  });
}

export function updateBoss(canvas) {
  if (!gameState.boss) return;
  gameState.boss.y += gameState.boss.speed;

  if (gameState.boss.y > canvas.height) {
    gameState.boss = null;
    gameState.health = 0;
    gameState.gameOver = true;
    gameState.gameOverReason = 'The boss got past the Chicken!'; // ← НОВОЕ
    setGrassState('static');
  }
}

export function updateItems(canvas) {
  gameState.corns = gameState.corns.filter(c => c.y < canvas.height);
  gameState.corns.forEach(c => c.y += CONFIG.CORN.speed);
  gameState.wheats = gameState.wheats.filter(w => w.y < canvas.height);
  gameState.wheats.forEach(w => w.y += CONFIG.WHEAT.speed);
}

// ============ SPAWN ============

export function spawnEnemy(canvas) {
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
  if (gameState.boss || gameState.bossSpawned) return;

  const emoji = CONFIG.ENEMY.emojis[Math.floor(Math.random() * CONFIG.ENEMY.emojis.length)];
  const x = Math.random() * (canvas.width - CONFIG.ENEMY.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  const maxHits = Math.floor(gameState.score / 100) + 1;

  gameState.enemies.push({
    x, y: -CONFIG.ENEMY.size,
    width: CONFIG.ENEMY.size, height: CONFIG.ENEMY.size,
    emoji, hits: 0, maxHits
  });
}

export function spawnCorn(canvas) {
  const x = Math.random() * (canvas.width - CONFIG.CORN.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.corns.push({ x, y: -CONFIG.CORN.size, width: CONFIG.CORN.size, height: CONFIG.CORN.size });
}

export function spawnWheat(canvas) {
  const x = Math.random() * (canvas.width - CONFIG.WHEAT.size - CONFIG.SPAWN.edgeMargin * 2) + CONFIG.SPAWN.edgeMargin;
  gameState.wheats.push({ x, y: -CONFIG.WHEAT.size, width: CONFIG.WHEAT.size, height: CONFIG.WHEAT.size });
}