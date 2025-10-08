// NCKH/apps/frontend/src/services/api.ts
import axios from "axios";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
});
api.interceptors.response.use(
  (r) => r,
  (e) => Promise.reject(e),
);
api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
