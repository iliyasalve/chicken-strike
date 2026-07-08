/* ========================================= */
/* GEOMETRY                                  */
/* Pure, dependency-free collision math so    */
/* it can be unit-tested in isolation.        */
/* ========================================= */

/* ========================================= */
/* AABB COLLISION CHECK                      */
/* Axis-Aligned Bounding Box test.           */
/* Returns true if two rectangles overlap.   */
/* Both objects must have: x, y, width, height */
/* ========================================= */

export function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
