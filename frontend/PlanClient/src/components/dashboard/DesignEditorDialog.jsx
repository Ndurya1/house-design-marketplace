import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createPlan, patchPlan } from '@/api';

const initialForm = plan => ({
  title: plan?.title || '',
  category: plan?.category ? String(plan.category) : '',
  description: plan?.description || '',
  price: plan?.price ?? '',
});

export default function DesignEditorDialog({ plan = null, categories = [], categoriesLoading = false, categoriesError = false, onRetryCategories, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => initialForm(plan));
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = event => setFormData(current => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async event => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('category', formData.category);
    payload.append('description', formData.description);
    payload.append('price', formData.price);
    if (thumbnailFile) payload.append('thumbnail', thumbnailFile);
    if (designFile) payload.append('plan_file', designFile);

    try {
      const saved = plan ? await patchPlan(plan.id, payload) : await createPlan(payload);
      onSaved(saved, Boolean(plan));
    } catch (failure) {
      setError(failure.message || 'The design could not be saved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="design-editor-title" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6">
          <h2 id="design-editor-title" className="text-2xl font-bold text-slate-900">{plan ? 'Edit design' : 'Upload a design'}</h2>
          <p className="mt-1 text-sm text-slate-500">Add the listing details and files needed for your house plan.</p>
        </div>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">{error}</p>}
        {categoriesError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-800"><p>Categories could not be loaded.</p><Button type="button" variant="outline" onClick={onRetryCategories} className="mt-3">Retry categories</Button></div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Design title
              <input required name="title" value={formData.title} onChange={updateField} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Category
              <select required name="category" value={formData.category} onChange={updateField} disabled={categoriesLoading || categoriesError} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="" disabled>{categoriesLoading ? 'Loading categories...' : 'Select a category'}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.group})</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Price (Ksh)
            <input required min="0.01" step="0.0001" type="number" name="price" value={formData.price} onChange={updateField} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Description
            <textarea rows={4} name="description" value={formData.description} onChange={updateField} className="resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Thumbnail image
            <input type="file" accept="image/*" onChange={event => setThumbnailFile(event.target.files?.[0] || null)} className="text-xs font-normal normal-case tracking-normal text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Plan file (PDF, up to 20 MB)
            <input type="file" accept="application/pdf,.pdf" onChange={event => setDesignFile(event.target.files?.[0] || null)} className="text-xs font-normal normal-case tracking-normal text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
          </label>
          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || categoriesLoading || categoriesError}>{loading ? 'Saving...' : 'Save design'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
