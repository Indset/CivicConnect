import axios from 'axios';

const baseURL = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:5000/api/v1'
).replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) =>
    Promise.reject({
      statusCode: error.response?.status ?? 0,
      message:
        error.response?.data?.message ?? 'Unable to connect to CivicConnect. Please try again.',
      errors: error.response?.data?.errors ?? [],
    }),
);

export const apiUrl = (path = '') => `${baseURL}/${path.replace(/^\//, '')}`;
