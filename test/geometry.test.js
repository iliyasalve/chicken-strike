import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isColliding } from '../js/geometry.js';

const box = (x, y, w = 10, h = 10) => ({ x, y, width: w, height: h });

test('isColliding: overlapping boxes collide', () => {
  assert.equal(isColliding(box(0, 0), box(5, 5)), true);
});

test('isColliding: identical boxes collide', () => {
  assert.equal(isColliding(box(0, 0), box(0, 0)), true);
});

test('isColliding: one box fully inside another collides', () => {
  assert.equal(isColliding(box(0, 0, 100, 100), box(40, 40, 10, 10)), true);
});

test('isColliding: separated horizontally do not collide', () => {
  assert.equal(isColliding(box(0, 0), box(20, 0)), false);
});

test('isColliding: separated vertically do not collide', () => {
  assert.equal(isColliding(box(0, 0), box(0, 20)), false);
});

test('isColliding: edge-touching on x is not an overlap (strict)', () => {
  // a spans [0,10), b starts at 10 -> shared edge, no overlap
  assert.equal(isColliding(box(0, 0), box(10, 0)), false);
});

test('isColliding: edge-touching on y is not an overlap (strict)', () => {
  assert.equal(isColliding(box(0, 0), box(0, 10)), false);
});

test('isColliding: 1px overlap on corner collides', () => {
  assert.equal(isColliding(box(0, 0), box(9, 9)), true);
});

test('isColliding: is symmetric', () => {
  const a = box(0, 0, 30, 30);
  const b = box(15, 15, 30, 30);
  assert.equal(isColliding(a, b), isColliding(b, a));
});
