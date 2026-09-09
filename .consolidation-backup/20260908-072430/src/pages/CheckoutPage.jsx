import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createOrder, getPlanDetails, getCheckoutStatus, triggerMpesaPayment, getDownloadToken, downloadPurchasedPlan } from '@/api';
import { formatPrice } from '@/components/PlanCard';

const storageKey = (reference) => `checkout:${reference}`;
const readSession = (reference) => {
  try { return JSON.parse(sessionStorage.getItem(storageKey(reference))) || {}; }
  catch { return {}; }
};
const labels = {
  unpaid: 'Ready for payment', initiating: 'Sending the payment request…',
  pending: 'Check your phone, then wait for payment confirmation.',
  unknown: 'Payment confirmation is delayed. Please keep this order reference and do not pay again.',
  rejected: 'The payment request was rejected. You can try again.',
  failed: 'Payment was unsuccessful. You can try again.', paid: 'Payment confirmed',
};

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
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function load() {
      try {
        if (planId) {
          const data = await getPlanDetails(planId, { signal: controller.signal });
          if (!controller.signal.aborted) { setPlan(data); setError(''); }
        } else {
          const data = await getCheckoutStatus(reference, readSession(reference).session, controller.signal);
          if (!controller.signal.aborted) {
            setStatus(data); setError('');
            if (['initiating', 'pending', 'unknown'].includes(data.status)) timer = setTimeout(load, 5000);
          }
        }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    }
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [planId, reference, refresh]);

  async function startOrder(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      // Check that this browser can retain the guest credentials before creating an order.
      sessionStorage.setItem('checkout:available', '1'); sessionStorage.removeItem('checkout:available');
      const fields = new FormData(event.currentTarget);
      const receipt = await createOrder({ guest_email: fields.get('email'), guest_phone: fields.get('phone'), plan_ids: [Number(planId)] });
      sessionStorage.setItem(storageKey(receipt.reference), JSON.stringify({ session: receipt.checkout_session, payment: receipt.checkout_token }));
      navigate(`/checkout/${receipt.reference}`, { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function pay() {
    setBusy(true); setError('');
    try {
      const session = readSession(reference);
      // Persist before dispatch: an uncertain network response must reuse this key.
      if (['failed', 'rejected'].includes(status.status) && session.retryFor !== status.attempt_reference) {
        delete session.key;
        session.retryFor = status.attempt_reference;
      }
      if (!session.key) session.key = crypto.randomUUID();
      sessionStorage.setItem(storageKey(reference), JSON.stringify(session));
      const result = await triggerMpesaPayment({ order_reference: reference, idempotency_key: session.key }, session.payment);
      if (['rejected', 'failed'].includes(result.status)) {
        delete session.key;
        sessionStorage.setItem(storageKey(reference), JSON.stringify(session));
      }
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function download(item) {
    setBusy(true); setError('');
    try {
      const { download_token } = await getDownloadToken(item.grant_reference, readSession(reference).session);
      const blob = await downloadPurchasedPlan(item.grant_reference, download_token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'purchased-plan.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const canPay = status && ['unpaid', 'rejected', 'failed'].includes(status.status);
  return <div className="min-h-screen flex flex-col"><Header />
    <main className="pt-28 pb-16 px-6 flex-1"><div className="max-w-2xl mx-auto space-y-6">
      <Link to="/plans" className="text-blue-700 underline">Browse plans</Link>
      <h1 className="text-3xl font-bold">Checkout</h1>
      {error && <p role="alert" className="text-red-700 whitespace-pre-wrap">{error}</p>}
      {plan && <form onSubmit={startOrder} className="space-y-5 bg-white p-6 rounded-xl">
        <h2 className="text-xl font-semibold">{plan.title}</h2><p>{formatPrice(plan.price)}</p>
        <label className="block">Email<input required type="email" name="email" autoComplete="email" className="block border rounded p-3 w-full" /></label>
        <label className="block">M-Pesa phone number<input required type="tel" name="phone" autoComplete="tel" placeholder="0712345678" className="block border rounded p-3 w-full" /></label>
        <p className="text-sm text-slate-600">Keep this browser tab open after checkout. Guest access lasts 24 hours; email recovery is not yet available.</p>
        <button disabled={busy} className="bg-blue-700 text-white rounded px-5 py-3 disabled:opacity-50">{busy ? 'Creating order…' : 'Continue to payment'}</button>
      </form>}
      {reference && <p className="break-all text-sm">Order reference: {reference}</p>}
      {status && <section className="space-y-5 bg-white p-6 rounded-xl">
        <h2 role="status" className="text-xl font-semibold">{labels[status.status] || status.status}</h2>
        <p>Total: {formatPrice(status.total)}</p>
        {status.items.map((item, index) => <div key={item.grant_reference || index} className="space-y-2 border-t pt-4">
          <p>{item.title}</p>
          {status.status === 'paid' && (item.download_available
            ? <button disabled={busy} onClick={() => download(item)} className="text-blue-700 underline disabled:opacity-50">Download PDF</button>
            : <p>Your payment is confirmed. This file is temporarily unavailable; keep your order reference for support. Do not pay again.</p>)}
        </div>)}
        {canPay && !status.payment_enabled && <p>M-Pesa payments are temporarily unavailable.</p>}
        {canPay && status.payment_enabled && <button disabled={busy} onClick={pay} className="bg-blue-700 text-white rounded px-5 py-3 disabled:opacity-50">{busy ? 'Requesting…' : 'Pay with M-Pesa'}</button>}
      </section>}
      {reference && <button disabled={busy} onClick={() => setRefresh((value) => value + 1)} className="text-blue-700 underline">Refresh status</button>}
      {!error && !plan && !status && <p role="status">Loading checkout…</p>}
    </div></main><Footer /></div>;
}
