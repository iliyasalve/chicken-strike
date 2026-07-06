# Chicken Strike

A browser arcade game: you are the Battle Chicken, the farm's last defender.
Shoot eggs at the forest creatures raiding the coop, collect power-ups, survive
long enough to face the boss. Runs in any modern browser, including as a
Telegram WebApp.

---

## Gameplay

- Move left/right, shoot eggs upward at falling enemies.
- Four enemy types with fixed stats — new, nastier ones join as your score grows:
  - 🐶 Feral dog — slow, one egg is enough
  - 😼 Sneaky cat — fast but fragile
  - 🐺 Wolf — slow tank, takes several eggs
  - 🦊 Fox — fast **and** tough
- Power-ups drop one at a time:
  - 🌽 Corn — permanent egg damage up
  - 🌶️ Pepper — temporary speed burst; enough peppers raise your speed permanently
  - 🌾 Wheat — restores 1 HP
- Enemies deal damage on contact; let 10 slip past and it's game over.
- At 1200 points the 👹 **boss** appears — and it zigzags.
- Global leaderboard (opt-in, GDPR consent) with anti-cheat verified sessions.

## Controls

| Input           | Action                    |
| --------------- | ------------------------- |
| Left Arrow / A  | Move left                 |
| Right Arrow / D | Move right                |
| Spacebar        | Shoot egg                 |
| P               | Pause / resume            |
| H               | Toggle debug hitboxes     |
| Touch buttons   | Move and shoot (mobile)   |

---

## Running locally

ES modules don't load from `file://` — serve the folder over HTTP:

```bash
python3 .claude/dev-server.py 8000   # no-cache dev server
# or any static server:
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## File structure

- `index.html` — canvas, HUD, menus, and modals
- `style.css` — all styling
- `js/config.js` — every tunable constant (enemy types & spawn phases, power-ups, boss, spawn intervals)
- `js/main.js` — game loop, screens, modal wiring
- `js/state.js` — mutable game state + reset
- `js/entities.js` — spawning, movement, and drawing of all entities
- `js/collision.js` — collision handling and combat rules
- `js/input.js` — keyboard and touch input
- `js/ui.js` — HUD updates, health bar, music control
- `js/music.js` — Web Audio SFX + background music
- `js/leaderboard.js` — Supabase leaderboard client, consent, anti-cheat session
- `supabase/` — Edge Functions (session, submit-score, delete-my-data)
- `assets/` — images and sounds

## Stack

- Vanilla JavaScript (ES modules), HTML5 canvas, CSS — no build step, no runtime dependencies.
- [Supabase](https://supabase.com) for the leaderboard (writes go through Edge
  Functions only; anti-cheat session tokens; RLS read-only tables).
- Telegram WebApp integration: nickname auto-fill and HMAC-verified identity.

## Customization

Game balance lives entirely in `js/config.js`: enemy types and their
spawn-phase weights, power-up effects and drop weights, boss stats, spawn
intervals, health and miss limits. Assets are plain files under `assets/`.

---

Enjoy the game and have fun shooting eggs! 🐔🥚🎯
