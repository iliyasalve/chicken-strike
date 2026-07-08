import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPlaytime, formatDate } from '../js/format.js';

test('formatPlaytime: 0 seconds', () => {
  assert.equal(formatPlaytime(0), '0s');
});

test('formatPlaytime: under a minute shows seconds only', () => {
  assert.equal(formatPlaytime(45), '45s');
  assert.equal(formatPlaytime(59), '59s');
});

test('formatPlaytime: exactly one minute', () => {
  assert.equal(formatPlaytime(60), '1m 0s');
});

test('formatPlaytime: minutes and seconds', () => {
  assert.equal(formatPlaytime(135), '2m 15s');
});

test('formatPlaytime: large value', () => {
  assert.equal(formatPlaytime(3661), '61m 1s');
});

test('formatDate: returns a non-empty string for a valid ISO timestamp', () => {
  const out = formatDate('2026-07-08T00:47:00Z');
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0);
});
