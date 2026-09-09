import test from 'node:test';
import assert from 'node:assert/strict';
import { formatApiError, connectionError } from '../src/lib/apiErrors.js';
import { formatPrice } from '../src/lib/formatPrice.js';

test('nested field and list validation messages remain readable', () => {
  assert.equal(formatApiError({ items: [{ price: ['Must be positive.'] }], detail: 'Check your order.' }, 400),
    'items[1].price: Must be positive.\nCheck your order.');
});
test('server failure details are not exposed to the user', () => {
  assert.equal(formatApiError({ detail: 'Traceback with internal settings' }, 500),
    'The service is temporarily unavailable. Please try again shortly.');
});
test('non-JSON and empty errors have usable fallbacks', () => {
  assert.match(formatApiError(null, 401), /sign in again/);
  assert.match(formatApiError({}, 403), /access/);
  assert.match(formatApiError(null, 404), /not be found/);
  assert.match(formatApiError({}, 400), /check your details/);
  assert.match(formatApiError(null, 429), /wait/);
});
test('network failures advise checking payment status before retrying', () => {
  assert.match(connectionError().message, /refresh its status before retrying/);
});
test('missing prices are not represented as free and precision is preserved', () => {
  for (const value of [null, undefined, '', 'invalid']) assert.equal(formatPrice(value), 'Price unavailable');
  assert.equal(formatPrice('1000.1234'), 'Ksh 1,000.1234');
  assert.equal(formatPrice('0'), 'Ksh 0');
});
