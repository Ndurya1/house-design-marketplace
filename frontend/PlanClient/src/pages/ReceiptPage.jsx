import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getReceipt } from '@/api';
import { formatPrice } from '@/lib/formatPrice';
import { formatPaidAt } from '@/lib/checkoutPresentation';
import { readSession } from '@/lib/checkoutSession';

export default function ReceiptPage() {
  const { reference } = useParams();
  return <ReceiptContent key={reference} reference={reference} />;
}

function ReceiptContent({ reference }) {
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getReceipt(reference, readSession(reference).session, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReceipt({ ...data, items: Array.isArray(data?.items) ? data.items : [] }); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message || 'The receipt could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reference, reload]);

  return <main className="min-h-screen bg-white px-6 py-10 text-slate-900 print:p-0">
    <div className="max-w-2xl mx-auto space-y-8">
      <Link className="text-blue-700 underline print:hidden" to={`/checkout/${reference}`}>Back to order</Link>
      <div><p className="font-bold text-blue-700">PlanSoko</p><h1 className="text-3xl font-bold mt-2">Payment receipt</h1><p className="mt-2 text-sm text-slate-600">This receipt is available only after server-confirmed payment.</p></div>
      {loading && <p role="status">Loading receipt…</p>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><p className="whitespace-pre-wrap">{error}</p><button type="button" onClick={() => { setLoading(true); setError(''); setReload(value => value + 1); }} className="mt-3 font-semibold underline print:hidden">Try again</button></div>}
      {receipt && <>
        <dl className="space-y-3 break-words">
          <div><dt className="text-sm text-slate-600">Order reference</dt><dd>{receipt.order_reference || reference}</dd></div>
          <div><dt className="text-sm text-slate-600">M-Pesa receipt</dt><dd>{receipt.mpesa_receipt || 'Receipt number unavailable'}</dd></div>
          <div><dt className="text-sm text-slate-600">Payment confirmed (UTC)</dt><dd>{formatPaidAt(receipt.paid_at)}</dd></div>
        </dl>
        <table className="w-full text-left border-collapse"><caption className="sr-only">Purchased plans and paid amounts</caption>
          <thead><tr className="border-b"><th className="py-3">Purchased plan</th><th className="py-3 text-right">Amount ({receipt.currency || 'KES'})</th></tr></thead>
          <tbody>{receipt.items.map((item, index) => <tr key={index} className="border-b break-inside-avoid"><td className="py-4 pr-4">{item.title || 'Plan details unavailable'}<span className="block text-sm text-slate-600">{item.designer || 'Designer unavailable'}</span></td><td className="py-4 text-right">{formatPrice(item.price)}</td></tr>)}</tbody>
          <tfoot><tr><th className="py-4">Total paid</th><td className="py-4 text-right font-bold">{formatPrice(receipt.total)}</td></tr></tfoot>
        </table>
        <p className="text-sm text-slate-600">Keep this receipt and your order reference for support.</p>
        <button type="button" onClick={() => window.print()} className="rounded bg-blue-700 text-white px-5 py-3 print:hidden">Print / Save as PDF</button>
      </>}
    </div>
  </main>;
}
