import { apiClient } from './index';

export const getOrders = (token) =>
  apiClient('/orders/', {
    method: 'GET',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

export const getOrderDetails = (id, token) =>
  apiClient(`/orders/${id}/`, {
    method: 'GET',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

export const createOrder = (orderData, token) =>
  apiClient('/orders/', {
    method: 'POST',
    body: JSON.stringify(orderData),
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

export const getOrderPaymentMethods = (id, token) =>
  apiClient(`/orders/${id}/payment-methods/`, {
    method: 'GET',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

// Reuse paymentData.idempotency_key when retrying the same initiation request.
export const triggerMpesaPayment = (paymentData, checkoutToken) =>
  apiClient('/payments/', {
    method: 'POST',
    // A valid guest token must not be blocked by an unrelated expired login token.
    authenticate: !checkoutToken,
    body: JSON.stringify(paymentData),
    headers: checkoutToken ? { 'X-Checkout-Token': checkoutToken } : {},
  });

const sessionOptions = (session) => ({
  authenticate: !session,
  headers: session ? { 'X-Checkout-Session': session } : {},
});

export const getCheckoutStatus = (reference, session, signal) =>
  apiClient(`/checkout/${reference}/`, { ...sessionOptions(session), signal });

export const getReceipt = (reference, session, signal) =>
  apiClient(`/checkout/${reference}/receipt/`, { ...sessionOptions(session), signal });

export const getDownloadToken = (reference, session) =>
  apiClient(`/downloads/${reference}/token/`, { ...sessionOptions(session), method: 'POST' });

export const downloadPurchasedPlan = (reference, token) =>
  apiClient(`/downloads/${reference}/`, {
    authenticate: false, headers: { 'X-Download-Token': token }, responseType: 'blob',
  });
