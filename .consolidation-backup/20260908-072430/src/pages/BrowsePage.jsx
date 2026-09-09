import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlanCard from '@/components/PlanCard';
import { Button } from '@/components/ui/button';
import { getCategories, getPlans } from '@/api';

export default function BrowsePage() {
  const { category: routeCategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.toString();
  const categoryId = routeCategory || searchParams.get('category') || '';
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getCategories({ signal: controller.signal }).then(setCategories).catch((err) => {
      if (!controller.signal.aborted) setCategoryError(err.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setResult(null); setError('');
    const params = Object.fromEntries(new URLSearchParams(query));
    if (routeCategory) params.category = routeCategory;
    getPlans(params, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setResult(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, routeCategory]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (value.trim()) next.set(key, value.trim());
    }
    setSearchParams(next);
  };
  const changePage = (url) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', new URL(url, window.location.origin).searchParams.get('page') || '1');
    setSearchParams(next);
  };
  const categoryName = categories.find((item) => String(item.id) === categoryId)?.name;
  const inputClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2';

  return <div className="flex min-h-screen flex-col"><Header />
    <main className="pt-28 pb-16 px-6 flex-1"><div className="max-w-7xl mx-auto space-y-8">
      <div><h1 className="text-3xl font-bold">{categoryName ? `${categoryName} Plans` : 'House Plans'}</h1>
        <p className="mt-2 text-slate-600">Explore reviewed plans and find a design within your budget.</p></div>
      <form key={`${routeCategory || ''}:${query}`} onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end bg-white p-5 rounded-xl border">
        <label className="text-sm">Search<input name="search" type="search" maxLength={200} defaultValue={searchParams.get('search') || ''} placeholder="Title or description" className={inputClass} /></label>
        {routeCategory ? <div className="text-sm"><p>Category: {categoryName || categoryId}</p><Link className="text-blue-700 underline" to="/plans">All categories</Link></div> :
          <label className="text-sm">Category<select name="category" defaultValue={categoryId} className={inputClass}>
            <option value="">All categories</option>
            {categoryId && !categories.some((item) => String(item.id) === categoryId) && <option value={categoryId}>Category {categoryId}</option>}
            {categories.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>}
        <label className="text-sm">Minimum price (Ksh)<input name="min_price" type="number" min="0" step="0.0001" defaultValue={searchParams.get('min_price') || ''} className={inputClass} /></label>
        <label className="text-sm">Maximum price (Ksh)<input name="max_price" type="number" min="0" step="0.0001" defaultValue={searchParams.get('max_price') || ''} className={inputClass} /></label>
        <label className="text-sm">Sort by<select name="ordering" defaultValue={searchParams.get('ordering') || 'newest'} className={inputClass}>
          <option value="newest">Newest</option><option value="price_low">Lowest price</option><option value="price_high">Highest price</option>
        </select></label>
        <Button type="submit">Apply filters</Button>
      </form>
      {categoryError && <p role="alert" className="text-amber-800">Category options could not load. You can still search plans.</p>}
      {loading && <p role="status">Loading plans...</p>}
      {error && <div role="alert" className="text-red-700 whitespace-pre-line"><p>{error}</p><Link to={routeCategory ? `/plans/${routeCategory}` : '/plans'} className="underline">Reset filters</Link></div>}
      {!loading && !error && result && <>
        <p role="status" className="text-slate-600">{result.count} {result.count === 1 ? 'plan' : 'plans'} found</p>
        {result.results.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{result.results.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
          : <p className="rounded-xl bg-white p-10 text-center">No plans match these filters. Try a broader search.</p>}
        {(result.next || result.previous) && <nav aria-label="Catalogue pages" className="flex justify-center items-center gap-4">
          <Button disabled={!result.previous} onClick={() => changePage(result.previous)}>Previous</Button>
          <span>Page {searchParams.get('page') || '1'}</span>
          <Button disabled={!result.next} onClick={() => changePage(result.next)}>Next</Button>
        </nav>}
      </>}
    </div></main><Footer /></div>;
}
