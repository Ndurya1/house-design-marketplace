const knownStatuses = new Set(['unpaid', 'initiating', 'pending', 'unknown', 'rejected', 'failed', 'paid', 'cancelled', 'needs_support']);

const presentations = {
  unpaid: { title: 'Ready for payment', description: 'Review the total, then start a new M-Pesa payment request.', tone: 'neutral', canPay: true },
  initiating: { title: 'Sending the payment request…', description: 'The payment request is being sent. Keep this page open.', tone: 'pending', polling: true },
  pending: { title: 'Check your phone', description: 'Approve the M-Pesa request, then wait here for server confirmation.', tone: 'pending', polling: true },
  unknown: { title: 'Payment confirmation is delayed', description: 'Keep this order reference and do not pay again while payment evidence is being reconciled.', tone: 'warning', polling: true },
  rejected: { title: 'Payment request was rejected', description: 'The payment request was rejected before confirmation. You can try again once.', tone: 'error', canPay: true },
  failed: { title: 'Payment was unsuccessful', description: 'The server did not confirm this payment attempt. You can try again.', tone: 'error', canPay: true },
  paid: { title: 'Payment confirmed', description: 'Your payment was confirmed by the server. Download access is shown per item below.', tone: 'success', paid: true },
  cancelled: { title: 'Order cancelled', description: 'This order is no longer payable. Keep the reference if you need support.', tone: 'error' },
  needs_support: { title: 'This order needs support', description: 'The order is not safely payable from this page. Keep the order reference and do not pay again.', tone: 'warning' },
};

export function normalizeCheckoutStatus(data) {
  if (!data || typeof data !== 'object') return null;
  const status = knownStatuses.has(data.status) ? data.status : 'unknown';
  return { ...data, status, items: Array.isArray(data.items) ? data.items : [] };
}

export function checkoutPresentation(status) {
  return presentations[status] || presentations.unknown;
}

export function shouldPollCheckout(status) {
  return checkoutPresentation(status).polling === true;
}

export function canRetryPayment(status) {
  return checkoutPresentation(status).canPay === true;
}

export function canDownloadItem(status, item) {
  return status === 'paid' && Boolean(item?.download_available && item?.grant_reference);
}

export function formatPaidAt(value) {
  if (!value) return 'Payment time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Payment time unavailable' : date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}
