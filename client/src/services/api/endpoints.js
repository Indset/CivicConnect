import { api } from './client';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/me', payload),
  changePassword: (payload) => api.patch('/auth/change-password', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (token, payload) => api.patch(`/auth/reset-password/${token}`, payload),
};

export const complaintsApi = {
  list: (params) => api.get('/complaints', { params }),
  mine: (params) => api.get('/complaints/my', { params }),
  latest: (params) => api.get('/complaints/latest', { params }),
  get: (id) => api.get(`/complaints/${id}`),
  create: (payload) => api.post('/complaints', payload),
  update: (id, payload) => api.put(`/complaints/${id}`, payload),
  remove: (id) => api.delete(`/complaints/${id}`),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  complaints: (params) => api.get('/admin/complaints', { params }),
  setStatus: (id, status) => api.patch(`/admin/complaints/${id}/status`, { status }),
  assign: (id, assignedTo) => api.post(`/admin/complaints/${id}/assign`, { assignedTo }),
  remark: (id, message) => api.post(`/admin/complaints/${id}/remarks`, { message }),
  users: (params) => api.get('/admin/users', { params }),
  categories: () => api.get('/admin/categories'),
  createCategory: (payload) => api.post('/admin/categories', payload),
  updateCategory: (id, payload) => api.patch(`/admin/categories/${id}`, payload),
  setCategoryActive: (id, active) =>
    api.patch(`/admin/categories/${id}/${active ? 'activate' : 'deactivate'}`),
  monthly: () => api.get('/admin/analytics/monthly'),
  categoryStats: () => api.get('/admin/analytics/categories'),
  statusStats: () => api.get('/admin/analytics/status'),
  priorityStats: () => api.get('/admin/analytics/priority'),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const uploadsApi = {
  single: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/uploads/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
