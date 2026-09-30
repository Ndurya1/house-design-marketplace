import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  FileText,
  DollarSign,
  TrendingUp,
  Grid,
  Settings,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Home,
  Calendar,
} from 'lucide-react';
import Header from '@/components/Header';
import { useSession } from '@/lib/useSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Feedback } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatPrice } from '@/lib/formatPrice';
import { DESIGN_STATUS_LABELS, summarizeOrders, summarizePlans } from '@/lib/dashboardSummary';
import {
  getMyPlans,
  getCategories,
  createPlan,
  patchPlan,
  deletePlan,
  submitPlan,
  downloadPlanFile,
  getOrders,
  getMediaUrl,
} from '@/api';

export default function DashboardOverview({ view = 'overview' }) {
  const navigate = useNavigate();
  const { user } = useSession();
  
  // Plans / designs states
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [plansReload, setPlansReload] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const designsFocusRef = useRef(null);
  
  // Orders / sales states
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersReload, setOrdersReload] = useState(0);
  
  // Create / Edit modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Fetch initial data
  useEffect(() => {
    if (!user) return;
    


    getCategories()
      .then(setCategories)
      .catch((err) => console.error('Failed to load categories', err));

  }, [user]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    getOrders(undefined, { signal: controller.signal })
      .then((data) => setOrders(data))
      .catch((failure) => { if (failure.name !== 'AbortError') setOrdersError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOrders(false); });
    return () => controller.abort();
  }, [user, ordersReload]);

  const retryOrders = () => {
    setLoadingOrders(true);
    setOrdersError(false);
    setOrdersReload(value => value + 1);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyPlans()
      .then((data) => { if (!cancelled) setPlans(data); })
      .catch(() => { if (!cancelled) setPlansError(true); })
      .finally(() => { if (!cancelled) setLoadingPlans(false); });
    return () => { cancelled = true; };
  }, [user, plansReload]);

  const retryPlans = () => {
    setPlansError(false);
    setLoadingPlans(true);
    setPlansReload((count) => count + 1);
  };

  // Compute Stats

  // The API exposes only this designer's items, including historical snapshots.
  const planSummary = summarizePlans(plans);
  const orderSummary = summarizeOrders(orders);
  const formatDate = value => value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(value)) : 'Date unavailable';

  // Backend still authorizes ownership and draft-only deletion.
  const handleDeletePlan = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deletePlan(deleteTarget.id);
      setPlans((current) => current.filter((plan) => plan.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('The design could not be deleted. It may no longer be a draft. Refresh the page to check its status before trying again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitPlan = async (id) => {
    try {
      const updated = await submitPlan(id);
      setPlans(plans.map((plan) => (plan.id === id ? updated : plan)));
    } catch (err) {
      console.error('Failed to submit plan', err);
      alert(err.message);
    }
  };

  // Open Modal for Create or Edit
  const handleDownloadPlan = async (id) => {
    try {
      const blob = await downloadPlanFile(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plan-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    }
  };

  const openPlanModal = (plan = null) => {
    setModalError(null);
    setThumbnailFile(null);
    setDesignFile(null);
    if (plan) {
      setEditingPlan(plan);
      setPlanFormData({
        title: plan.title || '',
        category: plan.category || '',
        description: plan.description || '',
        price: plan.price ? Math.round(Number(plan.price)).toString() : '',
      });
    } else {
      setEditingPlan(null);
      setPlanFormData({
        title: '',
        category: '',
        description: '',
        price: '',
      });
    }
    setIsModalOpen(true);
  };

  const handlePlanFormChange = (e) => {
    setPlanFormData({
      ...planFormData,
      [e.target.name]: e.target.value,
    });
  };

  // Save Plan (Create/Update)
  const handleSavePlan = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData();
    formData.append('title', planFormData.title);
    formData.append('category', planFormData.category);
    formData.append('description', planFormData.description);
    formData.append('price', planFormData.price);
    
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }
    if (designFile) {
      formData.append('plan_file', designFile);
    }

    try {
      if (editingPlan) {
        // Update plan (using PATCH or PUT. PATCH is safer with FormData if some files aren't uploaded)
        const updated = await patchPlan(editingPlan.id, formData);
        setPlans(plans.map((p) => (p.id === editingPlan.id ? updated : p)));
      } else {
        // Create plan
        const created = await createPlan(formData);
        setPlans([created, ...plans]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className=" min-h-screen flex   bg-slate-50 font-sans">
      

      

      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Back Link */}
        


        <div className=" hidden md:flex mb-6 mx-auto w-full max-w-4xl">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
        </div>

        {/* Dashboard Title */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-slate-900 tracking-tight md:text-4xl">
              {view === 'designs' ? 'My Designs' : `Welcome back, ${user?.name || 'Seller'}!`}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {view === 'designs' ? 'Upload and manage your house plan designs.' : "Here's an overview of your store."}
            </p>
          </div>
          <Button
            onClick={() => openPlanModal()}
            className="rounded flex flex-row  bg-primary hover:bg-blue-700 text-white font-medium items-center text-left gap-2 shadow-lg shadow-blue-200  p-btn "
          >
            <Plus className="text-white gap-2 "/> Upload a Design
            </Button>
        </div>

        {view === 'overview' && <>
        <h3 className="text-xl font-bold text-slate-800 mb-6">Overview</h3>
        <div className="grid grid-cols-1 gap-6 mb-10 md:grid-cols-3">
          <Card className="bg-white overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-semibold text-slate-800">{loadingPlans ? '...' : plansError ? 'Unavailable' : planSummary.total}</p>
                <p className="text-sm font-semibold text-slate-900 tracking-wider">Designs</p>
                <p className="text-xs text-slate-500">All-time uploaded designs</p>
              </div>
              <div className="shrink-0 rounded-full bg-primary p-3 text-white"><Grid aria-hidden="true" className="h-6 w-6" /></div>
            </CardContent>
          </Card>
          <Card className="bg-white overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-semibold text-slate-800">{loadingOrders ? '...' : ordersError ? 'Unavailable' : orderSummary.completedCount}</p>
                <p className="text-sm font-semibold text-slate-900 tracking-wider">Completed orders</p>
                <p className="text-xs text-slate-500">All-time completed sales</p>
              </div>
              <div className="shrink-0 rounded-full bg-primary p-3 text-white"><TrendingUp aria-hidden="true" className="h-6 w-6" /></div>
            </CardContent>
          </Card>
          <Card className="bg-white overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="break-words text-3xl font-semibold text-slate-800">{loadingOrders ? '...' : ordersError || orderSummary.revenue === null ? 'Unavailable' : formatPrice(orderSummary.revenue)}</p>
                <p className="text-sm font-semibold text-slate-900 tracking-wider">Gross sales</p>
                <p className="text-xs text-slate-500">All-time completed order value</p>
              </div>
              <div className="shrink-0 rounded-full bg-primary p-3 text-white"><DollarSign aria-hidden="true" className="h-6 w-6" /></div>
            </CardContent>
          </Card>
        </div>

        <section aria-labelledby="design-status-heading" className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="design-status-heading" className="text-lg font-bold text-slate-800">Design status</h2>
            <Link to="/dashboard/designs" className="min-h-11 inline-flex items-center rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Manage designs</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(DESIGN_STATUS_LABELS).map(([status, label]) => <Card key={status} className="bg-white"><CardContent className="p-5"><p className="text-2xl font-semibold text-slate-900">{loadingPlans ? '...' : plansError ? '—' : planSummary.statuses[status]}</p><p className="mt-1 text-sm text-slate-600">{label}</p></CardContent></Card>)}
          </div>
        </section>

        <section aria-labelledby="recent-sales-heading" className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="recent-sales-heading" className="text-lg font-bold text-slate-800">Recent sales</h2>
            <Link to="/dashboard/orders" className="min-h-11 inline-flex items-center gap-2 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">View all sales <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
          {loadingOrders ? <Feedback kind="loading" title="Loading recent sales" description="Retrieving your seller orders." /> : ordersError ? <Feedback kind="error" title="Could not load recent sales" description="Check your connection and try again." actionLabel="Try again" onAction={retryOrders} /> : orderSummary.recent.length === 0 ? <Feedback title="No completed sales yet" description="Completed orders containing your designs will appear here." /> : <div className="grid gap-4">{orderSummary.recent.map(order => <Card key={order.reference} className="bg-white"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{(order.items || []).map(item => item.title_snapshot).join(', ') || 'Design details unavailable'}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"><Calendar aria-hidden="true" className="h-4 w-4" />{formatDate(order.created_at)}<span aria-hidden="true">·</span><span>Order {String(order.reference).slice(0, 8)}</span></p></div><p className="shrink-0 text-sm font-semibold text-slate-700">{order.subtotal === null ? 'Amount unavailable' : formatPrice(order.subtotal)}</p></div></CardContent></Card>)}</div>}
          {!loadingOrders && !ordersError && orderSummary.unknownPriceCount > 0 && <p className="mt-3 text-sm text-amber-700">Gross sales are unavailable because {orderSummary.unknownPriceCount} completed sale item{orderSummary.unknownPriceCount === 1 ? '' : 's'} has no recorded price.</p>}
        </section>
        <nav aria-label="Overview shortcuts" className="mb-8 flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          <Link to="/dashboard/designs" className="flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Grid aria-hidden="true" className="h-4 w-4" /> My Designs
          </Link>
          <Link to="/dashboard/settings" className="flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Settings aria-hidden="true" className="h-4 w-4" /> Profile Settings
          </Link>
        </nav>

        </>}
        {/* Design library */}
          <div>
            <h2 ref={designsFocusRef} tabIndex={-1} className="ui-section-title mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{view === 'designs' ? 'Design library' : 'My Designs'}</h2>
            {loadingPlans ? (
              <Feedback kind="loading" title="Loading designs" description="Retrieving your design library." />
            ) : plansError ? (
              <Feedback kind="error" title="Could not load designs" description="Check your connection and try again." actionLabel="Try again" onAction={retryPlans} />
            ) : plans.length === 0 ? (
              <Feedback title="No designs yet" description="Upload your first design to get started." actionLabel="Upload a design" onAction={() => openPlanModal()} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="group overflow-hidden rounded-2xl border-0 shadow-lg bg-white flex flex-col"
                  >
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img
                        src={getMediaUrl(plan.thumbnail) || '/images/hero.png'}
                        alt={plan.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Badge className="bg-primary text-white border-0 rounded-md px-2.5 py-0.5 text-xxs uppercase">
                          {plan.category_group}
                        </Badge>
                      </div>
                      <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {plan.status === 'draft' && (
                          <>
                            <button
                              aria-label={`Edit ${plan.title}`}
                              onClick={() => openPlanModal(plan)}
                              className="bg-white/90 backdrop-blur rounded-full p-2 text-slate-600 hover:text-blue-600 hover:bg-white transition-all shadow-sm"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              aria-label={`Delete ${plan.title}`}
                              onClick={() => { setDeleteError(''); setDeleteTarget(plan); }}
                              className="bg-white/90 backdrop-blur rounded-full p-2 text-slate-600 hover:text-red-600 hover:bg-white transition-all shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-slate-800 line-clamp-1">
                            {plan.title}
                          </h3>
                          <span className="font-bold text-blue-600 text-base whitespace-nowrap pl-2">
                            Ksh {Number(plan.price).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">
                          {plan.category_name}
                        </p>
                        <p className="text-sm text-slate-500 line-clamp-3 mb-4">
                          {plan.description || 'No description provided.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Badge className="bg-slate-100 text-slate-700 border-0 rounded-md px-2.5 py-0.5 text-xxs uppercase">
                          {plan.status.replace('_', ' ')}
                        </Badge>
                        {plan.status === 'draft' && (
                          <Button
                            onClick={() => handleSubmitPlan(plan.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 h-auto"
                          >
                            Submit for review
                          </Button>
                        )}
                      </div>
                      {plan.has_plan_file && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl w-fit border border-slate-100">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span>Blueprint Attached</span>
                          <button type="button" onClick={() => handleDownloadPlan(plan.id)} className="text-blue-600 underline">Download PDF</button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* Add / Edit Design Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="text-left">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingPlan ? 'Edit Blueprint Design' : 'Post New House Plan'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter details about the design blueprint and upload the files.
              </p>
            </div>

            {modalError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Design Title
                  </label>
                  <input
                    type="text"
                    required
                    name="title"
                    value={planFormData.title}
                    onChange={handlePlanFormChange}
                    placeholder="e.g. Modern 4 Bedroom Villa"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Category
                  </label>
                  <select
                    required
                    name="category"
                    value={planFormData.category}
                    onChange={handlePlanFormChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                    Price (Ksh)
                  </label>
                  <input
                    type="number"
                    required
                    name="price"
                    value={planFormData.price}
                    onChange={handlePlanFormChange}
                    placeholder="e.g. 85000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={planFormData.description}
                  onChange={handlePlanFormChange}
                  placeholder="Detail parameters like bedrooms, bathrooms, sqft size, style details..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Thumbnail Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Design Thumbnail Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) setThumbnailFile(e.target.files[0]);
                  }}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Blueprint file Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider pl-1">
                  Plan File (PDF, up to 20 MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => {
                    if (e.target.files) setDesignFile(e.target.files[0]);
                  }}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="flex gap-4 justify-end mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {modalLoading ? 'Saving...' : 'Save Design'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete “${deleteTarget.title}”?`}
          description="This permanently removes the draft design. This action cannot be undone."
          confirmLabel="Delete design"
          busyLabel="Deleting…"
          errorTitle="Deletion failed"
          busy={deleting}
          error={deleteError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeletePlan}
          returnFocusRef={designsFocusRef}
        />
      )}
    </div>
  );
}


