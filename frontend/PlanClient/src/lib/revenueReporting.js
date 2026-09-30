const SCALE = 10000n;
const MONEY_PATTERN = /^(\d+)(?:\.(\d{1,4}))?$/;

export const parseMoneyUnits = value => {
  if (value === null || value === undefined || value === '') return null;
  const match = String(value).trim().match(MONEY_PATTERN);
  if (!match) return null;
  return BigInt(match[1]) * SCALE + BigInt((match[2] || '').padEnd(4, '0'));
};

export const formatMoneyUnits = units => {
  if (units === null || units === undefined) return null;
  const sign = units < 0n ? '-' : '';
  const absolute = units < 0n ? -units : units;
  return `${sign}${absolute / SCALE}.${(absolute % SCALE).toString().padStart(4, '0')}`;
};

export const orderDateKey = value => {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const withinDateRange = (date, from, to) => {
  if (from && (!date || date < from)) return false;
  if (to && (!date || date > to)) return false;
  return true;
};

const summarizeOrder = order => {
  const items = Array.isArray(order?.items) ? order.items : [];
  let amount = 0n;
  let unknownPriceCount = 0;
  for (const item of items) {
    const units = parseMoneyUnits(item.unit_price);
    if (units === null) unknownPriceCount += 1;
    else amount += units;
  }
  return {
    order,
    date: orderDateKey(order?.created_at),
    itemCount: items.length,
    unknownPriceCount,
    amount: unknownPriceCount > 0 ? null : formatMoneyUnits(amount),
  };
};

export function summarizeRevenue(orders = [], { from = '', to = '' } = {}) {
  const eligible = (Array.isArray(orders) ? orders : [])
    .filter(order => order?.status === 'completed')
    .filter(order => withinDateRange(orderDateKey(order?.created_at), from, to))
    .map(summarizeOrder);
  const unknownPriceCount = eligible.reduce((total, row) => total + row.unknownPriceCount, 0);
  const itemCount = eligible.reduce((total, row) => total + row.itemCount, 0);
  const totalUnits = eligible.reduce((total, row) => {
    const units = row.amount === null ? null : parseMoneyUnits(row.amount);
    return units === null ? total : total + units;
  }, 0n);
  return {
    rows: eligible,
    completedOrderCount: eligible.length,
    itemCount,
    unknownPriceCount,
    revenue: unknownPriceCount > 0 ? null : formatMoneyUnits(totalUnits),
  };
}
