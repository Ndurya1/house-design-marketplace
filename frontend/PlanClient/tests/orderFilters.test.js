import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOrders, orderItems, ORDER_STATUS_LABELS } from '../src/lib/orderFilters.js';

const orders = [
  { reference: 'completed-order', status: 'completed', items: [{ title_snapshot: 'Courtyard home' }] },
  { reference: 'pending-order', status: 'pending', items: [{ title_snapshot: 'Starter home' }] },
  { reference: 'cancelled-order', status: 'cancelled' },
];

test('filters seller orders by status while preserving source order', () => {
  assert.deepEqual(filterOrders(orders), orders);
  assert.deepEqual(filterOrders(orders, 'completed').map(order => order.reference), ['completed-order']);
  assert.deepEqual(filterOrders(orders, 'pending').map(order => order.reference), ['pending-order']);
  assert.deepEqual(filterOrders(orders, 'unknown'), []);
});

test('normalizes missing order items and exposes readable lifecycle labels', () => {
  assert.deepEqual(orderItems({}), []);
  assert.equal(ORDER_STATUS_LABELS.completed, 'Completed');
  assert.equal(ORDER_STATUS_LABELS.pending, 'Pending');
  assert.equal(ORDER_STATUS_LABELS.cancelled, 'Cancelled');
});
