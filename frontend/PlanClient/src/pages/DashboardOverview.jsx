import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, DollarSign, Grid, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Feedback } from '@/components/ui/feedback';
import { useSession } from '@/lib/useSession';
import { DESIGN_STATUS_LABELS, summarizeOrders, summarizePlans } from '@/lib/dashboardSummary';
import { formatPrice } from '@/lib/formatPrice';
import { getMyPlans, getOrders } from '@/api';

const readList = value => Array.isArray(value) ? value : value?.results || [];
const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [plansReload, setPlansReload] = useState(0);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersReload, setOrdersReload] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    getMyPlans({ signal: controller.signal })
      .then(data => setPlans(readList(data)))
      .catch(failure => { if (failure.name !== 'AbortError') setPlansError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoadingPlans(false); });
    return () => controller.abort();
  }, [user, plansReload]);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    getOrders(undefined, { signal: controller.signal })
      .then(data => setOrders(readList(data)))
      .catch(failure => { if (failure.name !== 'AbortError') setOrdersError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOrders(false); });
    return () => controller.abort();
  }, [user, ordersReload]);

  const retryPlans = () => {
    setPlansError(false);
    setLoadingPlans(true);
    setPlansReload(value => value + 1);
  };

  const retryOrders = () => {
    setOrdersError(false);
    setLoadingOrders(true);
    setOrdersReload(value => value + 1);
  };

  const planSummary = summarizePlans(plans);
  const orderSummary = summarizeOrders(orders);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <button type="button" onClick={() => navigate('/')} className="mb-6 hidden min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to home</button>
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0"><h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 md:text-4xl">Welcome back, {user?.name || 'Seller'}!</h1><p className="mt-1 text-sm text-slate-500">Here&apos;s an overview of your store.</p></div><Link to="/dashboard/designs" className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Upload a design</Link></div>

        <h2 className="mb-6 text-xl font-bold text-slate-800">Overview</h2>
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="overflow-hidden bg-white"><CardContent className="flex items-center justify-between gap-4 p-6"><div className="min-w-0"><p className="text-3xl font-semibold text-slate-800">{loadingPlans ? '...' : plansError ? 'Unavailable' : planSummary.total}</p><p className="text-sm font-semibold tracking-wider text-slate-900">Designs</p><p className="text-xs text-slate-500">All-time uploaded designs</p></div><div className="shrink-0 rounded-full bg-primary p-3 text-white"><Grid aria-hidden="true" className="h-6 w-6" /></div></CardContent></Card>
          <Card className="overflow-hidden bg-white"><CardContent className="flex items-center justify-between gap-4 p-6"><div className="min-w-0"><p className="text-3xl font-semibold text-slate-800">{loadingOrders ? '...' : ordersError ? 'Unavailable' : orderSummary.completedCount}</p><p className="text-sm font-semibold tracking-wider text-slate-900">Completed orders</p><p className="text-xs text-slate-500">All-time completed sales</p></div><div className="shrink-0 rounded-full bg-primary p-3 text-white"><TrendingUp aria-hidden="true" className="h-6 w-6" /></div></CardContent></Card>
          <Card className="overflow-hidden bg-white"><CardContent className="flex items-center justify-between gap-4 p-6"><div className="min-w-0"><p className="break-words text-3xl font-semibold text-slate-800">{loadingOrders ? '...' : ordersError || orderSummary.revenue === null ? 'Unavailable' : formatPrice(orderSummary.revenue)}</p><p className="text-sm font-semibold tracking-wider text-slate-900">Gross sales</p><p className="text-xs text-slate-500">All-time completed order value</p><Link to="/dashboard/revenue" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View revenue report</Link></div><div className="shrink-0 rounded-full bg-primary p-3 text-white"><DollarSign aria-hidden="true" className="h-6 w-6" /></div></CardContent></Card>
        </div>

        <section aria-labelledby="design-status-heading" className="mb-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="design-status-heading" className="text-lg font-bold text-slate-800">Design status</h2><div className="flex flex-wrap items-center gap-2">{plansError && <button type="button" onClick={retryPlans} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry</button>}<Link to="/dashboard/designs" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Manage designs</Link></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{Object.entries(DESIGN_STATUS_LABELS).map(([status, label]) => <Card key={status} className="bg-white"><CardContent className="p-5"><p className="text-2xl font-semibold text-slate-900">{loadingPlans ? '...' : plansError ? '—' : planSummary.statuses[status]}</p><p className="mt-1 text-sm text-slate-600">{label}</p></CardContent></Card>)}</div></section>

        <section aria-labelledby="recent-sales-heading" className="mb-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="recent-sales-heading" className="text-lg font-bold text-slate-800">Recent sales</h2><Link to="/dashboard/orders" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View all sales <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>{loadingOrders ? <Feedback kind="loading" title="Loading recent sales" description="Retrieving your seller orders." /> : ordersError ? <Feedback kind="error" title="Could not load recent sales" description="Check your connection and try again." actionLabel="Try again" onAction={retryOrders} /> : orderSummary.recent.length === 0 ? <Feedback title="No completed sales yet" description="Completed orders containing your designs will appear here." /> : <div className="grid gap-4">{orderSummary.recent.map(order => <Card key={order.reference} className="bg-white"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{(order.items || []).map(item => item.title_snapshot).join(', ') || 'Design details unavailable'}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4" />{formatDate(order.created_at)}<span aria-hidden="true">·</span><span>Order {String(order.reference).slice(0, 8)}</span></p></div><p className="shrink-0 text-sm font-semibold text-slate-700">{order.subtotal === null ? 'Amount unavailable' : formatPrice(order.subtotal)}</p></div></CardContent></Card>)}</div>}{!loadingOrders && !ordersError && orderSummary.unknownPriceCount > 0 && <p className="mt-3 text-sm text-amber-700">Gross sales are unavailable because {orderSummary.unknownPriceCount} completed sale item{orderSummary.unknownPriceCount === 1 ? '' : 's'} has no recorded price.</p>}</section>

        <nav aria-label="Overview shortcuts" className="mb-8 flex flex-wrap gap-3 border-b border-slate-200 pb-4"><Link to="/dashboard/designs" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Grid aria-hidden="true" className="h-4 w-4" />My Designs</Link></nav>
      </div>
    </div>
  );
}
