# Chicken Strike

A browser arcade game: you are the Battle Chicken, the farm's last defender.
Shoot eggs at the forest creatures raiding the coop, collect power-ups, and
push through endless waves of escalating bosses. Runs in any modern browser,
including as a Telegram WebApp.

---

## Gameplay

- Move left/right, shoot eggs upward at falling enemies.
- Four enemy types with fixed stats — new, nastier ones join as your score grows:
  - 🐶 Feral dog — slow, one egg is enough
  - 😼 Sneaky cat — fast but fragile
  - 🐺 Wolf — slow tank, takes several eggs
  - 🦊 Fox — fast **and** tough
- **Movement patterns** — from wave 2 the slow enemies stop coming straight down:
  dogs weave in a zigzag and wolves lunge (dive-accelerate) near the bottom.
  The share and intensity ramp up each wave. Fast enemies (cat/fox) stay
  straight — their threat is already their speed.
- Power-ups drop one at a time:
  - 🌽 Corn — permanent egg damage up
  - 🌶️ Pepper — temporary speed burst; enough peppers raise your speed permanently
  - 🌾 Wheat — restores 1 HP
- Enemies deal damage on contact; let 10 slip past and it's game over.
- **Endless waves** — at 1200 points per cycle a 👹 **boss** appears (it
  ping-pongs across the field). Killing it doesn't end the run: the wave counter
  ticks up, some missed-enemy budget is repaired, enemy HP and spawn pace scale,
  and the next boss waits another 1200 points away. Survive as long as you can.
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

## Tests

Pure logic (collision math, power-up curve, formatters, HTML escaping) is unit
tested with Node's built-in runner — no dependencies to install:

```bash
npm test   # runs node --test over test/
```

## File structure

- `index.html` — canvas, HUD, menus, and modals
- `style.css` — all styling
- `js/config.js` — every tunable constant (enemy types & spawn phases, movement-pattern ramp, power-ups, boss, spawn intervals, endless-cycle scaling)
- `js/main.js` — game loop, wave/screen flow, modal wiring
- `js/state.js` — mutable game state + reset
- `js/entities.js` — spawning, movement (incl. zigzag/dive patterns), and drawing of all entities
- `js/collision.js` — collision handling and combat rules
- `js/spatial.js` — uniform-grid spatial hash for broad-phase collision
- `js/input.js` — keyboard and touch input
- `js/ui.js` — HUD updates, health bar, music control
- `js/music.js` — Web Audio SFX + background music
- `js/leaderboard.js` — Supabase leaderboard client, consent, anti-cheat session
- Pure, dependency-free helpers (unit-tested in isolation):
  - `js/geometry.js` — AABB collision test
  - `js/progression.js` — triangular power-up level curve
  - `js/format.js` — playtime / date formatters
  - `js/sanitize.js` — HTML escaping (stored-XSS defense)
- `supabase/` — Edge Functions (session, submit-score, delete-my-data)
- `.github/workflows/` — scheduled Supabase keep-alive ping
- `test/` — `node --test` unit tests for the pure helpers
- `assets/` — images and sounds

## Stack

- Vanilla JavaScript (ES modules), HTML5 canvas, CSS — no build step, no runtime dependencies.
- [Supabase](https://supabase.com) for the leaderboard (writes go through Edge
  Functions only; anti-cheat session tokens; RLS read-only tables).
- Telegram WebApp integration: nickname auto-fill and HMAC-verified identity.

## Customization

Game balance lives entirely in `js/config.js`: enemy types and their
spawn-phase weights, the movement-pattern ramp, power-up effects and drop
weights, boss stats, spawn intervals, endless-cycle scaling, health and miss
limits. Assets are plain files under `assets/`.

---

Enjoy the game and have fun shooting eggs! 🐔🥚🎯
