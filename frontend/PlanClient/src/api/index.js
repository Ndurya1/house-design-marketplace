import { createApiClient } from '../lib/httpClient.js';
import { session } from '../lib/session.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
export const MEDIA_BASE_URL = BASE_URL.replace(/\/api\/?$/, '');
export const apiClient = createApiClient(BASE_URL, session);

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export * from './Catalogue';
export * from './users';
export * from './orders';
