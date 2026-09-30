import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, ChartNoAxesColumn, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOrders } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Feedback } from '@/components/ui/feedback';
import { formatPrice } from '@/lib/formatPrice';
import { summarizeRevenue } from '@/lib/revenueReporting';
import { useSession } from '@/lib/useSession';

const readList = value => Array.isArray(value) ? value : value?.results || [];
const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';
const emptyReport = { rows: [], completedOrderCount: 0, itemCount: 0, unknownPriceCount: 0, revenue: null };

export default function DashboardRevenue() {
  const { user } = useSession();
  const [orders, setOrders] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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

  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const report = useMemo(() => invalidRange ? emptyReport : summarizeRevenue(orders, { from: fromDate, to: toDate }), [orders, fromDate, toDate, invalidRange]);

  const retry = () => {
    setLoading(true);
    setError(false);
    setReload(value => value + 1);
  };

  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-5xl">
      <Link to="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to overview</Link>
      <div className="mt-6 flex items-start justify-between gap-4"><div className="min-w-0"><h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">Revenue report</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Gross seller sales from completed orders. This report uses immutable sale-item prices and does not represent a payout balance.</p></div><ChartNoAxesColumn aria-hidden="true" className="hidden h-7 w-7 shrink-0 text-primary sm:block" /></div>

      <section aria-labelledby="revenue-filters-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Calendar aria-hidden="true" className="h-5 w-5 text-primary" /><h2 id="revenue-filters-heading" className="text-lg font-bold text-slate-900">Report period</h2></div><p className="mt-1 text-sm text-slate-500">Only completed orders dated within this inclusive range are included. Leave both dates blank for all time.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="flex min-h-11 flex-col gap-1.5 text-sm font-semibold text-slate-700">From date<input aria-label="Revenue from date" type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" /></label><label className="flex min-h-11 flex-col gap-1.5 text-sm font-semibold text-slate-700">To date<input aria-label="Revenue to date" type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" /></label></div>{invalidRange && <p role="alert" className="mt-3 text-sm font-medium text-red-700">The from date must be on or before the to date.</p>}{(fromDate || toDate) && <button type="button" onClick={() => { setFromDate(''); setToDate(''); }} className="mt-4 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Clear dates</button>}</section>

      <section aria-labelledby="revenue-summary-heading" className="mt-8" aria-live="polite"><h2 id="revenue-summary-heading" className="sr-only">Revenue summary</h2>{loading ? <Feedback kind="loading" title="Loading revenue" description="Retrieving your seller orders." /> : error ? <Feedback kind="error" title="Could not load revenue" description="Check your connection and try again." actionLabel="Try again" onAction={retry} /> : <><div className="grid gap-4 sm:grid-cols-3"><Card className="border-0 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gross sales</p><p className="mt-2 break-words text-2xl font-bold text-slate-900">{report.revenue === null ? 'Unavailable' : formatPrice(report.revenue)}</p><p className="mt-1 text-xs text-slate-500">KES · completed seller items</p></CardContent></Card><Card className="border-0 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed orders</p><p className="mt-2 text-2xl font-bold text-slate-900">{report.completedOrderCount}</p><p className="mt-1 text-xs text-slate-500">Orders in this period</p></CardContent></Card><Card className="border-0 bg-white shadow-sm"><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Designs sold</p><p className="mt-2 text-2xl font-bold text-slate-900">{report.itemCount}</p><p className="mt-1 text-xs text-slate-500">Immutable seller items</p></CardContent></Card></div>{report.unknownPriceCount > 0 && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">Gross sales are unavailable because {report.unknownPriceCount} completed seller item{report.unknownPriceCount === 1 ? '' : 's'} has no recorded historical price.</p>}

        <div className="mt-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold text-slate-900"><ReceiptText aria-hidden="true" className="h-5 w-5 text-primary" />Completed sales breakdown</h2><Link to="/dashboard/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View order history</Link></div>{invalidRange ? <Feedback title="Choose a valid date range" description="Adjust the dates to view the completed sales breakdown." /> : report.rows.length === 0 ? <Feedback title="No completed sales in this period" description="Completed seller orders will appear here when they match the selected dates." /> : <div className="grid gap-4">{report.rows.map(row => <Card key={row.order.reference} className="border-0 bg-white shadow-sm"><CardContent className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><Link to={`/dashboard/orders/${row.order.reference}`} className="break-all text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{row.order.reference}</Link><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4 shrink-0" />{formatDate(row.order.created_at)}</p></div><Badge className="border-0 bg-green-100 text-green-800">Completed</Badge></div><div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Purchased designs</p><p className="mt-2 break-words text-sm font-semibold text-slate-800">{(row.order.items || []).map(item => item.title_snapshot).join(', ') || 'Design details unavailable'}</p><div className="mt-4 flex flex-wrap items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-700">Seller gross sale</span><span className="text-base font-bold text-slate-900">{row.amount === null ? 'Amount unavailable' : formatPrice(row.amount)}</span></div></div></CardContent></Card>)}</div>}</div></>}</section>
    </div>
  </main>;
}
