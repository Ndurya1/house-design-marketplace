export const DESIGN_STATUS_LABELS = {
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
};

export function summarizePlans(plans = []) {
  return plans.reduce((summary, plan) => {
    summary.total += 1;
    if (summary.statuses[plan.status] !== undefined) summary.statuses[plan.status] += 1;
    return summary;
  }, { total: 0, statuses: { draft: 0, in_review: 0, published: 0 } });
}

export function summarizeOrders(orders = []) {
  const completed = orders.filter(order => order.status === 'completed');
  const completedItems = completed.flatMap(order => order.items || []);
  const unknownPriceCount = completedItems.filter(item => item.unit_price === null || item.unit_price === undefined).length;
  const revenue = unknownPriceCount > 0 ? null : completed.reduce((total, order) => {
    if (order.subtotal !== undefined && order.subtotal !== null) return total + Number(order.subtotal);
    return total + (order.items || []).reduce((subtotal, item) => subtotal + Number(item.unit_price), 0);
  }, 0);
  const recent = [...completed].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  return { total: orders.length, completed, completedCount: completed.length, recent, revenue, unknownPriceCount };
}
