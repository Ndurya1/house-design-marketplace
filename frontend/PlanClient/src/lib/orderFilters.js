export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const filterOrders = (orders, status = 'all') => {
  const source = Array.isArray(orders) ? orders : [];
  if (status === 'all') return source;
  return source.filter(order => order?.status === status);
};

export const orderItems = order => Array.isArray(order?.items) ? order.items : [];
