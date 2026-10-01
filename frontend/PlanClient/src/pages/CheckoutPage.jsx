import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createOrder, getPlanDetails, getCheckoutStatus, triggerMpesaPayment, getDownloadToken, downloadPurchasedPlan } from '@/api';
import { formatPrice } from '@/lib/formatPrice';
import { canDownloadItem, canRetryPayment, checkoutPresentation, normalizeCheckoutStatus, shouldPollCheckout } from '@/lib/checkoutPresentation';
import { readSession, storageKey } from '@/lib/checkoutSession';

export default function CheckoutPage() {
  const { planId, reference } = useParams();
  return <CheckoutContent key={reference || `new-${planId}`} planId={planId} reference={reference} />;
}

function CheckoutContent({ planId, reference }) {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(Boolean(reference));
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer;

    async function load() {
      if (reference) setStatusLoading(true);
      try {
        if (planId) {
          const data = await getPlanDetails(planId, { signal: controller.signal });
          if (!controller.signal.aborted) { setPlan(data); setError(''); }
        } else {
          const data = normalizeCheckoutStatus(await getCheckoutStatus(reference, readSession(reference).session, controller.signal));
          if (!controller.signal.aborted) {
            setStatus(data);
            setError('');
            if (data && shouldPollCheckout(data.status)) timer = setTimeout(load, 5000);
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Checkout status could not be loaded.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setStatusLoading(false);
        }
      }
    }

    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [planId, reference, refresh]);

  async function startOrder(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      sessionStorage.setItem('checkout:available', '1'); sessionStorage.removeItem('checkout:available');
      const fields = new FormData(event.currentTarget);
      const receipt = await createOrder({ guest_email: fields.get('email'), guest_phone: fields.get('phone'), plan_ids: [Number(planId)] });
      sessionStorage.setItem(storageKey(receipt.reference), JSON.stringify({ session: receipt.checkout_session, payment: receipt.checkout_token }));
      navigate(`/checkout/${receipt.reference}`, { replace: true });
    } catch (err) { setError(err.message || 'The order could not be created.'); }
    finally { setBusy(false); }
  }

  async function pay() {
    if (!status || !canRetryPayment(status.status)) return;
    setBusy(true); setError('');
    try {
      const session = readSession(reference);
      if (['failed', 'rejected'].includes(status.status) && session.retryFor !== status.attempt_reference) {
        delete session.key;
        session.retryFor = status.attempt_reference;
      }
      if (!session.key) session.key = crypto.randomUUID();
      sessionStorage.setItem(storageKey(reference), JSON.stringify(session));
      const result = normalizeCheckoutStatus(await triggerMpesaPayment({ order_reference: reference, idempotency_key: session.key }, session.payment));
      if (result && ['rejected', 'failed'].includes(result.status)) {
        delete session.key;
        sessionStorage.setItem(storageKey(reference), JSON.stringify(session));
      }
      setRefresh(value => value + 1);
    } catch (err) { setError(err.message || 'The payment request could not be sent. Refresh status before trying again.'); }
    finally { setBusy(false); }
  }

  async function download(item) {
    if (!canDownloadItem(status?.status, item) || downloading) return;
    setDownloading(item.grant_reference); setError('');
    try {
      const { download_token: token } = await getDownloadToken(item.grant_reference, readSession(reference).session);
      const blob = await downloadPurchasedPlan(item.grant_reference, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'purchased-plan.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message || 'This download could not be authorized. Refresh status and try again.'); }
    finally { setDownloading(null); }
  }

  const presentation = status ? checkoutPresentation(status.status) : null;
  const canPay = status && canRetryPayment(status.status);

  return <div className="min-h-screen flex flex-col"><Header />
    <main className="pt-28 pb-16 px-6 flex-1"><div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-4"><Link to="/plans" className="text-blue-700 underline">Browse plans</Link><Link to="/help" className="text-blue-700 underline">Need payment or download help?</Link></div>
      <h1 className="text-3xl font-bold">Checkout</h1>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><p className="whitespace-pre-wrap">{error}</p>{reference && <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-3 font-semibold underline">Try again</button>}</div>}
      {loading && <p role="status">{planId ? 'Loading plan…' : 'Loading checkout status…'}</p>}
      {plan && <form onSubmit={startOrder} className="space-y-5 bg-white p-6 rounded-xl">
        <h2 className="text-xl font-semibold">{plan.title}</h2><p>{formatPrice(plan.price)}</p>
        <label className="block">Email<input required type="email" name="email" autoComplete="email" className="block border rounded p-3 w-full" /></label>
        <label className="block">M-Pesa phone number<input required type="tel" name="phone" autoComplete="tel" placeholder="0712345678" className="block border rounded p-3 w-full" /></label>
        <p className="text-sm text-slate-600">Keep this browser tab open after checkout. Guest access lasts 24 hours; email recovery is not yet available.</p>
        <button type="submit" disabled={busy} className="bg-blue-700 text-white rounded px-5 py-3 disabled:opacity-50">{busy ? 'Creating order…' : 'Continue to payment'}</button>
      </form>}
      {reference && <p className="break-all text-sm">Order reference: {reference}</p>}
      {status && presentation && <section aria-live="polite" className="space-y-5 bg-white p-6 rounded-xl">
        <div className={`rounded-lg border p-4 ${presentation.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : presentation.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : presentation.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
          <h2 className="text-xl font-semibold">{presentation.title}</h2><p className="mt-1 text-sm">{presentation.description}</p>
        </div>
        {statusLoading && <p role="status" className="text-sm text-slate-600">Checking the latest server status…</p>}
        <p>Total: {formatPrice(status.total)}</p>
        {status.status === 'paid' && <Link to={`/checkout/${reference}/receipt`} className="block text-blue-700 underline">View payment receipt</Link>}
        {status.items.map((item, index) => <div key={item.grant_reference || item.title || index} className="space-y-2 border-t pt-4">
          <p>{item.title || 'Purchased plan'}</p>
          {status.status === 'paid' && (canDownloadItem(status.status, item)
            ? <button type="button" disabled={Boolean(downloading)} onClick={() => download(item)} className="text-blue-700 underline disabled:opacity-50">{downloading === item.grant_reference ? 'Authorizing download…' : 'Download PDF'}</button>
            : <p className="text-sm text-slate-600">Your payment is confirmed, but this file is temporarily unavailable. Keep your order reference for support and do not pay again.</p>)}
        </div>)}
        {canPay && !status.payment_enabled && <p className="text-sm text-amber-800">M-Pesa payments are temporarily unavailable. Refresh later; do not create another order.</p>}
        {canPay && status.payment_enabled && <button type="button" disabled={busy || statusLoading} onClick={pay} className="bg-blue-700 text-white rounded px-5 py-3 disabled:opacity-50">{busy ? 'Requesting…' : 'Pay with M-Pesa'}</button>}
      </section>}
      {reference && status && <button type="button" disabled={busy || statusLoading} onClick={() => setRefresh(value => value + 1)} className="text-blue-700 underline disabled:opacity-50">{statusLoading ? 'Refreshing status…' : 'Refresh status'}</button>}
      {reference && !status && !loading && <p role="status" className="text-slate-600">The checkout status is not available yet. Use Try again or keep your order reference for support.</p>}
    </div></main><Footer /></div>;
}
