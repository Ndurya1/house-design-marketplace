import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDesigns } from '../src/lib/designFilters.js';

const plans = [
  { id: 1, title: 'Modern Courtyard Home', description: 'Four bedrooms', category_name: 'Bungalows', status: 'draft' },
  { id: 2, title: 'Compact Starter Plan', description: 'Two bedrooms', category_name: 'Modern', status: 'published' },
  { id: 3, title: 'Office and Retail Block', description: 'Commercial layout', category_name: 'Commercial', status: 'in_review' },
];

test('filters designs by lifecycle status and searches descriptive fields', () => {
  assert.deepEqual(filterDesigns(plans, { status: 'draft' }).map(plan => plan.id), [1]);
  assert.deepEqual(filterDesigns(plans, { search: 'commercial' }).map(plan => plan.id), [3]);
  assert.deepEqual(filterDesigns(plans, { search: 'BEDROOMS' }).map(plan => plan.id), [1, 2]);
});

test('empty or all filters preserve the full seller-scoped list', () => {
  assert.deepEqual(filterDesigns(plans).map(plan => plan.id), [1, 2, 3]);
  assert.deepEqual(filterDesigns(plans, { search: 'missing' }), []);
});
