import test from 'node:test';
import assert from 'node:assert/strict';
import { firstSellerProfile, normalizeSellerProfile, validateSellerProfile } from '../src/lib/profileSettings.js';

test('normalizes the supported seller profile fields and excludes identifiers', () => {
  assert.deepEqual(normalizeSellerProfile({ id: 7, user: 12, phone: null, bio: undefined, avatar: '/media/avatar.png' }), {
    id: 7,
    phone: '',
    bio: '',
    avatar: '/media/avatar.png',
  });
});

test('reads the first seller profile from list and paginated responses', () => {
  assert.equal(firstSellerProfile([{ id: 4, phone: '0712345678' }]).id, 4);
  assert.equal(firstSellerProfile({ results: [{ id: 5, phone: '0712345679' }] }).id, 5);
  assert.equal(firstSellerProfile({ id: 6, phone: '0712345680' }).id, 6);
  assert.equal(firstSellerProfile([]), null);
});

test('requires a phone number but allows an optional bio', () => {
  assert.deepEqual(validateSellerProfile({ phone: '', bio: '' }), { phone: 'Phone number is required.' });
  assert.deepEqual(validateSellerProfile({ phone: '0712345678', bio: '' }), {});
});

test('matches the backend phone length constraint', () => {
  assert.deepEqual(validateSellerProfile({ phone: '1234567890123456' }), { phone: 'Phone number must be 15 characters or fewer.' });
  assert.deepEqual(validateSellerProfile({ phone: ' 0712345678 ' }), {});
});
