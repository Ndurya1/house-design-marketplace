import { Link } from 'react-router-dom';
import PlanImage from '@/components/PlanImage';
import { formatPrice } from '@/lib/formatPrice';
import { formatPlanMetadata } from '@/lib/planMetadata';

export default function PlanCard({ plan }) {
  const metadata = formatPlanMetadata(plan);
  return <article className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
    <Link to={`/plan/${plan.id}`}>
      <PlanImage path={plan.thumbnail} alt={plan.title} className="h-52 w-full object-cover" />
    </Link>
    <div className="p-5 space-y-3">
      <p className="text-xs uppercase tracking-wide text-blue-600">{plan.category_name}</p>
      <h2 className="text-xl font-semibold"><Link to={`/plan/${plan.id}`}>{plan.title}</Link></h2>
      <p className="font-bold">{formatPrice(plan.price)}</p>
      {plan.seller_name && <p className="text-sm text-slate-500">By {plan.seller_name}</p>}
      {metadata.length > 0 && <ul aria-label="Plan specifications" className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-500">{metadata.slice(0, 3).map(item => <li key={item.label}>{item.label}: {item.value}</li>)}</ul>}
      <p className="text-sm text-slate-600 line-clamp-2">{plan.description}</p>
      <Link to={`/plan/${plan.id}`} className="inline-block text-blue-700 underline">View Plan Details</Link>
    </div>
  </article>;
}

