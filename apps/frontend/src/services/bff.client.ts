// Wrapper fetcher chung
import { api } from "./api";
export const get = (url: string) => api.get(url).then((r) => r.data);
