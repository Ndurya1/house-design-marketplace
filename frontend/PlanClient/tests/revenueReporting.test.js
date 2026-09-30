import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoneyUnits, parseMoneyUnits, summarizeRevenue } from '../src/lib/revenueReporting.js';

const item = (title_snapshot, unit_price) => ({ title_snapshot, unit_price });

test('sums completed seller item prices exactly at four-decimal precision', () => {
  const summary = summarizeRevenue([
    { reference: 'a', status: 'completed', created_at: '2026-09-01T00:00:00Z', items: [item('A', '0.1000'), item('B', '0.2000')] },
    { reference: 'pending', status: 'pending', created_at: '2026-09-01T00:00:00Z', items: [item('Pending', '900.0000')] },
    { reference: 'cancelled', status: 'cancelled', created_at: '2026-09-01T00:00:00Z', items: [item('Cancelled', '500.0000')] },
  ]);
  assert.equal(summary.revenue, '0.3000');
  assert.equal(summary.completedOrderCount, 1);
  assert.equal(summary.itemCount, 2);
});

test('date filters are inclusive and keep source order rows linked', () => {
  const orders = [
    { reference: 'before', status: 'completed', created_at: '2026-08-31T23:59:59Z', items: [item('Before', '10.0000')] },
    { reference: 'start', status: 'completed', created_at: '2026-09-01T00:00:00Z', items: [item('Start', '20.0000')] },
    { reference: 'end', status: 'completed', created_at: '2026-09-30T23:59:59Z', items: [item('End', '30.0000')] },
    { reference: 'after', status: 'completed', created_at: '2026-10-01T00:00:00Z', items: [item('After', '40.0000')] },
  ];
  const summary = summarizeRevenue(orders, { from: '2026-09-01', to: '2026-09-30' });
  assert.equal(summary.revenue, '50.0000');
  assert.deepEqual(summary.rows.map(row => row.order.reference), ['start', 'end']);
});

test('missing historical prices make the affected report unavailable rather than zero', () => {
  const summary = summarizeRevenue([{ reference: 'legacy', status: 'completed', created_at: '2026-09-01T00:00:00Z', items: [item('Legacy', null)] }]);
  assert.equal(summary.completedOrderCount, 1);
  assert.equal(summary.unknownPriceCount, 1);
  assert.equal(summary.revenue, null);
  assert.equal(summary.rows[0].amount, null);
});

test('money parsing and formatting reject unsupported precision', () => {
  assert.equal(parseMoneyUnits('1000.1234'), 10001234n);
  assert.equal(formatMoneyUnits(10001234n), '1000.1234');
  assert.equal(parseMoneyUnits('10.12345'), null);
  assert.equal(parseMoneyUnits('-1.0000'), null);
});
