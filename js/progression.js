/* ========================================= */
/* PROGRESSION                               */
/* Pure, dependency-free power-up math so it  */
/* can be unit-tested in isolation.           */
/* ========================================= */

/**
 * Triangular level-up curve: the Nth level costs N pickups, so the
 * cumulative cost to reach level L is 1+2+...+L = L(L+1)/2. Returns how
 * many levels `count` total pickups unlock.
 *
 * Examples: 0->0, 1->1, 2->1, 3->2, 5->2, 6->3, 10->4.
 *
 * @param {number} count - Total pickups collected
 * @returns {number} Levels unlocked
 */
export function triangularLevel(count) {
  let level = 0;
  let cost = 1;
  let left = count;
  while (left >= cost) {
    left -= cost;
    level++;
    cost++;
  }
  return level;
}
