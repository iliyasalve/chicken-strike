import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../js/sanitize.js';

test('escapeHtml: neutralizes a script-injection username (SEC-1)', () => {
  assert.equal(
    escapeHtml('<img src=x onerror=alert(1)>'),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
});

test('escapeHtml: escapes each special character', () => {
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('<'), '&lt;');
  assert.equal(escapeHtml('>'), '&gt;');
  assert.equal(escapeHtml('"'), '&quot;');
  assert.equal(escapeHtml("'"), '&#39;');
});

test('escapeHtml: escapes all occurrences, not just the first', () => {
  assert.equal(escapeHtml('<<>>'), '&lt;&lt;&gt;&gt;');
});

test('escapeHtml: ampersand is escaped before it could double-encode', () => {
  // "&lt;" as literal input must become "&amp;lt;", not "&lt;"
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml: leaves safe text untouched', () => {
  assert.equal(escapeHtml('PlayerOne_123'), 'PlayerOne_123');
});

test('escapeHtml: coerces non-string values to string', () => {
  assert.equal(escapeHtml(1200), '1200');
  assert.equal(escapeHtml(null), 'null');
  assert.equal(escapeHtml(undefined), 'undefined');
});

test('escapeHtml: empty string stays empty', () => {
  assert.equal(escapeHtml(''), '');
});
