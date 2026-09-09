export function formatApiError(data, status) {
  if (status >= 500) return 'The service is temporarily unavailable. Please try again shortly.';
  if (status === 429) return 'Too many requests. Please wait before trying again.';
  const messages = [];
  function visit(value, path = '') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, typeof item === 'object' && item !== null ? `${path}[${index + 1}]` : path));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => visit(item,
        ['detail', 'non_field_errors'].includes(key) ? path : [path, key].filter(Boolean).join('.')));
    } else if (typeof value === 'string' && value.trim()) {
      messages.push(path ? `${path}: ${value}` : value);
    }
  }
  visit(data);
  if (messages.length) return messages.join('\n');
  if (status === 401) return 'Your sign-in has expired. Please sign in again.';
  if (status === 403) return 'You do not have access to this resource.';
  if (status === 404) return 'The requested item could not be found.';
  return 'The request could not be completed. Please check your details and try again.';
}

export function connectionError() {
  return new Error('Could not connect to the service. Check your connection and try again. If you requested payment, refresh its status before retrying.');
}
