import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createPlan, getMediaUrl, patchPlan } from '@/api';
import { validateDesignForm } from '@/lib/designValidation';

const initialForm = plan => ({
  title: plan?.title || '',
  category: plan?.category ? String(plan.category) : '',
  description: plan?.description || '',
  price: plan?.price ?? '',
  bedrooms: plan?.bedrooms ?? '',
  storeys: plan?.storeys ?? '',
  floor_area: plan?.floor_area ?? '',
  floor_area_unit: plan?.floor_area_unit || 'sqm',
  plot_requirements: plan?.plot_requirements || '',
  packageContents: Array.isArray(plan?.package_contents) ? plan.package_contents.join('\n') : '',
});

const formatBytes = bytes => `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function DesignEditorDialog({ plan = null, categories = [], categoriesLoading = false, categoriesError = false, onRetryCategories, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => initialForm(plan));
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [designFile, setDesignFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const dialogRef = useRef(null);
  const thumbnailUrlRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.querySelector('input')?.focus();
    const closeOnEscape = event => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
    };
  }, [loading, onClose]);

  const updateField = event => {
    const { name, value } = event.target;
    setFormData(current => ({ ...current, [name]: value }));
    setFieldErrors(current => ({ ...current, [name]: undefined }));
  };

  const selectThumbnail = event => {
    const file = event.target.files?.[0] || null;
    if (thumbnailUrlRef.current) URL.revokeObjectURL(thumbnailUrlRef.current);
    thumbnailUrlRef.current = file ? URL.createObjectURL(file) : null;
    setThumbnailFile(file);
    setThumbnailPreview(thumbnailUrlRef.current);
    setFieldErrors(current => ({ ...current, thumbnail: undefined }));
  };

  const selectPlanFile = event => {
    setDesignFile(event.target.files?.[0] || null);
    setFieldErrors(current => ({ ...current, plan_file: undefined }));
  };

  const applyServerError = failure => {
    const message = failure.message || 'The design could not be saved.';
    const nextFieldErrors = {};
    const general = [];
    message.split('\n').forEach(line => {
      const separator = line.indexOf(': ');
      const field = separator === -1 ? '' : line.slice(0, separator);
      const detail = separator === -1 ? line : line.slice(separator + 2);
      if (['title', 'category', 'price', 'description', 'bedrooms', 'storeys', 'floor_area', 'floor_area_unit', 'plot_requirements', 'package_contents', 'thumbnail', 'plan_file'].includes(field)) nextFieldErrors[field] = detail;
      else general.push(line);
    });
    setFieldErrors(nextFieldErrors);
    setError(general.join('\n') || (Object.keys(nextFieldErrors).length ? 'Review the highlighted fields and try again.' : message));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    const validation = validateDesignForm({ ...formData, thumbnailFile, planFile: designFile });
    setFieldErrors(validation.fieldErrors);
    setError(null);
    if (!validation.valid) return;

    setLoading(true);
    const payload = new FormData();
    payload.append('title', formData.title.trim());
    payload.append('category', formData.category);
    payload.append('description', formData.description);
    payload.append('price', formData.price.trim());
    if (formData.bedrooms.toString().trim() || plan) payload.append('bedrooms', formData.bedrooms.toString().trim());
    if (formData.storeys.toString().trim() || plan) payload.append('storeys', formData.storeys.toString().trim());
    if (formData.floor_area.toString().trim() || plan) payload.append('floor_area', formData.floor_area.toString().trim());
    payload.append('floor_area_unit', formData.floor_area_unit);
    payload.append('plot_requirements', formData.plot_requirements.trim());
    payload.append('package_contents', JSON.stringify(formData.packageContents.split(/\r?\n/).map(item => item.trim()).filter(Boolean)));
    if (thumbnailFile) payload.append('thumbnail', thumbnailFile);
    if (designFile) payload.append('plan_file', designFile);

    try {
      const saved = plan ? await patchPlan(plan.id, payload) : await createPlan(payload);
      onSaved(saved, Boolean(plan));
    } catch (failure) {
      applyServerError(failure);
    } finally {
      setLoading(false);
    }
  };

  const fieldMessage = name => fieldErrors[name] && <p id={`${name}-error`} className="text-xs font-medium text-red-700">{fieldErrors[name]}</p>;
  const thumbnailSource = thumbnailPreview || getMediaUrl(plan?.thumbnail);
  const hasThumbnail = Boolean(thumbnailFile || plan?.thumbnail);
  const hasPlanFile = Boolean(designFile || plan?.has_plan_file);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="design-editor-title" tabIndex={-1} className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6"><h2 id="design-editor-title" className="text-2xl font-bold text-slate-900">{plan ? 'Edit design' : 'Upload a design'}</h2><p className="mt-1 text-sm text-slate-500">Save an incomplete draft if needed; all requirements are checked again before review.</p></div>
        {error && <p role="alert" className="mb-4 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">{error}</p>}
        {categoriesError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm font-medium text-amber-800"><p>Categories could not be loaded.</p><Button type="button" variant="outline" onClick={onRetryCategories} className="mt-3">Retry categories</Button></div>}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Design title
              <input required name="title" value={formData.title} onChange={updateField} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title ? 'title-error' : undefined} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
              {fieldMessage('title')}
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Category
              <select required name="category" value={formData.category} onChange={updateField} disabled={categoriesLoading || categoriesError} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'category-error' : undefined} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value="" disabled>{categoriesLoading ? 'Loading categories...' : 'Select a category'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name} ({category.group})</option>)}</select>
              {fieldMessage('category')}
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Price (Ksh)
            <input required inputMode="decimal" type="text" name="price" value={formData.price} onChange={updateField} aria-invalid={Boolean(fieldErrors.price)} aria-describedby={fieldErrors.price ? 'price-error' : 'price-help'} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
            {fieldMessage('price')}<span id="price-help" className="text-xs font-normal normal-case tracking-normal text-slate-500">Minimum Ksh 0.01; up to 4 decimal places. Existing values are sent unchanged unless you edit them.</span>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Description
            <textarea rows={4} name="description" value={formData.description} onChange={updateField} aria-describedby="description-help" className="resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />
            <span id="description-help" className="text-xs font-normal normal-case tracking-normal text-slate-500">At least 50 characters are required before submission for review.</span>{fieldMessage('description')}
          </label>
          <div className="rounded-xl border border-slate-200 p-4"><p className="mb-4 text-sm font-bold normal-case tracking-normal text-slate-900">Plan specifications <span className="font-normal text-slate-500">(optional)</span></p><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Bedrooms<input min="1" step="1" type="number" name="bedrooms" value={formData.bedrooms} onChange={updateField} aria-invalid={Boolean(fieldErrors.bedrooms)} aria-describedby={fieldErrors.bedrooms ? 'bedrooms-error' : undefined} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />{fieldMessage('bedrooms')}</label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Storeys<input min="1" step="1" type="number" name="storeys" value={formData.storeys} onChange={updateField} aria-invalid={Boolean(fieldErrors.storeys)} aria-describedby={fieldErrors.storeys ? 'storeys-error' : undefined} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />{fieldMessage('storeys')}</label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Floor area<input min="0.01" step="0.01" type="number" name="floor_area" value={formData.floor_area} onChange={updateField} aria-invalid={Boolean(fieldErrors.floor_area)} aria-describedby={fieldErrors.floor_area ? 'floor-area-error' : undefined} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />{fieldMessage('floor_area')}</label>
          </div><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Area unit<select name="floor_area_unit" value={formData.floor_area_unit} onChange={updateField} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"><option value="sqm">Square metres</option><option value="sqft">Square feet</option></select></label><label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Plot requirements<input maxLength="200" name="plot_requirements" value={formData.plot_requirements} onChange={updateField} placeholder="e.g. 50 × 100 ft" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />{fieldMessage('plot_requirements')}</label></div></div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Package contents <span className="font-normal normal-case tracking-normal text-slate-500">One included item per line.</span>
            <textarea rows={4} name="packageContents" value={formData.packageContents} onChange={updateField} aria-invalid={Boolean(fieldErrors.package_contents)} aria-describedby={fieldErrors.package_contents ? 'package-contents-error' : undefined} placeholder="Floor plans\nElevations\nSections" className="resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />{fieldMessage('package_contents')}
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Thumbnail image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectThumbnail} aria-invalid={Boolean(fieldErrors.thumbnail)} aria-describedby={fieldErrors.thumbnail ? 'thumbnail-error' : undefined} className="text-xs font-normal normal-case tracking-normal text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
            {thumbnailSource && <img src={thumbnailSource} alt="Selected thumbnail preview" className="mt-2 h-24 w-40 rounded-lg object-cover" />}{thumbnailFile && <span className="text-xs font-normal normal-case tracking-normal text-slate-500">Selected {thumbnailFile.name} ({formatBytes(thumbnailFile.size)})</span>}{fieldMessage('thumbnail')}
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">Plan file (PDF, up to 20 MB)
            <input type="file" accept="application/pdf,.pdf" onChange={selectPlanFile} aria-invalid={Boolean(fieldErrors.plan_file)} aria-describedby={fieldErrors.plan_file ? 'plan_file-error' : undefined} className="text-xs font-normal normal-case tracking-normal text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
            {designFile ? <span className="text-xs font-normal normal-case tracking-normal text-slate-500">Selected {designFile.name} ({formatBytes(designFile.size)})</span> : plan?.has_plan_file ? <span className="text-xs font-normal normal-case tracking-normal text-slate-500">Existing PDF attached; choose a new file only if it should be replaced.</span> : <span className="text-xs font-normal normal-case tracking-normal text-slate-500">Attach a readable, unencrypted PDF before submitting for review.</span>}{fieldMessage('plan_file')}
          </label>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Review checklist</p><ul className="mt-2 grid gap-1 text-xs"><li className={formData.description.trim().length >= 50 ? 'text-green-700' : ''}>• Description: {formData.description.trim().length}/50 characters</li><li className={hasThumbnail ? 'text-green-700' : ''}>• Thumbnail: {hasThumbnail ? 'attached' : 'needed before review'}</li><li className={hasPlanFile ? 'text-green-700' : ''}>• PDF plan: {hasPlanFile ? 'attached' : 'needed before review'}</li></ul></div>
          <div className="mt-2 flex flex-wrap justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button><Button type="submit" disabled={loading || categoriesLoading || categoriesError}>{loading ? 'Saving...' : 'Save design'}</Button></div>
        </form>
      </div>
    </div>
  );
}
