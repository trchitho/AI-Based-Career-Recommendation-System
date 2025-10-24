// NCKH/apps/frontend/src/services/api.ts
import axios from "axios";
// Enforce proxy via Next.js rewrites in dev: always use "/api" base
// next.config.js rewrites "/api/:path*" -> backend (PROXY_API_BASE or http://localhost:8000)
export const api = axios.create({ baseURL: "/api" });
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
