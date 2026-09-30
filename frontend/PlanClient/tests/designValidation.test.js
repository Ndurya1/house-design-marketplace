import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLAN_FILE_BYTES, MAX_THUMBNAIL_BYTES, validateDesignForm } from '../src/lib/designValidation.js';

const validFields = { title: 'Courtyard home', category: '1', price: '15000.0000' };

test('accepts unchanged four-decimal prices and rejects excessive precision', () => {
  assert.equal(validateDesignForm(validFields).valid, true);
  const result = validateDesignForm({ ...validFields, price: '15000.00001' });
  assert.match(result.fieldErrors.price, /4 decimal places/);
});

test('rejects missing required fields and prices below the minimum', () => {
  const result = validateDesignForm({ title: ' ', category: '', price: '0' });
  assert.deepEqual(result.fieldErrors, {
    title: 'A design title is required.',
    category: 'Choose a category.',
    price: 'Use a price of at least Ksh 0.01 with no more than 4 decimal places.',
  });
});

test('rejects invalid or oversized selected files before upload', () => {
  const result = validateDesignForm({
    ...validFields,
    thumbnailFile: { name: 'thumb.png', type: 'image/png', size: MAX_THUMBNAIL_BYTES + 1 },
    planFile: { name: 'plan.pdf', type: 'application/pdf', size: MAX_PLAN_FILE_BYTES + 1 },
  });
  assert.equal(result.fieldErrors.thumbnail, 'Thumbnails must be 5 MB or smaller.');
  assert.equal(result.fieldErrors.plan_file, 'Plan files must be 20 MB or smaller.');
  assert.equal(validateDesignForm({ ...validFields, planFile: { name: 'plan.txt', type: 'text/plain', size: 10 } }).valid, false);
});
