import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getOrderDetails } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Feedback } from '@/components/ui/feedback';
import { formatPrice } from '@/lib/formatPrice';
import { ORDER_STATUS_LABELS, orderItems } from '@/lib/orderFilters';
import { useSession } from '@/lib/useSession';

const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Date unavailable';
const statusClass = status => ({
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
}[status] || 'bg-slate-100 text-slate-700');

export default function DashboardOrderDetail() {
  const { reference } = useParams();
  const { user } = useSession();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorReference, setErrorReference] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    getOrderDetails(reference, { signal: controller.signal })
      .then(data => { setOrder(data); setErrorReference(null); })
      .catch(failure => { if (failure.name !== 'AbortError') setErrorReference(reference); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, reference, reload]);

  const retry = () => { setLoading(true); setErrorReference(null); setReload(value => value + 1); };
  const currentOrder = order?.reference === reference ? order : null;
  const requestError = errorReference === reference;
  const items = orderItems(currentOrder);

  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-4xl">
      <Link to="/dashboard/orders" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to sales</Link>
      <section aria-live="polite" className="mt-6">
        {loading || (!currentOrder && !requestError) ? <Feedback kind="loading" title="Loading order" description="Retrieving the seller-safe order details." /> : requestError || !currentOrder ? <Feedback kind="error" title="Order not found" description="This order is unavailable in your seller history." actionLabel="Try again" onAction={retry} /> : <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-primary">Seller order</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Order details</h1><p className="mt-2 break-all text-sm font-semibold text-slate-700">{currentOrder.reference}</p><p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4" />{formatDate(currentOrder.created_at)}</p></div><Badge className={`border-0 ${statusClass(currentOrder.status)}`}>{ORDER_STATUS_LABELS[currentOrder.status] || currentOrder.status || 'Status unavailable'}</Badge></div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <Card className="border-0 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex items-center gap-2"><FileText aria-hidden="true" className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold text-slate-900">Purchased designs</h2></div>{items.length > 0 ? <div className="mt-5 divide-y divide-slate-100 border-y border-slate-100">{items.map((item, index) => <div key={`${item.plan_id_snapshot}-${index}`} className="flex flex-wrap items-start justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold text-slate-900">{item.title_snapshot || 'Design title unavailable'}</p><p className="mt-1 text-sm text-slate-500">Historical seller price</p></div><p className="shrink-0 text-sm font-semibold text-slate-700">{item.unit_price === null ? 'Amount unavailable' : formatPrice(item.unit_price)}</p></div>)}</div> : <p className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">Design details are unavailable for this order.</p>}<div className="mt-5 flex flex-wrap items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Seller subtotal</span><span className="text-lg font-bold text-slate-900">{currentOrder.subtotal === null ? 'Amount unavailable' : formatPrice(currentOrder.subtotal)}</span></div></CardContent></Card>
            <Card className="h-fit border-0 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><h2 className="text-lg font-bold text-slate-900">Order summary</h2><dl className="mt-4 grid gap-4"><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{ORDER_STATUS_LABELS[currentOrder.status] || currentOrder.status || 'Unavailable'}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Currency</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{currentOrder.currency || 'Unavailable'}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Designs</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{items.length}</dd></div></dl><p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">This seller view shows only your purchased design items and their recorded sale prices.</p></CardContent></Card>
          </div>
        </>}
      </section>
    </div>
  </main>;
}
