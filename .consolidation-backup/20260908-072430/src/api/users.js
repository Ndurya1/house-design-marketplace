import { apiClient } from './index';

export const registerUser = (userData) =>
  apiClient('/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

export const loginUser = (credentials) =>
  apiClient('/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

export const refreshToken = (refresh) =>
  apiClient('/token/refresh/', {
    method: 'POST',
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
