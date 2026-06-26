import test from 'node:test';
import assert from 'node:assert/strict';
import { parseIntegerEnv, parseCsvEnv, validateRequiredEnv } from '../src/shared/runtime-contract.js';

test('parseIntegerEnv falls back and enforces minimums', () => {
  process.env.TEST_INTEGER = '10';
  assert.equal(parseIntegerEnv('TEST_INTEGER', 5, 8), 10);

  process.env.TEST_INTEGER = '2';
  assert.equal(parseIntegerEnv('TEST_INTEGER', 5, 8), 8);

  process.env.TEST_INTEGER = 'nope';
  assert.equal(parseIntegerEnv('TEST_INTEGER', 5, 8), 5);

  delete process.env.TEST_INTEGER;
});

test('parseCsvEnv trims values and removes empties', () => {
  process.env.TEST_CSV = ' alpha, beta ,, gamma ';
  assert.deepEqual(parseCsvEnv('TEST_CSV'), ['alpha', 'beta', 'gamma']);
  delete process.env.TEST_CSV;
});

test('validateRequiredEnv returns only missing keys', () => {
  process.env.EXISTS = 'yes';
  delete process.env.MISSING_ONE;
  delete process.env.MISSING_TWO;

  assert.deepEqual(validateRequiredEnv(['EXISTS', 'MISSING_ONE', 'MISSING_TWO']), ['MISSING_ONE', 'MISSING_TWO']);
  delete process.env.EXISTS;
});
