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

test('isColliding: works with negative coordinates (enemies spawn at y<0)', () => {
  // enemy just spawned above the top edge, chicken near it
  assert.equal(isColliding(box(-40, -40, 40, 40), box(-20, -20, 40, 40)), true);
  assert.equal(isColliding(box(-40, -40, 40, 40), box(-40, 40, 40, 40)), false);
});

test('isColliding: diagonally separated boxes do not collide', () => {
  assert.equal(isColliding(box(0, 0), box(20, 20)), false);
});

test('isColliding: x-ranges overlap but y-ranges do not -> no collision', () => {
  // the classic AABB trap: sharing one axis is not enough
  assert.equal(isColliding(box(0, 0, 100, 10), box(50, 50, 100, 10)), false);
});

test('isColliding: y-ranges overlap but x-ranges do not -> no collision', () => {
  assert.equal(isColliding(box(0, 0, 10, 100), box(50, 50, 10, 100)), false);
});

test('isColliding: asymmetric width/height boxes overlap correctly', () => {
  assert.equal(isColliding(box(0, 0, 200, 5), box(100, 2, 5, 5)), true);
});

test('isColliding: b positioned left/above a still detected', () => {
  // ensure detection is not order/direction dependent
  assert.equal(isColliding(box(50, 50, 20, 20), box(40, 40, 20, 20)), true);
});
