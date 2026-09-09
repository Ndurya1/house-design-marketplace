import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlanCard from '@/components/PlanCard';
import { formatPrice } from '@/lib/formatPrice';
import { getPlanDetails, getRelatedPlans, getMediaUrl } from '@/api';

export default function PlanDetailPage() {
  const { id } = useParams();
  return <PlanDetailContent key={id} id={id} />;
}

function PlanDetailContent({ id }) {
  const [plan, setPlan] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [relatedError, setRelatedError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    getPlanDetails(id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setPlan(data); })
      .catch(() => { if (!controller.signal.aborted) setError('This plan is unavailable. Return to the catalogue to explore other plans.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    getRelatedPlans(id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setRelated(data); })
      .catch(() => { if (!controller.signal.aborted) setRelatedError('Related plans could not load.'); });
    return () => controller.abort();
  }, [id]);
  return <div className="min-h-screen flex flex-col"><Header />
    <main className="pt-28 pb-16 px-6 flex-1"><div className="max-w-7xl mx-auto space-y-8">
      <Link className="text-blue-700 underline" to="/plans">Browse all plans</Link>
      {loading && <p role="status">Loading plan...</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!loading && plan && <>
        <article className="grid gap-8 lg:grid-cols-2">
          {plan.thumbnail ? <img src={getMediaUrl(plan.thumbnail)} alt={plan.title} className="w-full rounded-xl object-contain bg-white max-h-[600px]" /> : <div className="p-16 bg-slate-200 rounded-xl">No preview available</div>}
          <div className="space-y-5">
            <Link to={`/plans/${plan.category}`} className="text-blue-700 underline">{plan.category_name}</Link>
            <h1 className="text-4xl font-bold">{plan.title}</h1>
            {plan.seller_name && <p className="text-slate-600">Designed by {plan.seller_name}</p>}
            <p className="text-2xl font-bold">{formatPrice(plan.price)}</p>
            <Link to={`/checkout/new/${plan.id}`} className="inline-block rounded-lg bg-blue-700 px-6 py-3 text-white">Buy this plan</Link>
            <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{plan.description}</p>
          </div>
        </article>
        {relatedError && <p role="status">{relatedError}</p>}
        {related.length > 0 && <section className="space-y-5"><h2 className="text-2xl font-bold">Related plans</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{related.map((item) => <PlanCard key={item.id} plan={item} />)}</div>
        </section>}
      </>}
    </div></main><Footer /></div>;
}

