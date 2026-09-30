import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, Edit, FileText, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Feedback } from '@/components/ui/feedback';
import { useSession } from '@/lib/useSession';
import { DESIGN_STATUS_LABELS } from '@/lib/dashboardSummary';
import { formatPrice } from '@/lib/formatPrice';
import { deletePlan, downloadPlanFile, getMediaUrl, getMyPlans, submitPlan } from '@/api';

const readList = value => Array.isArray(value) ? value : value?.results || [];
const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

export default function DashboardDesignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const detailHeadingRef = useRef(null);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    getMyPlans({ signal: controller.signal })
      .then(data => {
        const found = readList(data).find(item => String(item.id) === String(id));
        if (found) setPlan(found);
        else setError(true);
      })
      .catch(failure => { if (failure.name !== 'AbortError') setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, id, reload]);

  const retry = () => {
    setError(false);
    setLoading(true);
    setReload(value => value + 1);
  };

  const handleSubmit = async () => {
    if (!plan || submitting) return;
    setActionError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      setPlan(await submitPlan(plan.id));
      setSuccessMessage('Design submitted for review.');
    } catch (failure) {
      setActionError(failure.message || 'The design could not be submitted for review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!plan || deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      await deletePlan(plan.id);
      navigate('/dashboard/designs');
    } catch {
      setActionError('The design could not be deleted. Refresh the page and try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!plan) return;
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
      <div className="mx-auto w-full max-w-5xl">
        <Link to="/dashboard/designs" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to designs</Link>
        <section aria-live="polite" className="mt-6">
          {loading ? <Feedback kind="loading" title="Loading design" description="Retrieving the listing details." /> : error || !plan ? <Feedback kind="error" title="Design not found" description="This design is not available in your seller library." actionLabel="Try again" onAction={retry} /> : <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-primary">Design details</p><h1 ref={detailHeadingRef} tabIndex={-1} className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-900 focus-visible:outline-none">{plan.title}</h1><p className="mt-2 text-sm text-slate-500">Created {formatDate(plan.created_at)} · Updated {formatDate(plan.updated_at)}</p></div><Badge className="border-0 bg-slate-100 text-slate-700">{DESIGN_STATUS_LABELS[plan.status] || plan.status}</Badge></div>
            {actionError && <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{actionError}</p>}
            {successMessage && <p role="status" className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">{successMessage}</p>}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <Card className="overflow-hidden border-0 bg-white shadow-lg"><div className="aspect-[16/9] overflow-hidden bg-slate-100"><img src={getMediaUrl(plan.thumbnail) || '/images/hero.png'} alt={plan.title} className="h-full w-full object-cover" /></div><CardContent className="p-6"><dl className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{plan.category_name || 'Category unavailable'}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price</dt><dd className="mt-1 text-sm font-semibold text-blue-700">{formatPrice(plan.price)}</dd></div></dl><div className="mt-6 border-t border-slate-100 pt-6"><h2 className="text-lg font-bold text-slate-900">Description</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{plan.description || 'No description provided.'}</p></div></CardContent></Card>
              <Card className="h-fit border-0 bg-white shadow-lg"><CardContent className="flex flex-col gap-3 p-6"><h2 className="text-lg font-bold text-slate-900">Manage listing</h2>{plan.status === 'draft' && <><Button type="button" onClick={() => navigate(`/dashboard/designs?edit=${plan.id}`)} disabled={submitting}><Edit aria-hidden="true" className="mr-2 h-4 w-4" />Edit design</Button><Button type="button" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit for review'}</Button><Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)} disabled={submitting} className="text-red-700 hover:text-red-800"><Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />Delete draft</Button></>}{plan.has_plan_file ? <Button type="button" variant="outline" onClick={handleDownload} disabled={submitting}><Download aria-hidden="true" className="mr-2 h-4 w-4" />Download PDF</Button> : <p className="flex items-center gap-2 text-sm text-slate-500"><FileText aria-hidden="true" className="h-4 w-4" />No plan file attached</p>}<p className="mt-2 text-xs leading-5 text-slate-500">Only draft listings can be edited, submitted, or deleted. Review and publication remain staff-controlled.</p></CardContent></Card>
            </div>
          </>}
        </section>
      </div>
      {deleteOpen && plan && <ConfirmDialog title={`Delete “${plan.title}”?`} description="This permanently removes the draft design. This action cannot be undone." confirmLabel="Delete design" busyLabel="Deleting…" errorTitle="Deletion failed" busy={deleting} error={actionError} onCancel={() => setDeleteOpen(false)} onConfirm={handleDelete} returnFocusRef={detailHeadingRef} />}
    </div>
  );
}
