/* ========================================= */
/* INPUT HANDLING                            */
/* Sets up all player input methods:         */
/*   - Keyboard (desktop)                    */
/*   - Touch buttons (mobile)               */
/*                                           */
/* Controls:                                 */
/*   Arrow Left / A  — move left             */
/*   Arrow Right / D — move right            */
/*   Space           — shoot egg             */
/*   P               — toggle pause          */
/*   H               — toggle debug hitboxes */
/*                                           */
/* Safety:                                   */
/*   - Input is ignored when typing in       */
/*     text fields (nickname input)          */
/*   - Shooting is blocked while in menus    */
/*   - Touch events use preventDefault to    */
/*     avoid scrolling/zooming on mobile     */
/* ========================================= */

import { gameState } from './state.js';
import { CONFIG } from './config.js';
import { soundState, eggPopSound } from './music.js';
import { showPause, hidePause, setGrassState } from './ui.js';

/* ========================================= */
/* SETUP                                     */
/* Called once from main.js on init.         */
/* Registers all keyboard and touch handlers.*/
/* ========================================= */

export function setupInput() {

  /* --- Touch button DOM references --- */
  const leftBtn = document.getElementById('left-btn');
  const rightBtn = document.getElementById('right-btn');
  const shootBtn = document.getElementById('shoot-btn');

  /* ======================================= */
  /* KEYBOARD — KEY DOWN                     */
  /* Sets movement direction or triggers     */
  /* shoot/pause/debug actions.              */
  /* Ignores input when focused on <input>.  */
  /* ======================================= */

  window.addEventListener('keydown', e => {
    // Skip game controls when typing in text fields
    // (e.g. nickname input on game over screen)
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
      // Toggle debug hitbox visualization
      CONFIG.DEBUG_HITBOXES = !CONFIG.DEBUG_HITBOXES;
      console.log('Hitboxes:', CONFIG.DEBUG_HITBOXES ? 'ON' : 'OFF');
    }
  });

  /* ======================================= */
  /* KEYBOARD — KEY UP                       */
  /* Stops horizontal movement when          */
  /* direction key is released.              */
  /* Also ignores input when in text fields. */
  /* ======================================= */

  window.addEventListener('keyup', e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return;
    }

    if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
      gameState.chicken.dx = 0;
    }
  });

  /* ======================================= */
  /* TOUCH CONTROLS                          */
  /* For mobile devices. Each button has:    */
  /*   touchstart — begin action             */
  /*   touchend   — stop action              */
  /* preventDefault stops page scroll/zoom.  */
  /* ======================================= */

  /**
   * Helper: attaches touchstart/touchend to a button.
   * @param {HTMLElement} btn - Touch button element
   * @param {Function} startFn - Called on touch start
   * @param {Function} endFn - Called on touch end
   */
  const addTouch = (btn, startFn, endFn) => {
    btn.addEventListener('touchstart', e => { e.preventDefault(); startFn(); });
    btn.addEventListener('touchend', e => { e.preventDefault(); endFn(); });
  };

  // Left button: move left while held, stop on release
  addTouch(leftBtn,
    () => gameState.chicken.dx = -gameState.chicken.speed,
    () => gameState.chicken.dx = 0
  );

  // Right button: move right while held, stop on release
  addTouch(rightBtn,
    () => gameState.chicken.dx = gameState.chicken.speed,
    () => gameState.chicken.dx = 0
  );

  // Shoot button: fire egg on tap (no action on release)
  addTouch(shootBtn, handleShoot, () => {});
}

/* ========================================= */
/* SHOOT HANDLER                             */
/* Creates a new egg projectile at the       */
/* chicken's position. Respects cooldown     */
/* to prevent spam-shooting.                 */
/*                                           */
/* Blocked when start menu is visible        */
/* (prevents shooting before game starts).   */
/* ========================================= */

function handleShoot() {
  // Don't shoot while in menus
  if (document.getElementById('start-menu').style.display !== 'none') return;

  const now = Date.now();

  // Enforce cooldown between shots
  if (now - gameState.lastShotTime > CONFIG.EGG.cooldown) {
    // Spawn egg centered above the chicken
    gameState.eggs.push({
      x: gameState.chicken.x + gameState.chicken.width / 2 - CONFIG.EGG.radius,
      y: gameState.chicken.y,
      width: CONFIG.EGG.radius * 2,
      height: CONFIG.EGG.radius * 2
    });

    gameState.lastShotTime = now;

    // Play egg pop sound effect
    if (!soundState.sfxMuted) {
      eggPopSound.play();
    }
  }
}

/* ========================================= */
/* PAUSE HANDLER                             */
/* Toggles game pause state.                 */
/* Shows/hides pause menu and changes        */
/* grass animation accordingly.              */
/*                                           */
/* Blocked when start menu is visible        */
/* (prevents pausing before game starts).    */
/* ========================================= */

function handlePause() {
  // Don't pause while in menus
  if (document.getElementById('start-menu').style.display !== 'none') return;

  gameState.paused = !gameState.paused;

  if (gameState.paused) {
    showPause();
    setGrassState('static');
  } else {
    hidePause();
    setGrassState('moving');
  }
}