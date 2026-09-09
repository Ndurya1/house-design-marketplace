import { formatApiError, connectionError } from '../lib/apiErrors.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
export const MEDIA_BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

export const apiClient = async (endpoint, options = {}) => {
  const { responseType, authenticate = true, ...fetchOptions } = options;
  try {
    const token = authenticate ? localStorage.getItem('accessToken') : null;
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
    }).catch((error) => {
      if (error.name === 'AbortError') throw error;
      throw connectionError();
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(formatApiError(data, response.status));
    }

    if (responseType === 'blob') return response.blob();

    const text = await response.text();
    try { return text ? JSON.parse(text) : {}; }
    catch { throw new Error('The service returned an unreadable response. Please refresh and try again.'); }
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
