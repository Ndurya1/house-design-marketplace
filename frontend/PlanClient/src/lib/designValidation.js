export const MAX_PLAN_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const extensionOf = file => {
  const name = file?.name || '';
  const position = name.lastIndexOf('.');
  return position === -1 ? '' : name.slice(position).toLowerCase();
};

const validateOptionalPositiveInteger = (value, fieldErrors, field, label) => {
  const trimmed = String(value ?? '').trim();
  if (trimmed && (!/^\d+$/.test(trimmed) || Number(trimmed) < 1)) {
    fieldErrors[field] = `${label} must be a whole number of at least 1.`;
  }
};

export function validateDesignForm({ title = '', category = '', price = '', bedrooms = '', storeys = '', floor_area = '', packageContents = '', thumbnailFile = null, planFile = null } = {}) {
  const fieldErrors = {};
  const trimmedTitle = title.trim();
  const trimmedPrice = price.trim();

  if (!trimmedTitle) fieldErrors.title = 'A design title is required.';
  else if (trimmedTitle.length > 200) fieldErrors.title = 'Design titles must be 200 characters or fewer.';
  if (!category) fieldErrors.category = 'Choose a category.';
  if (!trimmedPrice) fieldErrors.price = 'Enter a price.';
  else if (!/^\d+(?:\.\d{1,4})?$/.test(trimmedPrice) || Number(trimmedPrice) < 0.01) fieldErrors.price = 'Use a price of at least Ksh 0.01 with no more than 4 decimal places.';

  validateOptionalPositiveInteger(bedrooms, fieldErrors, 'bedrooms', 'Bedrooms');
  validateOptionalPositiveInteger(storeys, fieldErrors, 'storeys', 'Storeys');
  const trimmedArea = String(floor_area ?? '').trim();
  if (trimmedArea && (!/^\d+(?:\.\d{1,2})?$/.test(trimmedArea) || Number(trimmedArea) < 0.01)) {
    fieldErrors.floor_area = 'Floor area must be at least 0.01 with no more than 2 decimal places.';
  }
  const packageItems = String(packageContents ?? '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (packageItems.length > 20) fieldErrors.package_contents = 'List no more than 20 included items.';
  else if (packageItems.some(item => item.length > 120)) fieldErrors.package_contents = 'Each included item must be 120 characters or fewer.';

  if (thumbnailFile) {
    if (thumbnailFile.size > MAX_THUMBNAIL_BYTES) fieldErrors.thumbnail = 'Thumbnails must be 5 MB or smaller.';
    else if (thumbnailFile.type && !thumbnailFile.type.startsWith('image/')) fieldErrors.thumbnail = 'Choose an image thumbnail.';
    else if (!thumbnailFile.type && !imageExtensions.has(extensionOf(thumbnailFile))) fieldErrors.thumbnail = 'Choose a JPG, PNG, or WebP thumbnail.';
  }

  if (planFile) {
    if (planFile.size > MAX_PLAN_FILE_BYTES) fieldErrors.plan_file = 'Plan files must be 20 MB or smaller.';
    else if (planFile.type && planFile.type !== 'application/pdf') fieldErrors.plan_file = 'Plan files must be PDF documents.';
    else if (!planFile.type && extensionOf(planFile) !== '.pdf') fieldErrors.plan_file = 'Plan files must be PDF documents.';
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}
