# Chicken Strike

A fun and interactive browser game where you control a chicken that shoots eggs to defeat falling enemies and collect power-ups.

---

## Gameplay

- Move the chicken left and right using arrow keys or A/D keys.
- Shoot eggs with the Spacebar or on-screen shoot button.
- Avoid letting enemies fall past you; too many missed enemies will end the game.
- Collect corn 🌽 to temporarily boost speed and increase egg damage.
- Collect wheat 🌾 to restore health.
- Manage your health and score to survive as long as possible.
- Pause the game with the **P** key.
- Enjoy background music and sound effects, with options to toggle them on/off.

---

## Features

- Responsive canvas with automatic resizing.
- Increasing difficulty as score grows (enemies move faster and get tougher).
- Multiple enemy types represented by emojis.
- Power-ups for speed and health.
- Sound effects for shooting, damage, eating, and game over.
- High score saved locally in browser storage.
- On-screen buttons for touch controls.

---

## Controls

| Input          | Action                     |
| -------------- | -------------------------- |
| Left Arrow / A | Move chicken left          |
| Right Arrow / D| Move chicken right         |
| Spacebar       | Shoot egg                  |
| P              | Pause / resume game        |
| Touch buttons  | Move left/right and shoot  |

---

## Installation & Usage

1. Clone or download this repository.
2. Open `index.html` in a modern web browser.
3. Use the on-screen buttons or keyboard to play.

---

## File Structure

- `index.html` — Main HTML file containing the canvas and UI elements.
- `style.css` — Stylesheet for the game interface.
- `game.js` — Main JavaScript game logic.
- `assets/` — Folder containing images and sound files.

---

## Dependencies

- None. Pure vanilla JavaScript, HTML5, and CSS3.

---

## Customization

- Adjust constants in `game.js` such as:
  - `CHICKEN_SPEED`
  - `ENEMY_SPEED`
  - `SPAWN_INTERVAL`
  - Sound volume levels
- Replace assets in the `assets/` folder for custom graphics or sounds.

---

Enjoy the game and have fun shooting eggs! 🐔🥚🎯
