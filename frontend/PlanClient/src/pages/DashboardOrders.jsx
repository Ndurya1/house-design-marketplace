import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOrders } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Feedback } from '@/components/ui/feedback';
import { formatPrice } from '@/lib/formatPrice';

const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

export default function DashboardOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getOrders(undefined, { signal: controller.signal })
      .then(setOrders)
      .catch(failure => { if (failure.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const retryOrders = () => {
    setLoading(true);
    setError(false);
    setReload(value => value + 1);
  };

  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-5xl">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to overview</Link>
      <div className="mt-6 flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Sales</h1><p className="mt-2 text-sm leading-6 text-slate-600">Orders containing your designs. Amounts use the seller’s immutable sale-item prices.</p></div>
        <Home aria-hidden="true" className="hidden h-7 w-7 text-primary sm:block" />
      </div>
      <section aria-live="polite" className="mt-8">
        {loading ? <Feedback kind="loading" title="Loading sales" description="Retrieving your seller orders." /> : error ? <Feedback kind="error" title="Could not load sales" description="Check your connection and try again." actionLabel="Try again" onAction={retryOrders} /> : orders.length === 0 ? <Feedback title="No sales yet" description="Completed orders containing your designs will appear here." /> : <div className="grid gap-4">{orders.map(order => <Card key={order.reference} className="bg-white"><CardContent className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">Order {String(order.reference).slice(0, 8)}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4" />{formatDate(order.created_at)}</p></div><Badge className="border-0 bg-slate-100 text-slate-700">{order.status}</Badge></div><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-700">{(order.items || []).map(item => item.title_snapshot).join(', ') || 'Design details unavailable'}</p><p className="mt-2 text-sm text-slate-600">{order.subtotal === null ? 'Amount unavailable' : formatPrice(order.subtotal)}</p></div></CardContent></Card>)}</div>}
      </section>
    </div>
  </main>;
}
