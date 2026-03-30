import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { updateUI, setGrassState } from './ui.js';
import { soundState, splatSound, damageSound, chickenEatSound } from '../js/music.js';

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function handleCollisions() {
  const eggsToRemove = new Set();
  const enemiesToRemove = new Set();

  // Враги vs Яйца + Курица
  gameState.enemies.forEach((enemy, eIdx) => {
    gameState.eggs.forEach((egg, eggIdx) => {
      if (eggsToRemove.has(eggIdx) || enemiesToRemove.has(eIdx)) return;

      if (isColliding(egg, enemy)) {
        enemy.hits += gameState.eggDamage;
        if (!soundState.sfxMuted) {
          splatSound.play();
        }
        eggsToRemove.add(eggIdx);
        if (enemy.hits >= enemy.maxHits) {
          enemiesToRemove.add(eIdx);
          gameState.score += 10;
        }
      }
    });

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

  // Безопасное удаление с конца
  [...enemiesToRemove].sort((a, b) => b - a).forEach(i => gameState.enemies.splice(i, 1));
  [...eggsToRemove].sort((a, b) => b - a).forEach(i => gameState.eggs.splice(i, 1));

  // Кукуруза
  gameState.corns = gameState.corns.filter(corn => {
    if (isColliding(gameState.chicken, corn)) {
      gameState.speedBoostActive = true;
      gameState.speedBoostEndTime = Date.now() + CONFIG.BOOST.duration;
      gameState.chicken.speed = CONFIG.CHICKEN.speed * CONFIG.BOOST.speedMultiplier;
      gameState.eggDamage += CONFIG.BOOST.damageIncrease;
      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }
      return false;
    }
    return true;
  });

  // Пшеница
  gameState.wheats = gameState.wheats.filter(wheat => {
    if (isColliding(gameState.chicken, wheat)) {
      if (gameState.health < CONFIG.GAME.maxHealth) gameState.health++;
      if (!soundState.sfxMuted) {
        chickenEatSound.play();
      }
      return false;
    }
    return true;
  });

  // Босс
    if (gameState.boss) {
    gameState.eggs = gameState.eggs.filter(egg => {
        // ✅ ИСПРАВЛЕНИЕ: босс мог умереть от предыдущего яйца в этом же кадре
        if (!gameState.boss) return true;

        if (isColliding(egg, gameState.boss)) {
        gameState.boss.health -= gameState.eggDamage;

        if (!soundState.sfxMuted) {
            splatSound.play();
        }

        if (gameState.boss.health <= 0) {
            gameState.boss = null;
            gameState.score += 500;
            gameState.gameOver = true;
            gameState.gameOverReason = 'Victory! The Chicken defeated the boss!';
            gameState.isVictory = true;
            setGrassState('static');
        }

        return false;
        }
        return true;
    });

    // ✅ Тоже проверяем — босс мог умереть выше
    if (gameState.boss && isColliding(gameState.chicken, gameState.boss)) {
        gameState.boss = null;
        gameState.health = 0;
        gameState.gameOver = true;
        gameState.gameOverReason = 'The Chicken was crushed by the boss!';
        setGrassState('static');
    }
    }

  updateUI();
}