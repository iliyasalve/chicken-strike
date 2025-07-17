import {
  backgroundMusic,
  eggPopSound,
  splatSound,
  chickenEatSound,
  damageSound,
  gameOverSound,
  gameOverSoundPlayed,
  victorySound,
  victorySoundPlayed,
  sfxMuted,
  musicMuted
} from './js/music.js';

//DEBUG
const DEBUG_HITBOXES = false;
let SCORE_BEFORE_BOSS = 1200;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreContainer = document.getElementById('score-container');
const currentScoreElement = document.getElementById('current-score');
const highScoreElement = document.getElementById('high-score');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const shootBtn = document.getElementById('shoot-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtnGameOver = document.getElementById('menu-btn-game-over');
const menuBtnPause = document.getElementById('menu-btn-pause');
const resumeBtn = document.getElementById('resume-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseMenu = document.getElementById('pause-menu');
const startMenu = document.getElementById('start-menu');
const gameOverReason = document.getElementById('game-over-reason');
const healthBar = document.getElementById('health-bar');
const eggDamageElement = document.getElementById('egg-damage');

const chickenImg = new Image();
chickenImg.src = 'assets/images/kuritsa.png';

//const CHICKEN_WIDTH = 250;
//const CHICKEN_HEIGHT = 130;
const CHICKEN_WIDTH = 130;
const CHICKEN_HEIGHT = 130;
const EGG_RADIUS = 10;
const ENEMY_SIZE = 60;
const CORN_SIZE = 60;
const WHEAT_SIZE = 60;
let ENEMY_SPEED = 2;
const CORN_SPEED = 2;
const WHEAT_SPEED = 2;
const EGG_SPEED = 5;
const SPAWN_INTERVAL = 1500;
const BASE_SPAWN_INTERVAL = 1500;
const MIN_SPAWN_INTERVAL = 500;

//const CORN_SPAWN_INTERVAL = 10000; // 10 seconds
//const WHEAT_SPAWN_INTERVAL = 10000; // 10 seconds

const CORN_MIN_INTERVAL = 10000; // 10 seconds
const CORN_MAX_INTERVAL = 20000; // 20 seconds

const WHEAT_MIN_INTERVAL = 10000; // 10 seconds
const WHEAT_MAX_INTERVAL = 20000; // 20 seconds

const EDGE_MARGIN = 50; // Margin from screen edges for enemy spawning
const MAX_MISSED_ENEMIES = 10; // Maximum number of missed enemies before game over
const MAX_HEALTH = 10; // Maximum health segments

let lastShotTime = 0;
const SHOOT_COOLDOWN = 300; 

let chicken = {
  x: canvas.width / 2 - CHICKEN_WIDTH / 2,
  y: canvas.height - CHICKEN_HEIGHT - 20,
  width: CHICKEN_WIDTH,
  height: CHICKEN_HEIGHT,
  speed: 5,
  dx: 0
};

let eggDamage = 1; // Initial egg damage
let speedBoostActive = false; // Track if speed boost is active
let speedBoostEndTime = 0; // Time when speed boost ends
const SPEED_BOOST_DURATION = 5000; // 5 seconds
const SPEED_BOOST_MULTIPLIER = 2; // Double speed during boost
const DAMAGE_INCREASE_PER_CORN = 1; // Damage increase per corn collected

let eggs = [];
let enemies = [];
let corns = [];
let wheats = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let lastSpawnTime = 0;
let lastCornSpawnTime = 0;
let lastWheatSpawnTime = 0;
let missedEnemies = 0; // Track missed enemies
let gameOver = false;
let paused = false; // Track if the game is paused
let health = MAX_HEALTH; // Initial health

let nextCornInterval = getRandomInterval(CORN_MIN_INTERVAL, CORN_MAX_INTERVAL);
let nextWheatInterval = getRandomInterval(WHEAT_MIN_INTERVAL, WHEAT_MAX_INTERVAL);

const gameCanvas = document.getElementById('gameCanvas');

function setGrassState(state) {
  gameCanvas.classList.remove('grass-static', 'grass-moving', 'grass-boost');

  if (state === 'static') {
    gameCanvas.classList.add('grass-static');
  } else if (state === 'moving') {
    gameCanvas.classList.add('grass-moving');
  } else if (state === 'boost') {
    gameCanvas.classList.add('grass-boost');
  }
}

////////// hereBOSS
const BOSS_SIZE = 100;
const BOSS_HEALTH = 100;
const BOSS_SPEED = 1;

let boss = null; // объект босса
let bossSpawned = false;

function spawnBoss() {
  const x = Math.random() * (canvas.width - BOSS_SIZE); // Случайная позиция по оси X
  const y = -BOSS_SIZE;  // Босс появляется сверху экрана
  boss = {
    x: x,
    y: y,
    width: BOSS_SIZE,
    height: BOSS_SIZE,
    health: BOSS_HEALTH,
    speed: BOSS_SPEED,
    emoji: '👹' // Или любой другой символ
  };
}

function updateBoss() {
  if (!boss) return;

  boss.y += boss.speed;

  // Проверка, если босс вышел за нижнюю границу экрана — игрок проиграл
  if (boss.y > canvas.height) {
    boss = null;
    health = 0;
    updateHealthBar();

    gameOver = true;
    gameOverReason.textContent = 'The boss got past the Chicken!';
    gameOverScreen.style.display = 'flex';
    setGrassState('static');

    if (!gameOverSoundPlayed && !sfxMuted) {
      gameOverSound.play().catch(err => console.warn("Sound play blocked:", err));
      gameOverSoundPlayed = true;
    }
    return;  // Завершаем функцию, чтобы не выполнять дальнейшие проверки
  }

  // Проверка на попадание яйца в босса
  eggs = eggs.filter(egg => {
    if (isColliding(egg, boss)) {
      boss.health -= eggDamage;

      if (!sfxMuted) {
        splatSound.currentTime = 0;
        splatSound.play().catch(err => console.warn("Sound play blocked:", err));
      }

      // Победа!
      if (boss.health <= 0) {
        boss = null;
        score += 500;
        updateScore();
        updateHighScore();

        gameOver = true;
        gameOverReason.textContent = 'Victory! The Chicken defeated the boss!';
        gameOverScreen.style.display = 'flex';
        setGrassState('static');

        if (!victorySoundPlayed && !sfxMuted) {
          victorySound.play().catch(err => console.warn("Sound play blocked:", err));
          victorySoundPlayed = true;
        }
      }

      return false; // удалить яйцо
    }

    return true;
  });

  // Проверка столкновения с игроком
  if (isColliding(chicken, boss)) {
    boss = null;
    health = 0;
    updateHealthBar();

    gameOver = true;
    gameOverReason.textContent = 'The Chicken was crushed by the boss!';
    gameOverScreen.style.display = 'flex';
    setGrassState('static');

    if (!gameOverSoundPlayed && !sfxMuted) {
      gameOverSound.play().catch(err => console.warn("Sound play blocked:", err));
      gameOverSoundPlayed = true;
    }
  }
}

function drawBoss() {
  if (!boss) return;
  ctx.font = '80px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  
  ctx.textBaseline = 'top';
  const visualYOffset = 10;

  ctx.fillText(boss.emoji, boss.x, boss.y + visualYOffset);

  if (DEBUG_HITBOXES) {
    ctx.strokeStyle = 'purple';
    ctx.lineWidth = 3;
    ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
  }
}

//////////

function getDynamicSpawnInterval(score) {
  const adjustedInterval = BASE_SPAWN_INTERVAL - Math.min(score, 500) * 2;
  return Math.max(adjustedInterval, MIN_SPAWN_INTERVAL);
  //return Math.max(BASE_SPAWN_INTERVAL - score * 1.5, MIN_SPAWN_INTERVAL);
}

function getRandomInterval(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
  }
  highScoreElement.textContent = `High Score: ${highScore}`;
}

function updateScore() {
  currentScoreElement.textContent = `Score: ${score}`;
}

function updateHealthBar() {
  const healthSegments = healthBar.querySelectorAll('div');
  healthSegments.forEach((segment, index) => {
    if (index < health) {
      segment.style.backgroundColor = '#00ff00';
    } else {
      segment.style.backgroundColor = '#ff0000';
    }
  });
  eggDamageElement.textContent = `Egg Damage: ${eggDamage}`;
}

function drawChicken() {
  // Draw the chicken at its natural scale with adjusted height
  if (chicken.dx > 0) {
    // Flip the image horizontally when moving right
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(chickenImg, -chicken.x - chicken.width, chicken.y, chicken.width, chicken.height);
    ctx.restore();
  } else {
    ctx.drawImage(chickenImg, chicken.x, chicken.y, chicken.width, chicken.height);
  }

  if (DEBUG_HITBOXES) {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.strokeRect(chicken.x, chicken.y, chicken.width, chicken.height);
  }
}

function drawEggs() {
  // Set egg color based on damage
  const eggColor = eggDamage === 1 ? 'yellow' : 'orange';
  ctx.fillStyle = eggColor;
  eggs.forEach(egg => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🥚', egg.x, egg.y);
  });
}

function drawEnemies() {
  ctx.fillStyle = 'green';
  enemies.forEach(enemy => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    
    // for y-position collision
    ctx.textBaseline = 'top';
    const visualYOffset = 15; 
 
    ctx.fillText(enemy.emoji, enemy.x, enemy.y + visualYOffset);

    if (DEBUG_HITBOXES) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
  });
}

function updateEggs() {
  eggs = eggs.filter(egg => egg.y > 0);
  eggs.forEach(egg => {
    egg.y -= EGG_SPEED;
  });
}

function updateEnemies() {

  ENEMY_SPEED = 2 + Math.floor(score / 200);

  if (ENEMY_SPEED > 4) {
    setGrassState('boost');
  } else {
    setGrassState('moving'); 
  }

  enemies = enemies.filter(enemy => {
    enemy.y += ENEMY_SPEED;

    if (enemy.y > canvas.height) {
      missedEnemies++;

      if (missedEnemies >= MAX_MISSED_ENEMIES) {
        gameOver = true;
        gameOverReason.textContent = 'Too many enemies passed by!';
        setGrassState('static');
      }

      return false; 
    }
    return true;
  });
}

function checkCollisions() {
  enemies.forEach((enemy, enemyIndex) => {
    eggs.forEach((egg, eggIndex) => {
      if (isColliding(egg, enemy)) {
        enemy.hits += eggDamage;
        if (!sfxMuted) {
          splatSound.currentTime = 0;
          splatSound.play().catch(err => console.warn("Sound play blocked:", err));
        }
        if (enemy.hits >= enemy.maxHits) {
          enemies.splice(enemyIndex, 1);
          eggs.splice(eggIndex, 1);
          score += 10;
          updateScore();
          updateHighScore();
        } else {
          eggs.splice(eggIndex, 1);
        }
      }
    });

    if (isColliding(chicken, enemy)) {

      enemies.splice(enemyIndex, 1);

      health--;

      if (!sfxMuted) {
        damageSound.currentTime = 0;
        damageSound.play().catch(err => console.warn("Sound play blocked:", err));
      }

      updateHealthBar();
      if (health <= 0) {
        gameOver = true;
        gameOverReason.textContent = 'You were hit by an enemy!';
        setGrassState('static');
      }
    }
  });

  corns.forEach((corn, cornIndex) => {
    if (isColliding(chicken, corn)) {
      // Apply speed boost
      speedBoostActive = true;
      speedBoostEndTime = Date.now() + SPEED_BOOST_DURATION;
      chicken.speed = 5 * SPEED_BOOST_MULTIPLIER;

      // Increase egg damage
      eggDamage += DAMAGE_INCREASE_PER_CORN;
      updateHealthBar();

      // Play eating sound
      if (!sfxMuted) {
        chickenEatSound.currentTime = 0;
        chickenEatSound.play().catch(err => console.warn("Sound play blocked:", err));
      }

      // Remove the corn
      corns.splice(cornIndex, 1);
    }
  });

  wheats.forEach((wheat, wheatIndex) => {
    if (isColliding(chicken, wheat)) {
      if (health < MAX_HEALTH) {
        health++;
        updateHealthBar();
      }

      // Play eating sound
      if (!sfxMuted) {
        chickenEatSound.currentTime = 0;
        chickenEatSound.play().catch(err => console.warn("Sound play blocked:", err));
      }

      // Remove the wheat
      wheats.splice(wheatIndex, 1);
    }
  });

}

function spawnEnemy() {
  // hereBOSS
  if (score >= SCORE_BEFORE_BOSS && !boss && !bossSpawned) {
    spawnBoss();
    bossSpawned = true;
    return;
  }

  if (boss || bossSpawned) {
    // Босс уже на сцене или был заспавнен — обычных врагов не спавним
    return;
  }

  //const emojis = ['🥦', '🥕', '🍆'];
  const emojis = ['🦊', '🐺', '🐶', '😼'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  const x = Math.random() * (canvas.width - ENEMY_SIZE - EDGE_MARGIN * 2) + EDGE_MARGIN;
  const maxHits = Math.floor(score / 100) + 1; // Increase toughness with score
  enemies.push({x, y: -ENEMY_SIZE, width: ENEMY_SIZE, height: ENEMY_SIZE, emoji: randomEmoji, hits: 0, maxHits});
}

function resetGame() {
  resizeCanvasToMatchCSS();
  chicken.x = canvas.width / 2 - CHICKEN_WIDTH / 2;
  chicken.y = canvas.height - CHICKEN_HEIGHT - 10;
  chicken.speed = 5; // Reset speed
  ENEMY_SPEED = 2;
  boss = null; //hereBOSS
  eggs = [];
  enemies = [];
  corns = [];
  wheats = [];
  score = 0;
  eggDamage = 1; // Reset egg damage
  speedBoostActive = false; // Reset speed boost
  missedEnemies = 0; // Reset missed enemies
  health = MAX_HEALTH; // Reset health
  bossSpawned = false // hereBOSS
  updateScore();
  updateHealthBar();
  gameOver = false;
  paused = false; // Reset paused state
  lastSpawnTime = 0;
  lastCornSpawnTime = performance.now();
  lastWheatSpawnTime = performance.now();
  gameOverScreen.style.display = 'none';
  pauseMenu.style.display = 'none';
  startMenu.style.display = 'none';
  scoreContainer.style.display = 'block';
  canvas.style.display = 'block';
  nextCornInterval = getRandomInterval(CORN_MIN_INTERVAL, CORN_MAX_INTERVAL);
  nextWheatInterval = getRandomInterval(WHEAT_MIN_INTERVAL, WHEAT_MAX_INTERVAL);
}

function gameLoop(timestamp) {
  if (gameOver) {
    gameOverScreen.style.display = 'flex';

    if (!gameOverSoundPlayed && !sfxMuted) {
      gameOverSound.play().catch(err => console.warn("Sound play blocked:", err));
      gameOverSoundPlayed = true;
    }

    return;
  }

  if (paused) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply speed boost if active
  if (speedBoostActive && Date.now() > speedBoostEndTime) {
    speedBoostActive = false;
    chicken.speed = 5; // Reset to normal speed
  }

  chicken.x += chicken.dx;
  if (chicken.x < 0) chicken.x = 0;
  if (chicken.x + chicken.width > canvas.width) chicken.x = canvas.width - chicken.width;

  drawChicken();
  drawEggs();
  drawEnemies();
  drawBoss(); //hereBOSS
  drawCorns();
  drawWheats();

  updateEggs();
  updateEnemies();
  updateBoss(); //hereBOSS
  updateCorns();
  updateWheats();

  checkCollisions();


  if (timestamp - lastSpawnTime > SPAWN_INTERVAL) {
  //if (timestamp - lastSpawnTime > getDynamicSpawnInterval(score)) {
    spawnEnemy();
    lastSpawnTime = timestamp;
  }

  if (timestamp - lastCornSpawnTime > nextCornInterval) {
    spawnCorn();
    lastCornSpawnTime = timestamp;
    nextCornInterval = getRandomInterval(CORN_MIN_INTERVAL, CORN_MAX_INTERVAL);
  }

  if (timestamp - lastWheatSpawnTime > nextWheatInterval) {
    spawnWheat();
    lastWheatSpawnTime = timestamp;
    nextWheatInterval = getRandomInterval(WHEAT_MIN_INTERVAL, WHEAT_MAX_INTERVAL);
  }

  requestAnimationFrame(gameLoop);
}


function resizeCanvasToMatchCSS() {
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

window.addEventListener('resize', resizeCanvasToMatchCSS);


function startGame() {
  resizeCanvasToMatchCSS();
  updateHighScore();
  resetGame();
  requestAnimationFrame(gameLoop);
  if (!musicMuted) {
  backgroundMusic.play().catch(err => {
    console.warn("Autoplay blocked:", err);
  });
}
}



window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    chicken.dx = -chicken.speed;
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    chicken.dx = chicken.speed;
  } else if (e.code === 'Space') {
    const now = Date.now();
    if (now - lastShotTime > SHOOT_COOLDOWN) {
      eggs.push({
        x: chicken.x + chicken.width / 2 - EGG_RADIUS,
        y: chicken.y,
        width: EGG_RADIUS * 2,
        height: EGG_RADIUS * 2
      });
      lastShotTime = now;

      if (!sfxMuted) {
        eggPopSound.currentTime = 0;
        eggPopSound.play().catch(err => console.warn("Sound play blocked:", err));
      }
    }
  } else if (e.code === 'KeyP') {
    paused = !paused;
    if (paused) {
      pauseMenu.style.display = 'flex';
      setGrassState('static'); 
    } else {
      pauseMenu.style.display = 'none';
      setGrassState('moving');
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
    chicken.dx = 0;
  }
});

leftBtn.addEventListener('touchstart', () => {
  chicken.dx = -chicken.speed;
});

rightBtn.addEventListener('touchstart', () => {
  chicken.dx = chicken.speed;
});

shootBtn.addEventListener('touchstart', () => {
  const now = Date.now();
  if (now - lastShotTime > SHOOT_COOLDOWN) {
    eggs.push({
      x: chicken.x + chicken.width / 2 - EGG_RADIUS,
      y: chicken.y,
      width: EGG_RADIUS * 2,
      height: EGG_RADIUS * 2
    });
    lastShotTime = now;
    if (!sfxMuted) {
      eggPopSound.currentTime = 0;
      eggPopSound.play().catch(err => console.warn("Sound play blocked:", err));
    }
  }
});


leftBtn.addEventListener('touchend', () => {
  chicken.dx = 0;
});

rightBtn.addEventListener('touchend', () => {
  chicken.dx = 0;
});

function drawCorns() {
  ctx.fillStyle = 'yellow';
  corns.forEach(corn => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🌽', corn.x, corn.y);
  });
}

function updateCorns() {
  corns = corns.filter(corn => corn.y < canvas.height);
  corns.forEach(corn => {
    corn.y += CORN_SPEED;
  });
}

function spawnCorn() {
  const x = Math.random() * (canvas.width - CORN_SIZE - EDGE_MARGIN * 2) + EDGE_MARGIN;
  corns.push({ x, y: -CORN_SIZE, width: CORN_SIZE, height: CORN_SIZE });
}


function drawWheats() {
  ctx.fillStyle = 'goldenrod';
  wheats.forEach(wheat => {
    ctx.font = '40px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText('🌾', wheat.x, wheat.y);
  });
}


function updateWheats() {
  wheats = wheats.filter(wheat => wheat.y < canvas.height);
  wheats.forEach(wheat => {
    wheat.y += WHEAT_SPEED; // Можно использовать такую же скорость, как у корна
  });
}


function spawnWheat() {
  const x = Math.random() * (canvas.width - WHEAT_SIZE - EDGE_MARGIN * 2) + EDGE_MARGIN;
  wheats.push({ x, y: -WHEAT_SIZE, width: WHEAT_SIZE, height: WHEAT_SIZE });
}


function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

startBtn.addEventListener('click', () => {
  startMenu.style.display = 'none';
  scoreContainer.style.display = 'block';
  canvas.style.display = 'block';
  setGrassState('moving');
  startGame();
});

restartBtn.addEventListener('click', () => {
  gameOverScreen.style.display = 'none';
  resetGame();
  startGame();
});

menuBtnGameOver.addEventListener('click', () => {
  gameOverScreen.style.display = 'none';
  startMenu.style.display = 'flex';

  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;

  setGrassState('static');
});

menuBtnPause.addEventListener('click', () => {
  pauseMenu.style.display = 'none';
  startMenu.style.display = 'flex';

  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;

  setGrassState('static');
});

resumeBtn.addEventListener('click', () => {
  paused = false;
  pauseMenu.style.display = 'none';

  setGrassState('moving');

  requestAnimationFrame(gameLoop); 
});

// Initialize health bar
for (let i = 0; i < MAX_HEALTH; i++) {
  const segment = document.createElement('div');
  healthBar.appendChild(segment);
}
