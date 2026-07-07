/* ========================================= */
/* SPATIAL HASH (SCALE-4)                    */
/* Uniform grid for broad-phase collision.   */
/* Entities are inserted each frame by AABB; */
/* queries return only candidates sharing a  */
/* cell, so egg-vs-enemy checks stop being   */
/* O(eggs × enemies). Cells and query arrays */
/* are reused across frames (no per-frame    */
/* allocation, matching SCALE-3).            */
/* The boss is NOT in the grid: it's a       */
/* singleton, checked directly.              */
/* ========================================= */

const CELL = 100;             // px; >= largest gridded entity (enemies/items are 40)
const cells = new Map();      // "cx,cy" -> array of entities (arrays reused)
let stamp = 0;                // query de-dup marker, bumped per query

export function resetGrid() {
  for (const arr of cells.values()) arr.length = 0;
}

export function insertGrid(e) {
  const x0 = Math.floor(e.x / CELL), x1 = Math.floor((e.x + e.width) / CELL);
  const y0 = Math.floor(e.y / CELL), y1 = Math.floor((e.y + e.height) / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const key = cx + ',' + cy;
      let cell = cells.get(key);
      if (!cell) cells.set(key, cell = []);
      cell.push(e);
    }
  }
}

/**
 * Fills `out` with unique entities whose cells overlap `box`.
 * Entities spanning several cells are de-duplicated via a stamp
 * field (cheaper than a Set, no allocation).
 */
export function queryGrid(box, out) {
  out.length = 0;
  stamp++;
  const x0 = Math.floor(box.x / CELL), x1 = Math.floor((box.x + box.width) / CELL);
  const y0 = Math.floor(box.y / CELL), y1 = Math.floor((box.y + box.height) / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const cell = cells.get(cx + ',' + cy);
      if (!cell) continue;
      for (const e of cell) {
        if (e._gridStamp === stamp) continue;
        e._gridStamp = stamp;
        out.push(e);
      }
    }
  }
  return out;
}
