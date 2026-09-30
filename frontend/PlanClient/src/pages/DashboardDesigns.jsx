import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Edit, FileText, Grid, Plus, Search, Trash2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/lib/useSession';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Feedback } from '@/components/ui/feedback';
import DesignEditorDialog from '@/components/dashboard/DesignEditorDialog';
import { DESIGN_STATUS_LABELS } from '@/lib/dashboardSummary';
import { filterDesigns } from '@/lib/designFilters';
import { formatPrice } from '@/lib/formatPrice';
import { deletePlan, downloadPlanFile, getCategories, getMediaUrl, getMyPlans, submitPlan } from '@/api';

const readList = value => Array.isArray(value) ? value : value?.results || [];

export default function DashboardDesigns() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [plansReload, setPlansReload] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submittingId, setSubmittingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const libraryHeadingRef = useRef(null);

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
    getCategories({ signal: controller.signal })
      .then(data => setCategories(readList(data)))
      .catch(failure => { if (failure.name !== 'AbortError') setCategoriesError(true); })
      .finally(() => { if (!controller.signal.aborted) setCategoriesLoading(false); });
    return () => controller.abort();
  }, [user]);

  const retryPlans = () => {
    setPlansError(false);
    setLoadingPlans(true);
    setPlansReload(value => value + 1);
  };

  const retryCategories = () => {
    setCategoriesError(false);
    setCategoriesLoading(true);
    getCategories()
      .then(data => setCategories(readList(data)))
      .catch(() => setCategoriesError(true))
      .finally(() => setCategoriesLoading(false));
  };

  const filteredPlans = useMemo(() => filterDesigns(plans, { search, status }), [plans, search, status]);

  const editId = searchParams.get('edit');
  const newRequested = searchParams.get('new') === '1';
  const editingPlan = editId ? plans.find(plan => String(plan.id) === editId) : null;
  const editorOpen = newRequested || Boolean(editId && editingPlan);

  const closeEditor = () => setSearchParams({});
  const openNew = () => setSearchParams({ new: '1' });
  const openEdit = plan => setSearchParams({ edit: String(plan.id) });

  const handleSaved = (saved, wasEditing) => {
    setPlans(current => wasEditing ? current.map(plan => plan.id === saved.id ? saved : plan) : [saved, ...current]);
    setSuccessMessage(wasEditing ? 'Design updated successfully.' : 'Design saved as a draft.');
    closeEditor();
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      await deletePlan(deleteTarget.id);
      setPlans(current => current.filter(plan => plan.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setActionError('The design could not be deleted. Refresh the page and try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async plan => {
    if (submittingId) return;
    setActionError('');
    setSuccessMessage('');
    setSubmittingId(plan.id);
    try {
      const updated = await submitPlan(plan.id);
      setPlans(current => current.map(item => item.id === updated.id ? updated : item));
      setSuccessMessage('Design submitted for review.');
    } catch (failure) {
      setActionError(failure.message || 'The design could not be submitted for review.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDownload = async plan => {
    setActionError('');
    try {
      const blob = await downloadPlanFile(plan.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plan-${plan.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setActionError(failure.message || 'The plan file could not be downloaded.');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <button type="button" onClick={() => navigate('/dashboard')} className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to overview</button>
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0"><h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">My Designs</h1><p className="mt-2 text-sm text-slate-600">Search, review, and manage your house plan listings.</p></div>
          <Button type="button" onClick={openNew} className="min-h-11 shrink-0"><Plus aria-hidden="true" className="mr-2 h-4 w-4" />Upload a design</Button>
        </div>

        {actionError && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{actionError}</p>}
        {successMessage && <p role="status" className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">{successMessage}</p>}

        <section aria-labelledby="design-filters-heading" className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 id="design-filters-heading" className="sr-only">Design filters</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end">
            <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-slate-700">Search designs
              <span className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search designs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Title, description, or category" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" /></span>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700">Status
              <select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All statuses</option>
                {Object.entries(DESIGN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {(search || status !== 'all') && <Button type="button" variant="ghost" onClick={() => { setSearch(''); setStatus('all'); }} className="min-h-11">Clear filters</Button>}
          </div>
          {!loadingPlans && !plansError && <p className="mt-4 text-sm text-slate-500" aria-live="polite">Showing {filteredPlans.length} of {plans.length} designs</p>}
        </section>

        <section aria-labelledby="design-library-heading" aria-live="polite">
          <div className="mb-4 flex items-center gap-3"><Grid aria-hidden="true" className="h-5 w-5 text-primary" /><h2 ref={libraryHeadingRef} id="design-library-heading" tabIndex={-1} className="text-xl font-bold text-slate-900 focus-visible:outline-none">Design library</h2></div>
          {loadingPlans ? <Feedback kind="loading" title="Loading designs" description="Retrieving your design library." /> : plansError ? <Feedback kind="error" title="Could not load designs" description="Check your connection and try again." actionLabel="Try again" onAction={retryPlans} /> : plans.length === 0 ? <Feedback title="No designs yet" description="Upload your first design to get started." actionLabel="Upload a design" onAction={openNew} /> : filteredPlans.length === 0 ? <Feedback title="No designs match these filters" description="Try a different search term or status." actionLabel="Clear filters" onAction={() => { setSearch(''); setStatus('all'); }} /> : <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{filteredPlans.map(plan => <Card key={plan.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-0 bg-white shadow-lg">
            <div className="relative h-48 overflow-hidden bg-slate-100"><img src={getMediaUrl(plan.thumbnail) || '/images/hero.png'} alt={plan.title} className="h-full w-full object-cover" /><Badge className="absolute left-4 top-4 border-0 bg-primary text-white">{plan.category_group || plan.category_name || 'Uncategorised'}</Badge></div>
            <CardContent className="flex flex-1 flex-col gap-4 p-5 sm:p-6"><div className="min-w-0"><div className="flex items-start justify-between gap-3"><Link to={`/dashboard/designs/${plan.id}`} className="min-w-0 text-lg font-semibold text-slate-800 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="line-clamp-2">{plan.title}</span></Link><span className="shrink-0 text-right text-sm font-bold text-blue-600">{formatPrice(plan.price)}</span></div><p className="mt-2 text-xs uppercase tracking-wider text-slate-400">{plan.category_name || 'Category unavailable'}</p><p className="mt-3 line-clamp-3 text-sm text-slate-500">{plan.description || 'No description provided.'}</p></div><div className="mt-auto flex flex-wrap items-center justify-between gap-3"><Badge className="border-0 bg-slate-100 text-slate-700">{DESIGN_STATUS_LABELS[plan.status] || plan.status}</Badge><div className="flex flex-wrap items-center justify-end gap-2">{plan.status === 'draft' && <><Button type="button" variant="ghost" aria-label={`Edit ${plan.title}`} onClick={() => openEdit(plan)} disabled={Boolean(submittingId)} className="min-h-10 px-3"><Edit aria-hidden="true" className="mr-1.5 h-4 w-4" />Edit</Button><Button type="button" variant="ghost" aria-label={`Delete ${plan.title}`} onClick={() => { setActionError(''); setDeleteTarget(plan); }} disabled={Boolean(submittingId)} className="min-h-10 px-3 text-red-700 hover:text-red-800"><Trash2 aria-hidden="true" className="mr-1.5 h-4 w-4" />Delete</Button><Button type="button" onClick={() => handleSubmit(plan)} disabled={Boolean(submittingId)} className="min-h-10 px-3 text-xs">{submittingId === plan.id ? 'Submitting...' : 'Submit'}</Button></>}{plan.has_plan_file && <Button type="button" variant="ghost" onClick={() => handleDownload(plan)} disabled={Boolean(submittingId)} className="min-h-10 px-3"><Download aria-hidden="true" className="mr-1.5 h-4 w-4" />PDF</Button>}</div></div><Link to={`/dashboard/designs/${plan.id}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View details <span aria-hidden="true" className="ml-1">→</span></Link><p className="flex items-center gap-2 text-xs text-slate-500">{plan.has_plan_file ? <><FileText aria-hidden="true" className="h-4 w-4 text-blue-500" />Plan file attached</> : 'No plan file attached'}</p></CardContent>
          </Card>)}</div>}
        </section>
      </div>

      {editorOpen && <DesignEditorDialog plan={editingPlan} categories={categories} categoriesLoading={categoriesLoading} categoriesError={categoriesError} onRetryCategories={retryCategories} onClose={closeEditor} onSaved={handleSaved} />}
      {deleteTarget && <ConfirmDialog title={`Delete “${deleteTarget.title}”?`} description="This permanently removes the draft design. This action cannot be undone." confirmLabel="Delete design" busyLabel="Deleting…" errorTitle="Deletion failed" busy={deleting} error={actionError} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} returnFocusRef={libraryHeadingRef} />}
    </div>
  );
}
