import { Link } from 'react-router-dom';
import { getMediaUrl } from '@/api';

export const formatPrice = (price) => `Ksh ${Number(price).toLocaleString()}`;

export default function PlanCard({ plan }) {
  return <article className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
    <Link to={`/plan/${plan.id}`}>
      {plan.thumbnail ? <img src={getMediaUrl(plan.thumbnail)} alt={plan.title} className="h-52 w-full object-cover" />
        : <div className="h-52 bg-slate-200 flex items-center justify-center text-slate-500">No preview available</div>}
    </Link>
    <div className="p-5 space-y-3">
      <p className="text-xs uppercase tracking-wide text-blue-600">{plan.category_name}</p>
      <h2 className="text-xl font-semibold"><Link to={`/plan/${plan.id}`}>{plan.title}</Link></h2>
      <p className="font-bold">{formatPrice(plan.price)}</p>
      {plan.seller_name && <p className="text-sm text-slate-500">By {plan.seller_name}</p>}
      <p className="text-sm text-slate-600 line-clamp-2">{plan.description}</p>
      <Link to={`/plan/${plan.id}`} className="inline-block text-blue-700 underline">View Plan Details</Link>
    </div>
  </article>;
}
