import { gameState } from './state.js';
import { CONFIG } from './config.js';
import { soundState, eggPopSound } from './music.js';
import { showPause, hidePause, setGrassState } from './ui.js';

export function setupInput() {
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const shootBtn = document.getElementById('shoot-btn');

  window.addEventListener('keydown', e => {
  // ✅ Если фокус на текстовом поле — не обрабатываем игровые клавиши
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    return;
  }

  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    gameState.chicken.dx = -gameState.chicken.speed;
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    gameState.chicken.dx = gameState.chicken.speed;
  } else if (e.code === 'Space') {
    handleShoot();
  } else if (e.code === 'KeyP') {
    handlePause();
  } else if (e.code === 'KeyH') {
    CONFIG.DEBUG_HITBOXES = !CONFIG.DEBUG_HITBOXES;
    console.log('Hitboxes:', CONFIG.DEBUG_HITBOXES ? 'ON' : 'OFF');
  }
});

window.addEventListener('keyup', e => {
  // ✅ Тоже игнорируем при вводе текста
  if (document.activeElement && document.activeElement.tagName === 'INPUT') {
    return;
  }

  if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
    gameState.chicken.dx = 0;
  }
});

  const addTouch = (btn, startFn, endFn) => {
    btn.addEventListener('touchstart', e => { e.preventDefault(); startFn(); });
    btn.addEventListener('touchend', e => { e.preventDefault(); endFn(); });
  };

  addTouch(leftBtn, () => gameState.chicken.dx = -gameState.chicken.speed, () => gameState.chicken.dx = 0);
  addTouch(rightBtn, () => gameState.chicken.dx = gameState.chicken.speed, () => gameState.chicken.dx = 0);
  addTouch(shootBtn, handleShoot, () => {});
}

function handleShoot() {
  if (document.getElementById('start-menu').style.display !== 'none') return;
  const now = Date.now();
  if (now - gameState.lastShotTime > CONFIG.EGG.cooldown) {
    gameState.eggs.push({ x: gameState.chicken.x + gameState.chicken.width/2 - CONFIG.EGG.radius, y: gameState.chicken.y, width: CONFIG.EGG.radius*2, height: CONFIG.EGG.radius*2 });
    gameState.lastShotTime = now;
    if (!soundState.sfxMuted) { eggPopSound.play(); }
  }
}

function handlePause() {
  if (document.getElementById('start-menu').style.display !== 'none') return;
  gameState.paused = !gameState.paused;
  if (gameState.paused) { showPause(); setGrassState('static'); }
  else { hidePause(); setGrassState('moving'); }
}