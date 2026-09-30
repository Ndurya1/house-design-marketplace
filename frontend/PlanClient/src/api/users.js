import { apiClient } from './index';

export const registerUser = (userData, { signal } = {}) =>
  apiClient('/register/', {
    method: 'POST',
    authenticate: false,
    signal,
    body: JSON.stringify(userData),
  });

export const loginUser = (credentials, { signal } = {}) =>
  apiClient('/login/', {
    method: 'POST',
    authenticate: false,
    signal,
    body: JSON.stringify(credentials),
  });

export const requestPasswordReset = (email, { signal } = {}) =>
  apiClient('/password-reset/', {
    method: 'POST', authenticate: false, signal,
    body: JSON.stringify({ email }),
  });

export const confirmPasswordReset = (uid, token, newPassword, { signal } = {}) =>
  apiClient(`/password-reset/confirm/${encodeURIComponent(uid)}/${encodeURIComponent(token)}/`, {
    method: 'POST', authenticate: false, signal,
    body: JSON.stringify({ new_password: newPassword }),
  });

export const refreshToken = (refresh) =>
  apiClient('/token/refresh/', {
    method: 'POST',
    authenticate: false,
    body: JSON.stringify({ refresh }),
  });

export const getSellerProfiles = (token) =>
  apiClient('/seller/', {
    method: 'GET',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

export const createSellerProfile = (profileData, token) =>
  apiClient('/seller/', {
    method: 'POST',
    body: JSON.stringify(profileData),
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

export const updateSellerProfile = (id, profileData) => {
  const isForm = profileData instanceof FormData;
  return apiClient(`/seller/${id}/`, {
    method: 'PATCH',
    body: isForm ? profileData : JSON.stringify(profileData),
  });
};
