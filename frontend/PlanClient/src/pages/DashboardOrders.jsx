import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, ChevronRight, Filter, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOrders } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Feedback } from '@/components/ui/feedback';
import { formatPrice } from '@/lib/formatPrice';
import { filterOrders, ORDER_STATUS_LABELS, orderItems } from '@/lib/orderFilters';
import { useSession } from '@/lib/useSession';

const readList = value => Array.isArray(value) ? value : value?.results || [];
const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

const statusClass = status => ({
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
}[status] || 'bg-slate-100 text-slate-700');

export default function DashboardOrders() {
  const { user } = useSession();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    getOrders(undefined, { signal: controller.signal })
      .then(data => setOrders(readList(data)))
      .catch(failure => { if (failure.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, reload]);

  const visibleOrders = useMemo(() => filterOrders(orders, status), [orders, status]);

  const retryOrders = () => {
    setLoading(true);
    setError(false);
    setReload(value => value + 1);
  };

  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-5xl">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to overview</Link>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">Sales</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Orders containing your designs. Amounts use the immutable seller sale-item prices recorded when each order was created.</p></div>
        <Home aria-hidden="true" className="hidden h-7 w-7 shrink-0 text-primary sm:block" />
      </div>

      <section aria-labelledby="sales-list-heading" className="mt-8" aria-live="polite">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><h2 id="sales-list-heading" className="flex items-center gap-2 text-xl font-bold text-slate-900"><Filter aria-hidden="true" className="h-5 w-5 text-primary" />Order history</h2>{!loading && !error && <p className="mt-1 text-sm text-slate-500">Showing {visibleOrders.length} of {orders.length} seller orders</p>}</div>
          {!loading && !error && orders.length > 0 && <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">Status<select aria-label="Filter sales by status" value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value="all">All statuses</option>{Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        </div>

        {loading ? <Feedback kind="loading" title="Loading sales" description="Retrieving your seller orders." /> : error ? <Feedback kind="error" title="Could not load sales" description="Check your connection and try again." actionLabel="Try again" onAction={retryOrders} /> : orders.length === 0 ? <Feedback title="No sales yet" description="Orders containing your designs will appear here once they are created." /> : visibleOrders.length === 0 ? <Feedback title="No orders match this status" description="Choose another status to see more of your seller order history." actionLabel="Show all orders" onAction={() => setStatus('all')} /> : <div className="grid gap-4">{visibleOrders.map(order => {
          const items = orderItems(order);
          return <Card key={order.reference} className="border-0 bg-white shadow-sm"><CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Order reference</p><Link to={`/dashboard/orders/${order.reference}`} className="mt-1 block break-all text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{order.reference}</Link><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4 shrink-0" />{formatDate(order.created_at)}</p></div>
              <Badge className={`border-0 ${statusClass(order.status)}`}>{ORDER_STATUS_LABELS[order.status] || order.status || 'Status unavailable'}</Badge>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Purchased designs</p>{items.length > 0 ? <ul className="mt-2 grid gap-2">{items.map((item, index) => <li key={`${item.plan_id_snapshot}-${index}`} className="flex flex-wrap items-baseline justify-between gap-3 text-sm"><span className="min-w-0 break-words font-semibold text-slate-800">{item.title_snapshot || 'Design title unavailable'}</span><span className="shrink-0 text-slate-600">{item.unit_price === null ? 'Amount unavailable' : formatPrice(item.unit_price)}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Design details unavailable</p>}<div className="mt-4 flex flex-wrap items-baseline justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-sm font-semibold text-slate-700">Seller subtotal</span><span className="text-base font-bold text-slate-900">{order.subtotal === null ? 'Amount unavailable' : formatPrice(order.subtotal)}</span></div></div>
            <Link to={`/dashboard/orders/${order.reference}`} className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View order details <ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
          </CardContent></Card>;
        })}</div>}
      </section>
    </div>
  </main>;
}
