import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, cycleHpMult, patternChance, zigzagAmp, diveMult
} from '../js/config.js';

const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ~= ${b}`);

test('cycleHpMult: table lookup for waves within the table', () => {
  const t = CONFIG.CYCLE.hpMultipliers; // [1,2,3.5,5,6.5,8]
  t.forEach((mult, i) => close(cycleHpMult(i + 1), mult));
});

test('cycleHpMult: extrapolates linearly past the table', () => {
  // last step = 8 - 6.5 = 1.5
  close(cycleHpMult(7), 9.5);
  close(cycleHpMult(8), 11);
});

test('patternChance: zero before fromWave, then ramps and caps', () => {
  assert.equal(patternChance(1), 0);       // wave 1 is always straight
  close(patternChance(2), 0.25);
  close(patternChance(3), 0.40);
  close(patternChance(4), 0.55);
  close(patternChance(5), 0.70);
  close(patternChance(6), 0.80);           // cap
  close(patternChance(50), 0.80);          // stays capped
});

test('zigzagAmp: ramps from base and caps at max', () => {
  close(zigzagAmp(2), 50);
  close(zigzagAmp(3), 62);
  close(zigzagAmp(7), 100);                // 50+12*5=110 -> capped at 100
  close(zigzagAmp(99), 100);
});

test('diveMult: ramps from base and caps at max', () => {
  close(diveMult(2), 2.0);
  close(diveMult(5), 2.9);
  close(diveMult(7), 3.5);                 // 2+0.3*5=3.5 -> at cap
  close(diveMult(99), 3.5);
});

test('ramp helpers never exceed their configured caps', () => {
  for (let w = 1; w <= 60; w++) {
    assert.ok(patternChance(w) <= CONFIG.PATTERN.chanceMax + 1e-9);
    assert.ok(zigzagAmp(w) <= CONFIG.PATTERN.zigzag.ampMax + 1e-9);
    assert.ok(diveMult(w) <= CONFIG.PATTERN.dive.multMax + 1e-9);
  }
});
