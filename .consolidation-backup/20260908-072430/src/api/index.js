const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
export const MEDIA_BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

export const apiClient = async (endpoint, options = {}) => {
  const { responseType, authenticate = true, ...fetchOptions } = options;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { ...options.headers };

    if (token && authenticate) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const message = data && typeof data === 'object'
        ? Object.entries(data).map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(' ') : errors}`).join('\n')
        : `API Error: ${response.statusText}`;
      throw new Error(message);
    }

    if (responseType === 'blob') return response.blob();

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    if (error.name !== 'AbortError') console.error("API Request failed:", error);
    throw error;
  }
};

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export * from './Catalogue';
export * from './users';
export * from './orders';
