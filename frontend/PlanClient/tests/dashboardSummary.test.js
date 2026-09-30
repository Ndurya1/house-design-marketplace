import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOrders, summarizePlans } from '../src/lib/dashboardSummary.js';

const item = (title_snapshot, unit_price) => ({ title_snapshot, unit_price });

test('summarizes an empty dashboard without inventing sales', () => {
  assert.deepEqual(summarizePlans([]), { total: 0, statuses: { draft: 0, in_review: 0, published: 0 } });
  assert.deepEqual(summarizeOrders([]), { total: 0, completed: [], completedCount: 0, recent: [], revenue: 0, unknownPriceCount: 0 });
});

test('counts design statuses and totals completed order subtotals', () => {
  const plans = [{ status: 'draft' }, { status: 'in_review' }, { status: 'published' }, { status: 'published' }];
  const orders = [
    { reference: 'older', status: 'completed', created_at: '2026-01-01T00:00:00Z', subtotal: '1500.0000', items: [item('Plan A', '1500')] },
    { reference: 'pending', status: 'pending', created_at: '2026-01-03T00:00:00Z', subtotal: '900.0000', items: [item('Plan B', '900')] },
    { reference: 'newer', status: 'completed', created_at: '2026-02-01T00:00:00Z', subtotal: '2500.0000', items: [item('Plan C', '2500')] },
  ];

  assert.deepEqual(summarizePlans(plans), { total: 4, statuses: { draft: 1, in_review: 1, published: 2 } });
  const summary = summarizeOrders(orders);
  assert.equal(summary.total, 3);
  assert.equal(summary.completedCount, 2);
  assert.equal(summary.revenue, 4000);
  assert.deepEqual(summary.recent.map(order => order.reference), ['newer', 'older']);
});

test('marks gross sales unavailable when a completed item has no price', () => {
  const summary = summarizeOrders([{ status: 'completed', items: [item('Legacy plan', null)], subtotal: null }]);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.unknownPriceCount, 1);
  assert.equal(summary.revenue, null);
});

test('falls back to item prices when an order subtotal is absent', () => {
  const summary = summarizeOrders([{ status: 'completed', items: [item('A', '1000'), item('B', 250.5)] }]);
  assert.equal(summary.revenue, 1250.5);
});
