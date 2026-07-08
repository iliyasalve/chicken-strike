import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triangularLevel } from '../js/progression.js';

test('triangularLevel: zero pickups is level 0', () => {
  assert.equal(triangularLevel(0), 0);
});

test('triangularLevel: thresholds are the triangular numbers 1,3,6,10', () => {
  // level N unlocks at 1+2+...+N total
  assert.equal(triangularLevel(1), 1);   // 1 -> L1
  assert.equal(triangularLevel(2), 1);   // still L1
  assert.equal(triangularLevel(3), 2);   // 1+2 -> L2
  assert.equal(triangularLevel(5), 2);   // still L2
  assert.equal(triangularLevel(6), 3);   // 1+2+3 -> L3
  assert.equal(triangularLevel(9), 3);   // still L3
  assert.equal(triangularLevel(10), 4);  // 1+2+3+4 -> L4
});

test('triangularLevel: matches the closed-form L(L+1)/2 boundary', () => {
  for (let level = 1; level <= 20; level++) {
    const threshold = (level * (level + 1)) / 2;
    assert.equal(triangularLevel(threshold), level, `at exactly ${threshold}`);
    assert.equal(triangularLevel(threshold - 1), level - 1, `just below ${threshold}`);
  }
});

test('triangularLevel: is monotonic non-decreasing', () => {
  let prev = 0;
  for (let n = 0; n <= 100; n++) {
    const lvl = triangularLevel(n);
    assert.ok(lvl >= prev, `n=${n} dropped from ${prev} to ${lvl}`);
    prev = lvl;
  }
});

test('triangularLevel: negative input is level 0 (robustness)', () => {
  assert.equal(triangularLevel(-1), 0);
  assert.equal(triangularLevel(-100), 0);
});
