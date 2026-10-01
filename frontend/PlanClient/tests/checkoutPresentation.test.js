import test from 'node:test';
import assert from 'node:assert/strict';
import { canDownloadItem, canRetryPayment, checkoutPresentation, formatPaidAt, normalizeCheckoutStatus, shouldPollCheckout } from '../src/lib/checkoutPresentation.js';

test('normalizes malformed checkout responses without crashing the screen', () => {
  assert.deepEqual(normalizeCheckoutStatus({ status: 'unexpected', items: null }), { status: 'unknown', items: [] });
});

test('distinguishes polling, retryable, terminal, and support-required states', () => {
  assert.equal(shouldPollCheckout('pending'), true);
  assert.equal(shouldPollCheckout('paid'), false);
  assert.equal(canRetryPayment('failed'), true);
  assert.equal(canRetryPayment('unknown'), false);
  assert.equal(checkoutPresentation('needs_support').tone, 'warning');
});

test('only exposes downloads for server-authorized paid items', () => {
  assert.equal(canDownloadItem('paid', { grant_reference: 'grant-1', download_available: true }), true);
  assert.equal(canDownloadItem('paid', { grant_reference: null, download_available: true }), false);
  assert.equal(canDownloadItem('pending', { grant_reference: 'grant-1', download_available: true }), false);
});

test('formats valid receipt timestamps and safely handles malformed ones', () => {
  assert.equal(formatPaidAt('2026-10-01T12:30:00.000Z'), '2026-10-01 12:30:00 UTC');
  assert.equal(formatPaidAt('not-a-date'), 'Payment time unavailable');
});
