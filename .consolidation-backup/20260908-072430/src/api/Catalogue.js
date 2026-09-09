import { apiClient } from './index';

export const getCategories = (options = {}) => apiClient('/categories/', options);

export const getCategory = (id, options = {}) => apiClient(`/categories/${id}/`, options);

export const getPlansByCategory = (categoryId, params = {}, options = {}) =>
  getPlans({ ...params, category: categoryId }, options);

export const getPlans = (params = {}, options = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) query.set(key, value);
  });
  return apiClient(`/catalogue/?${query}`, options);
};

export const getMyPlans = () => apiClient('/catalogue/mine/');

export const downloadPlanFile = (id) =>
  apiClient(`/catalogue/${id}/plan-file/`, { responseType: 'blob' });

export const getPlanDetails = (id, options = {}) => apiClient(`/catalogue/${id}/`, options);
export const getRelatedPlans = (id, options = {}) => apiClient(`/catalogue/${id}/related/`, options);

export const createPlan = (planData) =>
  apiClient('/catalogue/', {
    method: 'POST',
    body: planData,
  });

export const updatePlan = (id, planData) =>
  apiClient(`/catalogue/${id}/`, {
    method: 'PUT',
    body: planData,
  });

export const patchPlan = (id, planData) =>
  apiClient(`/catalogue/${id}/`, {
    method: 'PATCH',
    body: planData,
  });

export const submitPlan = (id) =>
  apiClient(`/catalogue/${id}/submit/`, {
    method: 'POST',
  });

export const deletePlan = (id) =>
  apiClient(`/catalogue/${id}/`, {
    method: 'DELETE',
  });
